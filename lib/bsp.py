# bsp.py — Block · Spindle · Point (v2)
# Semantic address resolver for pscale JSON blocks.
# Not code. Coordinates.
#
# v1 (Feb 2025): three modes — block, spindle, point. 0.xxx format only.
# v2 (Feb 2025): five modes — +spread, +tree. Three spindle formats.
#                X+/X-/X~ vocabulary. Root always included.

from typing import Any, Optional, Union, List
from dataclasses import dataclass, field
import json

# --- Block loader registry ---
_block_loader = None


def bsp_register(loader):
    """Register a block loader so bsp can resolve block names."""
    global _block_loader
    _block_loader = loader


# --- Types ---

@dataclass
class SpindleNode:
    pscale: Optional[int]  # pscale level, or None if no decimal
    text: str              # content at this level (_ summary or leaf string)
    digit: Optional[str] = None  # the key at this level (None for root)


@dataclass
class SpreadChild:
    digit: str
    text: Optional[str]
    branch: bool           # True = deeper content exists


@dataclass
class BspResult:
    mode: str              # 'block' | 'spindle' | 'point' | 'spread' | 'tree' | 'error'
    tree: Optional[dict] = None
    nodes: List[SpindleNode] = field(default_factory=list)
    text: Optional[str] = None
    pscale: Optional[int] = None
    path: Optional[str] = None
    children: list = field(default_factory=list)
    error: Optional[str] = None


# --- Internal: navigate by dot-separated path ---
def _navigate(tree, path):
    if not path:
        return tree
    keys = path.split('.')
    node = tree
    for k in keys:
        if node is None or isinstance(node, str):
            return None
        if not isinstance(node, dict) or k not in node:
            return None
        node = node[k]
    return node


# --- xSpread: lateral read (X~) ---
def x_spread(block, path=None):
    """Returns a node's text + immediate children.
    Each child: { digit, text, branch } where branch=True means deeper content."""
    tree = block.get('tree', block) if isinstance(block, dict) else block
    node = _navigate(tree, path) if path else tree
    if node is None:
        return None
    if isinstance(node, str):
        return {'text': node, 'children': []}
    text = node.get('_') if isinstance(node, dict) else None
    children = []
    for k, v in node.items():
        if k == '_':
            continue
        child_text = v if isinstance(v, str) else (v.get('_') if isinstance(v, dict) else None)
        children.append(SpreadChild(digit=k, text=child_text, branch=isinstance(v, dict)))
    return {'text': text, 'children': children}


# --- resolve: recursive tree view ---
def resolve(block, max_depth=3):
    tree = block.get('tree', block) if isinstance(block, dict) else block
    def walk(node, depth, path):
        if depth > max_depth:
            return None
        if isinstance(node, str):
            return {'path': path, 'text': node}
        if not node:
            return None
        result = {'path': path, 'text': node.get('_'), 'children': []}
        for k, v in node.items():
            if k == '_':
                continue
            child_path = f"{path}.{k}" if path else k
            child = walk(v, depth + 1, child_path)
            if child:
                result['children'].append(child)
        return result
    return walk(tree, 0, '')


def bsp(
    block: Union[str, dict],
    spindle: Optional[float] = None,
    point: Optional[Union[int, str]] = None,
) -> BspResult:
    """
    bsp — Block · Spindle · Point (v2)

    Five modes:
      bsp(block)                → full block tree
      bsp(block, 0.21)          → spindle: root then walked digits [2,1]
      bsp(block, 0.21, -1)      → point: semantic at pscale -1
      bsp(block, 0.21, '~')     → spread: node text + immediate children
      bsp(block, 0.21, '*')     → tree: full recursive subtree

    Three spindle formats:
      0.234  → delineation: strip 0, walk [2,3,4], root is pscale 0
      23.45  → split: walk [2,3,4,5], root is pscale 2
      2345   → no pscale: walk [2,3,4,5], no decimal

    X vocabulary:
      X+ = bsp with higher pscale or shorter spindle
      X- = lower pscale, or '~' at endpoint to discover deeper
      X~ = '~' at parent spindle (siblings)
    """
    # Resolve block name to object
    if isinstance(block, str):
        if _block_loader is None:
            return BspResult(mode='block', tree={})
        blk = _block_loader(block)
        if blk is None:
            return BspResult(mode='block', tree={})
    else:
        blk = block

    tree = blk.get('tree', blk) if isinstance(blk, dict) else {}

    # Block mode — no spindle, return full tree (unless point is a nav mode)
    if (spindle is None) and not isinstance(point, str):
        return BspResult(mode='block', tree=tree)

    # Parse the semantic number
    if spindle is None:
        walk_digits = []
        has_pscale = True
        digits_before = 0
    else:
        s = f"{spindle:.10f}"
        parts = s.split('.')
        int_str = parts[0] or '0'
        frac_str = (parts[1] if len(parts) > 1 else '').rstrip('0')
        is_delineation = int_str == '0'
        if is_delineation:
            walk_digits = list(frac_str) if frac_str else []
        else:
            walk_digits = list(int_str + frac_str)
        has_pscale = is_delineation or len(frac_str) > 0
        digits_before = 0 if is_delineation else (len(int_str) if has_pscale else -1)

    # Build spindle — root always included
    nodes = []
    node = tree

    # Root: the block's identity (tree._)
    root_text = node.get('_') if isinstance(node, dict) else None
    if root_text is not None and isinstance(root_text, str):
        nodes.append(SpindleNode(
            pscale=digits_before if has_pscale else None,
            text=root_text
        ))

    # Walk digits through the tree
    for i, d in enumerate(walk_digits):
        if not isinstance(node, dict) or d not in node:
            break
        node = node[d]
        if isinstance(node, str):
            text = node
        elif isinstance(node, dict) and '_' in node and isinstance(node['_'], str):
            text = node['_']
        else:
            text = json.dumps(node)
        nodes.append(SpindleNode(
            pscale=(digits_before - 1) - i if has_pscale else None,
            digit=d,
            text=text
        ))

    if not nodes:
        return BspResult(mode='spindle', nodes=[])

    # Point mode — string or numeric
    if point is not None:
        if isinstance(point, str):
            end_path = '.'.join(walk_digits) if walk_digits else None
            if point == '~':
                spread = x_spread({'tree': tree}, end_path)
                if not spread:
                    return BspResult(mode='spread', path=end_path, text=None, children=[])
                return BspResult(mode='spread', path=end_path,
                                 text=spread['text'], children=spread['children'])
            if point == '*':
                end_node = _navigate(tree, end_path) if end_path else tree
                if not end_node:
                    return BspResult(mode='tree', path=end_path, text=None, children=[])
                subtree = resolve({'tree': end_node}, 9)
                return BspResult(mode='tree', path=end_path,
                                 text=subtree.get('text'), children=subtree.get('children', []))
            return BspResult(mode='error', error=f'Unknown point mode: {point}')
        # Numeric: pscale extraction
        target = next((n for n in nodes if n.pscale == point), None)
        if target:
            return BspResult(mode='point', text=target.text, pscale=target.pscale)
        last = nodes[-1]
        return BspResult(mode='point', text=last.text, pscale=last.pscale)

    # Spindle mode — return the full chain
    return BspResult(mode='spindle', nodes=nodes)
