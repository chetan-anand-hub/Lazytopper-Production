# Smoke Scripts (Dev Tooling — Tracked, Never Ships)

Purpose: Regression guards for Tutor/Mentor:
- contract validity / normalization
- routing (teach vs examples vs mindmap)
- request gating / anti-429 spam

These scripts are NOT imported by the LazyTopper runtime, so they will not ship in production builds.

Run:
  node scripts/smoke/<script>.cjs
