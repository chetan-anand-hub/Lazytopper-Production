# Git hooks for LazyTopper

To enable the pre-commit lint check, run:

```
npm run hooks:enable
```

To temporarily skip the hooks (not recommended), use:

```
git commit --no-verify
```

The pre-commit hook runs `npm run lint` and blocks the commit if lint fails.
