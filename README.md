# pscale-touchstone

The **touchstone** for pscale JSON blocks — a self-describing block that teaches any mind (human or LLM) how to read, write, navigate, and grow semantic number structures.

A touchstone is what you test things against — you rub your gold on it to see if it's real. This block is the reference surface for pscale: if a block follows the format described here, it works.

## Files

- **touchstone.json** — Operational touchstone. Lean, boot-ready (~4100 tokens). What goes in a hermitcrab shell.
- **touchstone-full.json** — Complete v4 reference including speculative structures (resonance mapping, density compression, standing wave, topological combination).
- **keystone.json** — The original v1 block (Feb 17). Historical. Shows where the format started before the keystone→touchstone rename.
- **fundamentals-typology.md** — The combinatorial variables that generate the space of possible block types.

## BSP — Block · Spindle · Point

One function. Five modes. The navigator for pscale blocks.

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

Three spindle formats: `0.234` (delineation), `23.45` (split), `2345` (bare). All reach the same tree endpoint.

Implementations:
- **lib/bsp.js** — Vanilla JavaScript. Zero dependencies. Runs in browser, Node, Deno, sandbox.
- **lib/bsp.ts** — TypeScript.
- **lib/bsp.py** — Python.

See **bsp-spec.md** for details or **bsp-spec.json** for the spec as a pscale block.

## What is a pscale block?

Nested JSON where digit keys (0-9) address meaning at different scales. Each nesting level is one pscale step. Content lives at the underscore key (`_`). The node at pscale 0 always describes what the block is and how to use it.

Read `touchstone.json` — it explains itself.

## Evolution

1. **Keystone** (Feb 17) — the original self-describing block, `decimal` field, five branches
2. **Touchstone** (Feb 19) — keystone renamed, refined, speculative structures added
3. **bsp v1** (Feb 20) — three modes (block, spindle, point), 0.xxx format only, TS + Python
4. **bsp v2** (Feb 25) — five modes, three spindle formats, X vocabulary, vanilla JS added

Git history shows the full diff at each step.

## Tuning fork

A **tuning fork** is a minimal vertical JSON defining what pscale depths mean for blocks sharing the same tuning number. The JSON field is `tuning` (terse, functional). In prose, say tuning fork — a resonance reference, not an authority.

## Part of

- [Hermitcrab](https://hermitcrab.me) — persistent LLM instances with structured knowledge
- [Xstream](https://github.com/happyseaurchin/xstream) — coordination platform for collective narrative

The pscale JSON block format is open and freely usable by anyone.
