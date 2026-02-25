// bsp.js — Block · Spindle · Point (v2)
// Semantic address resolver for pscale JSON blocks.
// Pure JavaScript. Zero dependencies. Runs anywhere.
//
// v1 (Feb 2025): three modes — block, spindle, point. 0.xxx format only.
// v2 (Feb 2025): five modes — +spread, +tree. Three spindle formats.
//                X+/X-/X~ vocabulary. Root always included.
//
// Usage:
//   <script src="bsp.js">          → window.bsp, window.xSpread
//   const { bsp } = require('./bsp') → CommonJS
//   import { bsp } from './bsp.js'   → ESM

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define(factory);
  } else {
    var exports = factory();
    root.bsp = exports.bsp;
    root.xSpread = exports.xSpread;
    root.bspRegister = exports.bspRegister;
    root.resolve = exports.resolve;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // ---- Block loader registry ----
  var _blockLoader = null;

  function bspRegister(loader) {
    _blockLoader = loader;
  }

  // ---- Internal: navigate a block tree by dot-separated path ----
  function blockNavigate(tree, path) {
    if (!path) return tree;
    var keys = path.split('.');
    var node = tree;
    for (var i = 0; i < keys.length; i++) {
      if (node === null || node === undefined) return null;
      if (typeof node === 'string') return null;
      node = node[keys[i]];
    }
    return node;
  }

  // ---- xSpread: lateral read (X~) ----
  // Returns a node's text + immediate children.
  // Each child: { digit, text, branch } where branch=true means deeper content.

  function xSpread(block, path) {
    var tree = (block && block.tree) ? block.tree : block;
    var node = path ? blockNavigate(tree, path) : tree;
    if (node === null || node === undefined) return null;
    if (typeof node === 'string') return { text: node, children: [] };
    var text = node._ || null;
    var children = [];
    var keys = Object.keys(node);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (k === '_') continue;
      var v = node[k];
      var childText = typeof v === 'string' ? v
        : (v && typeof v === 'object' && v._) ? v._ : null;
      children.push({ digit: k, text: childText, branch: typeof v === 'object' && v !== null });
    }
    return { text: text, children: children };
  }

  // ---- resolve: recursive tree view ----
  function resolve(block, maxDepth) {
    var tree = (block && block.tree) ? block.tree : block;
    maxDepth = maxDepth || 3;
    function walk(node, depth, path) {
      if (depth > maxDepth) return null;
      if (typeof node === 'string') return { path: path, text: node };
      if (!node) return null;
      var result = { path: path, text: node._ || null, children: [] };
      var keys = Object.keys(node);
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        if (k === '_') continue;
        var childPath = path ? path + '.' + k : k;
        var child = walk(node[k], depth + 1, childPath);
        if (child) result.children.push(child);
      }
      return result;
    }
    return walk(tree, 0, '');
  }

  // ---- bsp: Block · Spindle · Point ----
  //
  // bsp(block)                → full block tree
  // bsp(block, spindle)       → chain of semantics, one per digit
  // bsp(block, spindle, ps)   → single semantic at pscale level
  // bsp(block, spindle, '~')  → spread: node text + immediate children
  // bsp(block, spindle, '*')  → tree: full recursive subtree
  //
  // Spindle formats:
  //   0.234  → delineation: strip 0, walk [2,3,4], root is pscale 0
  //   23.45  → split: walk [2,3,4,5], root is pscale 2
  //   2345   → no pscale: walk [2,3,4,5], no decimal
  //
  // X vocabulary via bsp:
  //   X+ on spindle = change point to pscale+1
  //   X- on spindle = change point to pscale-1
  //   X- beyond spindle = bsp(block, spindle, '~') to discover deeper
  //   X~ (siblings) = bsp(block, parentSpindle, '~')

  function bsp(block, spindle, point) {
    // Resolve block name to object
    var blk = typeof block === 'string'
      ? (_blockLoader ? _blockLoader(block) : null)
      : block;

    if (!blk) return { mode: 'block', tree: {} };
    var tree = blk.tree || blk;

    // Block mode — no spindle, return full tree (unless point is a nav mode)
    if ((spindle === undefined || spindle === null) && typeof point !== 'string') {
      return { mode: 'block', tree: tree };
    }

    // Parse the semantic number
    var walkDigits, hasPscale, digitsBefore;
    if (spindle === undefined || spindle === null) {
      // No spindle but string point mode — operate on root
      walkDigits = [];
      hasPscale = true;
      digitsBefore = 0;
    } else {
      var str = typeof spindle === 'number' ? spindle.toFixed(10) : String(spindle);
      var parts = str.split('.');
      var intStr = parts[0] || '0';
      var fracStr = (parts[1] || '').replace(/0+$/, '');
      var isDelineation = intStr === '0';
      walkDigits = isDelineation
        ? fracStr.split('').filter(function(c) { return c.length > 0; })
        : (intStr + fracStr).split('');
      hasPscale = isDelineation || fracStr.length > 0;
      digitsBefore = isDelineation ? 0 : (hasPscale ? intStr.length : -1);
    }

    // Build spindle — root always included
    var nodes = [];
    var node = tree;

    // Root: the block's identity (tree._)
    var rootText = (typeof node === 'object' && node !== null && typeof node['_'] === 'string')
      ? node['_'] : null;
    if (rootText !== null) {
      nodes.push({ pscale: hasPscale ? digitsBefore : null, text: rootText });
    }

    // Walk digits through the tree
    for (var i = 0; i < walkDigits.length; i++) {
      var d = walkDigits[i];
      if (!node || typeof node !== 'object' || node[d] === undefined) break;
      node = node[d];
      var text = typeof node === 'string'
        ? node
        : (typeof node === 'object' && node !== null && typeof node['_'] === 'string')
          ? node['_']
          : JSON.stringify(node);
      nodes.push({
        pscale: hasPscale ? (digitsBefore - 1) - i : null,
        digit: d,
        text: text
      });
    }

    if (nodes.length === 0) return { mode: 'spindle', nodes: [] };

    // String point modes: '~' = spread (X~), '*' = tree (recursive subtree)
    if (point !== undefined && point !== null) {
      if (typeof point === 'string') {
        var endPath = walkDigits.length > 0 ? walkDigits.join('.') : null;
        if (point === '~') {
          var spread = xSpread({ tree: tree }, endPath);
          if (!spread) return { mode: 'spread', path: endPath, text: null, children: [] };
          return { mode: 'spread', path: endPath, text: spread.text, children: spread.children };
        }
        if (point === '*') {
          var endNode = endPath ? blockNavigate(tree, endPath) : tree;
          if (!endNode) return { mode: 'tree', path: endPath, text: null, children: [] };
          var subtree = resolve({ tree: endNode }, 9);
          return { mode: 'tree', path: endPath, text: subtree.text, children: subtree.children };
        }
        return { mode: 'error', error: 'Unknown point mode: ' + point };
      }
      // Numeric: pscale extraction
      var target = null;
      for (var j = 0; j < nodes.length; j++) {
        if (nodes[j].pscale === point) { target = nodes[j]; break; }
      }
      if (target) return { mode: 'point', text: target.text, pscale: target.pscale };
      var last = nodes[nodes.length - 1];
      return { mode: 'point', text: last.text, pscale: last.pscale };
    }

    // Spindle mode — return the full chain
    return { mode: 'spindle', nodes: nodes };
  }

  return {
    bsp: bsp,
    xSpread: xSpread,
    resolve: resolve,
    bspRegister: bspRegister
  };
});
