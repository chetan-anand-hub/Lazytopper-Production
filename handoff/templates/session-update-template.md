# Session Update Template

Copy this block into `handoff/SESSION_LOG.md` at the end of every GPT session.

---

## YYYY-MM-DDTHH:MM:SSZ — <short session title>

Timestamp:
- UTC:
- Local/user time if known:

### Starting state

- Base branch:
- Base SHA:
- Active PRs:
- Current task/stage:

### Work completed

-

### GitHub evidence

- PR:
- State:
- Head SHA:
- Base SHA:
- Changed files:
- Merge commit SHA if merged:

### Validation evidence

- TypeScript:
- Production build:
- Build verifier:
- Changed-file scope:

### QA evidence

- Browser Agent:
- Manual QA:
- Preview URL:
- Verdict:
- Follow-ups:

### Data-honesty audit

- Fake mastery:
- Fake score:
- Fake progress:
- Fake Mistake Intelligence:
- Fake saved history:
- Hidden persistence:

### Decisions made

-

### Session learnings

-

### Roadmap impact

- Does this session change `NEXT_ACTION.md`?
- Does this session change `IMPLEMENTATION_ROADMAP.md`?
- Does this session add a permanent decision to `DECISION_LOG.md`?
- Does this session add or close an item in `OPEN_QUESTIONS_AND_FOLLOWUPS.md`?
- [ ] Update `SURFACE_TRACKER.md`: flip cells for any surface this PR moved; if scope was discovered, log it in `DECISION_LOG` + the tracker's §2a and set that surface's Scope to Settling; if none moved, state so.
- [ ] Update `LAUNCH_REMAINING.md`: advance any critical-path item or gate this PR moved; if none, state "LAUNCH_REMAINING: no change." Append a dated line to its change log.

### Known issues / follow-ups

-

### Next safe action

-

### What the next GPT session must verify first

-
