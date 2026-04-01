# Git hooks for LazyTopper memory blackbox

To enable the checks, run:

```
npm run hooks:enable
```

To temporarily skip the hooks (not recommended), use:

```
git commit --no-verify
```

Each run produces:

```
.project_memory/blackbox/latest.json
.project_memory/blackbox/contextpack.md
.project_memory/blackbox/contextpack.json
```

## Daily flow
- Before closing a ChatGPT session: run `npm run blackbox:full` and upload `contextpack.md` + `latest.json`.
- When starting a new session: attach those two files first, then proceed with the guided workflow.
