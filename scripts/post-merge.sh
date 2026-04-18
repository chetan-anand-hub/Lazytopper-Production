#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm --filter db push
NODE_ENV=production pnpm --filter lazytopper run build
