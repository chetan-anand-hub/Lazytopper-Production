# src/data/_finalGenerated (Generated Runtime Modules)

This folder contains **generated TypeScript modules** used by the running app.

## Rules
- ✅ Runtime code should import these modules **only via** `src/data/final/index.ts`
  (the registry). Avoid deep imports like `../data/_finalGenerated/...`.
- ❌ Do NOT hand-edit generated modules. Make changes in `_final` (canonical) and regenerate.

## Why a registry?
A single registry prevents import sprawl and makes it easy to swap/upgrade generation
pipelines without touching pages/components.
