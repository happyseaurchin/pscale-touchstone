# BSP — Block · Spindle · Point (v2)

One function. Five modes. Semantic address resolution for pscale JSON blocks.

## The function

```
bsp(block, spindle?, point?)
```

Three arguments. Two optional. The name tells you what they are.

- **block** — which block. A name like `"wake"` or a block object `{ tree: {...} }`.
- **spindle** — a semantic number. Digits walk the tree. The decimal marks pscale 0.
- **point** — a pscale level (number), or a mode: `'~'` for spread, `'*'` for tree.

## Five modes

```
bsp("wake")              → block:   the full tree (navigate freely)
bsp("wake", 0.842)       → spindle: root + chain 8→4→2 (semantics at each level)
bsp("wake", 0.842, -2)   → point:   just the semantic at pscale -2
bsp("wake", 0.842, '~')  → spread:  node text + immediate children at 0.842
bsp("wake", 0.842, '*')  → tree:    full recursive subtree from 0.842
```

Omit arguments right to left. Block only = full access. Add spindle = follow the path. Add point = focus.

## Three spindle formats

| Format | Example | Walk digits | Root pscale | Use case |
|--------|---------|-------------|-------------|----------|
| Delineation | `0.234` | [2,3,4] | 0 | Standard — leading 0 stripped |
| Split | `23.45` | [2,3,4,5] | 2 | When root pscale > 0 |
| Bare | `2345` | [2,3,4,5] | none | No pscale labeling |

All three reach the same tree endpoint. They differ in pscale labeling.

Root (`tree._`) is always included as the first spindle node.

## X vocabulary

The touchstone defines three navigation operations. bsp implements all three:

- **X+** (shallower) = `bsp(block, spindle, pscale+1)` — move up one level in the spindle
- **X-** (deeper) = `bsp(block, spindle, pscale-1)` — move down, or `'~'` to discover what's beyond
- **X~** (siblings) = `bsp(block, parentSpindle, '~')` — spread at the parent to see all siblings

X operates in two contexts:
- **On the spindle** (already-pulled chain): X+/X- = index arithmetic on the nodes array
- **On the JSON** (beyond the spindle): spread `'~'` and tree `'*'` navigate the raw block

## Spread mode

`bsp(block, spindle, '~')` returns:

```json
{
  "mode": "spread",
  "path": "8.4.2",
  "text": "Your job is to be a good node.",
  "children": [
    { "digit": "1", "text": "SAND is to bot coordination...", "branch": true },
    { "digit": "2", "text": "Any bot can adopt SAND...", "branch": true }
  ]
}
```

Each child reports `branch: true` if deeper content exists. This is X~ — lateral scan.

## Tree mode

`bsp(block, spindle, '*')` returns the full recursive subtree. Like `resolve()` scoped to the spindle endpoint. For reading entire sub-blocks without walking manually.

## Where it lives

```
pscale-touchstone/
  touchstone.json       ← the format (teaches how to read blocks)
  lib/
    bsp.js              ← the navigator (vanilla JavaScript, zero dependencies)
    bsp.ts              ← the navigator (TypeScript)
    bsp.py              ← the navigator (Python)
  bsp-spec.md           ← this document
  bsp-spec.json         ← the spec as a pscale block
  keystone.json         ← the original v1 block (historical)
```

The touchstone teaches the format. bsp navigates it. Two faces of one thing.

## What it enables

- **Aperture** = `bsp(block)` at pscale 0 across all blocks. One call per dimension.
- **Focus** = `bsp(block, spindle)` on the blocks that matter. Adjustable depth.
- **Lateral scan** = `bsp(block, spindle, '~')` to discover siblings and children.
- **Subtree read** = `bsp(block, spindle, '*')` to pull an entire branch.
- **Boot** = `bsp("wake", 0.61)` — "First boot. Read everything. Orient."
- **Grain probe** = a list of bsp addresses.
- **Context specification** = choosing which bsp calls compose the system prompt.
- **Self-modification** = the LLM rewriting its own bsp instruction lists.

## Implementations

Vanilla JavaScript (~170 lines), TypeScript (~170 lines), Python (~180 lines). All implement:

1. Register a block loader at init so bsp can resolve names
2. Parse the semantic number — three formats, same tree endpoint
3. Include root (`tree._`) as first spindle node
4. Walk remaining digits as keys, collecting `_` summaries
5. Return based on mode: tree (block), node array (spindle), string (point), spread, or recursive tree

```javascript
bspRegister(blockLoad)          // JavaScript/TypeScript
bsp_register(block_load)          // Python
```

Or pass block objects directly — no loader needed:

```javascript
const result = bsp({ tree: myData }, 0.234, '~')
```

The function is pure. Zero dependencies. Runs in browser, Node, Deno, sandbox, code_execution.

## Evolution

- **Keystone** (v1, Feb 17): the original self-describing block with `decimal` field
- **Touchstone** (v4, Feb 19): keystone renamed, refined, speculative structures added
- **bsp v1** (Feb 20): three modes (block, spindle, point), 0.xxx format only
- **bsp v2** (Feb 25): five modes, three formats, X vocabulary, extracted from hermitcrab G1 kernel
