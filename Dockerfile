# LazyTopper backend (api-server + self-spawned AI gateway) — Railway deploy image.
# INFRA-4 / PR1. See diff/report-api-gateway-railway-2026-06-10.md for the full rationale.
#
# WHY A DOCKERFILE (not Nixpacks): this server is "runtime-source-compiled" — the AI
# gateway (lazytopper/server/index.cjs) transpiles lazytopper/src/**/*.ts ON DEMAND at
# runtime via require.extensions['.ts'] and resolves files relative to the process cwd.
# It therefore needs the WHOLE workspace present at runtime AND the `typescript` package
# kept in node_modules (it is a devDependency that is REQUIRED at runtime here). A
# Dockerfile gives deterministic control over all three: full-workspace copy, frozen
# install WITHOUT a prod-prune, and an explicit cwd. A "build then ship dist only"
# pipeline would break the gateway on the first /api/* call.

FROM node:24-slim

# Pin pnpm to 10.32.1 via corepack. The repo ROOT package.json has no `packageManager`
# field (tracked follow-up D42); without this pin corepack defaults to pnpm 9.15.9, which
# FAILS the frozen install. Do not bump without re-locking.
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

WORKDIR /app

# Copy the ENTIRE workspace. Do NOT selectively exclude "dead-looking" files (e.g. the
# §7 sever residue): the gateway compiles from source at runtime and surgical exclusion
# is exactly what breaks it. node_modules / .git are excluded via .dockerignore only
# because they are rebuilt / not needed at runtime — no application source is excluded.
COPY . .

# Frozen install. This installs devDependencies too (typescript, esbuild, tsx if/when
# added) — REQUIRED at runtime for the gateway's on-the-fly .ts transpile. We deliberately
# do NOT run `--prod` / prune: pruning typescript here would break the gateway.
RUN pnpm install --frozen-lockfile

# Build ONLY what this image runs (RAILWAY-SLIM-1, owner-approved 2026-10-22): the root
# `build:backend` script = root typecheck (libs, api-server, scripts) -> syllabusGuard ->
# validateQuestionBanks -> the api-server esbuild bundle (artifacts/api-server/dist/index.mjs).
# The deploy-blocking guards stay IN the image build, unchanged.
#
# NOT built here any more: the lazytopper WEBSITE (`tsc -b && vite build && writeStaticHeads &&
# applyPrerendered && writeVersion && perf3_entry_chunk_acceptance`). Its outputs land in
# artifacts/lazytopper-app/dist/public/ (~70 MB) and nothing in this image reads them (no
# runtime code under artifacts/api-server/src or lazytopper/server references that path, a
# dist/ dir or version.json; the old image already wrote no version.json here,
# [FU-SEARCHPING-DOCKER-NO-MARKER], which this change makes moot). The gateway transpiles
# lazytopper/src/**/*.ts from SOURCE at runtime, reads visuals from lazytopper/public/visuals
# (source), and lazytopper's `tsc -b` is noEmit. Vercel builds the website on its own, and CI
# still builds it on every PR (quality-gate.yml build-ops: `pnpm --filter lazytopper run build`).
# quality-gate.yml railway-build runs this SAME command, and ci_speed_acceptance.mjs pins the two
# together - change one and you must change the other.
RUN pnpm run build:backend

ENV NODE_ENV=production
# PORT default; the Railway dashboard also sets PORT=8080 explicitly (the api-server THROWS
# if PORT is unset — artifacts/api-server/src/index.ts). Railway routes external 443 → this port.
ENV PORT=8080
EXPOSE 8080

# cwd = /app (repo root) so the gateway resolves lazytopper/server/index.cjs and the
# warmup/visuals paths relative to cwd. --enable-source-maps matches the artifact spec.
CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
