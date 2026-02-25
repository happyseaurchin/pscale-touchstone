// bsp.ts — Block · Spindle · Point (v2)
// Semantic address resolver for pscale JSON blocks.
// Not code. Coordinates.
//
// v1 (Feb 2025): three modes — block, spindle, point. 0.xxx format only.
// v2 (Feb 2025): five modes — +spread, +tree. Three spindle formats.
//                X+/X-/X~ vocabulary. Root always included.

export interface PscaleBlock {
  tree: Record<string, any>
}

export interface SpindleNode {
  pscale: number | null  // pscale level, or null if no decimal in spindle
  digit?: string         // the key at this level (absent for root)
  text: string           // content at this level (_ summary or leaf string)
}

export interface SpreadChild {
  digit: string
  text: string | null
  branch: boolean        // true = deeper content exists
}

export type BspResult =
  | { mode: 'block'; tree: Record<string, any> }
  | { mode: 'spindle'; nodes: SpindleNode[] }
  | { mode: 'point'; text: string; pscale: number | null }
  | { mode: 'spread'; path: string | null; text: string | null; children: SpreadChild[] }
  | { mode: 'tree'; path: string | null; text: string | null; children: any[] }
  | { mode: 'error'; error: string }

// ---- Block loader registry ----
let _blockLoader: ((name: string) => PscaleBlock | undefined) | null = null

export function bspRegister(loader: (name: string) => PscaleBlock | undefined) {
  _blockLoader = loader
}

// ---- Internal: navigate by dot-separated path ----
function blockNavigate(tree: any, path: string): any {
  if (!path) return tree
  const keys = path.split('.')
  let node = tree
  for (const k of keys) {
    if (node === null || node === undefined || typeof node === 'string') return null
    node = node[k]
  }
  return node
}

// ---- xSpread: lateral read (X~) ----
export function xSpread(block: PscaleBlock | Record<string, any>, path?: string | null): {
  text: string | null; children: SpreadChild[]
} | null {
  const tree = (block as any).tree || block
  const node = path ? blockNavigate(tree, path) : tree
  if (node === null || node === undefined) return null
  if (typeof node === 'string') return { text: node, children: [] }
  const text = node._ || null
  const children: SpreadChild[] = []
  for (const [k, v] of Object.entries(node)) {
    if (k === '_') continue
    const childText = typeof v === 'string' ? v
      : (v && typeof v === 'object' && (v as any)._) ? (v as any)._ : null
    children.push({ digit: k, text: childText, branch: typeof v === 'object' && v !== null })
  }
  return { text, children }
}

// ---- resolve: recursive tree view ----
export function resolve(block: PscaleBlock | Record<string, any>, maxDepth?: number): any {
  const tree = (block as any).tree || block
  const depth = maxDepth || 3
  function walk(node: any, d: number, path: string): any {
    if (d > depth) return null
    if (typeof node === 'string') return { path, text: node }
    if (!node) return null
    const result: any = { path, text: node._ || null, children: [] }
    for (const [k, v] of Object.entries(node)) {
      if (k === '_') continue
      const childPath = path ? `${path}.${k}` : k
      const child = walk(v, d + 1, childPath)
      if (child) result.children.push(child)
    }
    return result
  }
  return walk(tree, 0, '')
}

/**
 * bsp — Block · Spindle · Point
 *
 * Five modes:
 *   bsp(block)                → full block tree
 *   bsp(block, 0.21)          → spindle: root then walked digits [2,1]
 *   bsp(block, 0.21, -1)      → point: semantic at pscale -1
 *   bsp(block, 0.21, '~')     → spread: node text + immediate children
 *   bsp(block, 0.21, '*')     → tree: full recursive subtree
 *
 * Three spindle formats:
 *   0.234  → delineation: strip 0, walk [2,3,4], root is pscale 0
 *   23.45  → split: walk [2,3,4,5], root is pscale 2
 *   2345   → no pscale: walk [2,3,4,5], no decimal
 *
 * X vocabulary:
 *   X+ = bsp with higher pscale or shorter spindle
 *   X- = lower pscale, or '~' at endpoint to discover deeper
 *   X~ = '~' at parent spindle (siblings)
 */
export function bsp(
  block: string | PscaleBlock,
  spindle?: number | null,
  point?: number | string | null
): BspResult {
  const blk = typeof block === 'string'
    ? (_blockLoader ? _blockLoader(block) : undefined)
    : block

  if (!blk || !(blk as any).tree) {
    return { mode: 'block', tree: {} }
  }
  const tree = (blk as any).tree

  // Block mode — no spindle, return full tree (unless point is a nav mode)
  if ((spindle === undefined || spindle === null) && typeof point !== 'string') {
    return { mode: 'block', tree }
  }

  // Parse the semantic number
  let walkDigits: string[]
  let hasPscale: boolean
  let digitsBefore: number

  if (spindle === undefined || spindle === null) {
    walkDigits = []
    hasPscale = true
    digitsBefore = 0
  } else {
    const str = typeof spindle === 'number' ? spindle.toFixed(10) : String(spindle)
    const parts = str.split('.')
    const intStr = parts[0] || '0'
    const fracStr = (parts[1] || '').replace(/0+$/, '')
    const isDelineation = intStr === '0'
    walkDigits = isDelineation
      ? fracStr.split('').filter(c => c.length > 0)
      : (intStr + fracStr).split('')
    hasPscale = isDelineation || fracStr.length > 0
    digitsBefore = isDelineation ? 0 : (hasPscale ? intStr.length : -1)
  }

  // Build spindle — root always included
  const nodes: SpindleNode[] = []
  let node: any = tree

  const rootText = (typeof node === 'object' && node !== null && typeof node['_'] === 'string')
    ? node['_'] : null
  if (rootText !== null) {
    nodes.push({ pscale: hasPscale ? digitsBefore : null, text: rootText })
  }

  for (let i = 0; i < walkDigits.length; i++) {
    const d = walkDigits[i]
    if (!node || typeof node !== 'object' || node[d] === undefined) break
    node = node[d]
    const text = typeof node === 'string'
      ? node
      : (typeof node === 'object' && node !== null && typeof node['_'] === 'string')
        ? node['_']
        : JSON.stringify(node)
    nodes.push({
      pscale: hasPscale ? (digitsBefore - 1) - i : null,
      digit: d,
      text
    })
  }

  if (nodes.length === 0) return { mode: 'spindle', nodes: [] }

  // Point mode — string or numeric
  if (point !== undefined && point !== null) {
    if (typeof point === 'string') {
      const endPath = walkDigits.length > 0 ? walkDigits.join('.') : null
      if (point === '~') {
        const spread = xSpread({ tree }, endPath)
        if (!spread) return { mode: 'spread', path: endPath, text: null, children: [] }
        return { mode: 'spread', path: endPath, text: spread.text, children: spread.children }
      }
      if (point === '*') {
        const endNode = endPath ? blockNavigate(tree, endPath) : tree
        if (!endNode) return { mode: 'tree', path: endPath, text: null, children: [] }
        const subtree = resolve({ tree: endNode }, 9)
        return { mode: 'tree', path: endPath, text: subtree.text, children: subtree.children }
      }
      return { mode: 'error', error: `Unknown point mode: ${point}` }
    }
    const target = nodes.find(n => n.pscale === point)
    if (target) return { mode: 'point', text: target.text, pscale: target.pscale }
    const last = nodes[nodes.length - 1]
    return { mode: 'point', text: last.text, pscale: last.pscale }
  }

  return { mode: 'spindle', nodes }
}
