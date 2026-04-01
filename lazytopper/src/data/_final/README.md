# src/data/_final (Canonical Inputs)

This folder contains **human-authored canonical content** (often JSON or source templates).
It is the **single source-of-truth** for chapter payloads that are later compiled into
TypeScript modules in `_finalGenerated`.

## Rules
- ✅ Edit this folder when updating content.
- ❌ Do NOT import from this folder directly in runtime pages/components.
- Generation outputs should live in `_finalGenerated`.

## Why it exists
We keep canonical content separate from generated code to prevent accidental drift
and to make audits/reviews easier.
