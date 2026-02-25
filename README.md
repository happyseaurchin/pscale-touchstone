# pscale-semantic-number

**Semantic numbers** — a coordinate system for meaning. Numbers that address nested structure, not quantity. Each digit selects a branch. The decimal point marks pscale 0. Any mind (human, LLM, or code) can read, write, navigate, and grow these structures.

This repo contains the reference specification and navigator implementations.

## What is a semantic number?

A number like `0.842` is not eight hundred and forty-two thousandths. It is an address: start at the root, enter branch 8, then 4, then 2. The decimal point marks pscale 0 — the human-scale summary. Above pscale 0 is composition. Below is decomposition.

The data structure is nested JSON where digit keys (0-9) address meaning at different scales. Content lives at the underscore key (`_`). The node at pscale 0 always describes what the block is and how to use it.

Read `touchstone.json` — it explains itself.

## Files

### Specification
- **touchstone.json** — The operational touchstone. Lean, boot-ready (~4100 tokens). Teaches the format by being the format. What goes in a hermitcrab shell.
- **touchstone-full.json** — Complete v4 reference including speculative structures (resonance mapping, density compression, standing wave, topological combination).
- **keystone.json** — The original v1 block (Feb 17). Historical. Shows where the format started.
- **fundamentals-typology.md** — The combinatorial variables that generate the space of possible block types.

### Navigator — BSP (Block · Spindle · Point)
- **lib/bsp.js** — Vanilla JavaScript. Zero dependencies. Runs in browser, Node, Deno, sandbox, code_execution.
- **lib/bsp.ts** — TypeScript.
- **lib/bsp.py** — Python.
- **bsp-spec.md** — Developer documentation for bsp.
- **bsp-spec.json** — The bsp spec as a pscale block (self-demonstrating).

## BSP — one function, five modes

```
bsp(block, spindle?, point?)
```

| Mode | Call | Returns |
|------|------|---------|
| Block | `bsp("wake")` | Full tree |
| Spindle | `bsp("wake", 0.842)` | Root + chain 8→4→2 |
| Point | `bsp("wake", 0.842, -2)` | Single semantic at pscale -2 |
| Spread | `bsp("wake", 0.842, '~')` | Node + immediate children (X~) |
| Tree | `bsp("wake", 0.842, '*')` | Full recursive subtree |

Three spindle formats: `0.234` (delineation), `23.45` (split), `2345` (bare). All reach the same tree endpoint. Root (`tree._`) always included.

### X vocabulary

The touchstone defines three navigation operations. bsp implements all three:

- **X+** (shallower) — move toward the root
- **X-** (deeper) — move into children, or `'~'` to discover what's below
- **X~** (siblings) — spread at parent to see all branches at the same level

### Usage

```javascript
// Register a loader (optional — or pass objects directly)
bspRegister(myBlockLoader);

// Five modes
bsp("wake");                  // full block
bsp("wake", 0.842);          // spindle chain
bsp("wake", 0.842, -2);      // point at pscale -2
bsp("wake", 0.842, '~');     // spread: children of node 0.842
bsp("wake", 0.842, '*');     // recursive subtree from 0.842

// Or pass block objects directly — no loader needed
bsp({ tree: myData }, 0.234, '~');
```

The function is pure. Zero dependencies. ~170 lines per implementation.

## Evolution

1. **Keystone** (Feb 17) — the original self-describing block. `decimal` field, five branches: structure, navigation, growth, connection, evolution.
2. **Touchstone** (Feb 19) — keystone renamed, refined. Speculative structures added.
3. **bsp v1** (Feb 20) — three modes (block, spindle, point). 0.xxx format only. TypeScript + Python.
4. **bsp v2** (Feb 25) — five modes (+spread, +tree). Three spindle formats. X+/X-/X~ vocabulary. Vanilla JS added. Extracted from hermitcrab G1 kernel.

Git history shows the full diff at each step.

## Tuning fork

A **tuning fork** is a minimal vertical JSON defining what pscale depths mean for blocks sharing the same tuning number. Like musicians using the same reference tone — a resonance reference, not an authority.

## Part of

- [Hermitcrab](https://hermitcrab.me) — persistent LLM instances with structured knowledge
- [Xstream](https://github.com/happyseaurchin/xstream) — coordination platform for collective narrative

The pscale semantic number format is open and freely usable by anyone.
