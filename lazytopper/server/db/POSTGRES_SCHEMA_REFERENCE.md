<!--
PROVENANCE - read this before treating any line of DDL in this file as authoritative.

WHAT THIS FILE IS. A transcription of the ONLY definition this repository has ever
held for two Postgres tables the live gateway reads and writes: `step_solutions` and
`tutor_cache`.

WHERE IT CAME FROM. Both definitions were TypeScript, not SQL:

  lib/db/src/schema/stepSolutions.ts   at a09653676a299bd2e0ccd2d7fd7672d9138d1d0f
  lib/db/src/schema/tutorCache.ts      at a09653676a299bd2e0ccd2d7fd7672d9138d1d0f

THAT PATH NO LONGER EXISTS. PR #669 deletes `lib/db/` in its entirety. After that
merge the declarations above are recoverable only by someone who already knows to
look at a deleted directory at a specific SHA. This file is what survives, and it
was written before that deletion landed, from the live bytes, not from memory.

WHY THE DELETION IS STILL CORRECT. `lib/db/` was a Drizzle ORM package that nothing
in the running product imports. Every live caller uses raw `pg` queries. The package
was a schema declaration with no consumer - which is exactly why the schema it held
was invisible, and exactly why it had to be copied out before it went.

WHAT IS MECHANICAL (a direct, one-to-one mapping - certain):
  drizzle-orm/pg-core   ->  SQL
  text("x")             ->  x TEXT
  jsonb("x")            ->  x JSONB
  integer("x")          ->  x INTEGER
  serial("x")           ->  x SERIAL
  .notNull()            ->  NOT NULL
  .default("")          ->  DEFAULT ''
  .default(0)           ->  DEFAULT 0
  .defaultNow()         ->  DEFAULT NOW()
  .primaryKey()         ->  PRIMARY KEY

WHAT IS INFERRED (a judgement call - a reviewer should check these three):

  1. `timestamp("created_at")` is rendered `TIMESTAMP`, i.e. WITHOUT time zone.
     The declarations pass no `{ withTimezone: true }`, and that is drizzle-orm's
     documented default. It also matches this repo's own hand-written DDL next
     door - `created_at TIMESTAMP NOT NULL DEFAULT NOW()` in
     `ensureGeneratedQuestionsTable.cjs`. Both live writers set this column with
     SQL `NOW()`, which returns `timestamptz` and is implicitly cast on the way in.

  2. `IF NOT EXISTS` and the column alignment are THIS FILE'S convention, added to
     match `ensureGeneratedQuestionsTable.cjs`. Neither appears in, nor can be
     derived from, a Drizzle `pgTable`.

  3. Column ORDER is the declaration order in the TypeScript source. Drizzle does
     not guarantee it corresponds to the physical order of an already-migrated
     table, and no live query depends on ordinal position (every statement names
     its columns).

WHAT THIS FILE IS NOT. It is NOT an executable migration. Nothing reads it, nothing
runs it, and no boot path consults it. Creating either table remains a deliberate
human act. This is deliberate: `generated_questions` is created at boot by
`ensureGeneratedQuestionsTable.cjs`; these two tables are not, and this file does
not change that.

Written 2026-08-13 by lane OPS-H of Wave OPS-1, from base SHA
a09653676a299bd2e0ccd2d7fd7672d9138d1d0f.
-->

# Postgres schema reference - `step_solutions` and `tutor_cache`

> **Reference only. Not a migration.** Nothing in this repository executes the SQL
> below. It exists so that the schema of two tables the gateway depends on is
> readable without fetching a deleted path at a historic SHA.

Postgres is optional in this product. Both caches are gated on `DATABASE_URL`; with
it unset, every function below returns early and the product runs unchanged. See
"Behaviour when the table is absent" at the end.

---

## 1. `step_solutions`

Shared cache of AI-generated CBSE marking-scheme step solutions, keyed by a hash of
the question text and its mark value. Student-agnostic by construction - no student
answer, image or PII ever enters the cached artefact.

### 1a. Source (verbatim) - `lib/db/src/schema/stepSolutions.ts`

```ts
import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const stepSolutionsTable = pgTable("step_solutions", {
  questionHash: text("question_hash").primaryKey(),
  solutionJson: jsonb("solution_json").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type StepSolution = typeof stepSolutionsTable.$inferSelect;
export type NewStepSolution = typeof stepSolutionsTable.$inferInsert;
```

### 1b. Derived DDL

```sql
CREATE TABLE IF NOT EXISTS step_solutions (
    question_hash  TEXT PRIMARY KEY,
    solution_json  JSONB NOT NULL,
    created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);
```

No secondary index is declared in the source, so none is stated here. The primary
key is the only index this table has ever been specified to carry.

### 1c. Column notes

| Column | Type | Populated by | Notes |
|---|---|---|---|
| `question_hash` | `TEXT PRIMARY KEY` | caller | SHA-256 hex of `CACHE_VERSION + "\|" + question + "\|" + marks`. Bumping `CACHE_VERSION` (`'v2'` at this SHA) busts every entry by changing the key, not by deleting rows. |
| `solution_json` | `JSONB NOT NULL` | caller | The whole solution object: `totalMarks`, `steps[]`, `commonMistakes[]`, `examTip`, `provider`, `model`. Written as a JSON string and cast to `jsonb` by the driver; read back already parsed. |
| `created_at` | `TIMESTAMP NOT NULL DEFAULT NOW()` | column default | Never named in any live statement. It exists only if the default supplies it - which it does. |

---

## 2. `tutor_cache`

Semantic cache of tutor Q&A responses. A cache lookup is a keyword-fingerprint
Jaccard comparison performed in JavaScript against up to 500 rows fetched for the
same `mode` + `subject`; Postgres does no similarity work.

### 2a. Source (verbatim) - `lib/db/src/schema/tutorCache.ts`

```ts
import { pgTable, serial, text, jsonb, integer, timestamp } from "drizzle-orm/pg-core";

export const tutorCacheTable = pgTable("tutor_cache", {
  id: serial("id").primaryKey(),
  mode: text("mode").notNull(),
  subject: text("subject").notNull().default(""),
  topicKey: text("topic_key").notNull().default(""),
  questionNormalized: text("question_normalized").notNull(),
  embedding: jsonb("embedding").notNull(),
  responseJson: jsonb("response_json").notNull(),
  hitCount: integer("hit_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type TutorCache = typeof tutorCacheTable.$inferSelect;
export type NewTutorCache = typeof tutorCacheTable.$inferInsert;
```

### 2b. Derived DDL

```sql
CREATE TABLE IF NOT EXISTS tutor_cache (
    id                   SERIAL PRIMARY KEY,
    mode                 TEXT NOT NULL,
    subject              TEXT NOT NULL DEFAULT '',
    topic_key            TEXT NOT NULL DEFAULT '',
    question_normalized  TEXT NOT NULL,
    embedding            JSONB NOT NULL,
    response_json        JSONB NOT NULL,
    hit_count            INTEGER NOT NULL DEFAULT 0,
    created_at           TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMP NOT NULL DEFAULT NOW()
);
```

No index on `(mode, subject)` and none on `created_at` appears in the source, so
none is stated here. The hot read filters on `mode` and `subject` and orders by
`created_at DESC`; whether that warrants an index is a live-operations judgement,
not a fact recoverable from the declaration, and inventing one here would make this
file a design document instead of a record.

### 2c. Column notes

| Column | Type | Notes |
|---|---|---|
| `id` | `SERIAL PRIMARY KEY` | The row identity used by the hit-count update. |
| `mode` | `TEXT NOT NULL` | One of the cacheable tutor modes: `explain`, `board_steps_ms`, `solve`. Not constrained in the database. |
| `subject` | `TEXT NOT NULL DEFAULT ''` | Part of the read filter. |
| `topic_key` | `TEXT NOT NULL DEFAULT ''` | Written on insert; surfaced in the admin stats view only. |
| `question_normalized` | `TEXT NOT NULL` | Lower-cased, whitespace-collapsed question text. Stored for human inspection - it is never matched against. |
| `embedding` | `JSONB NOT NULL` | **The name is misleading and the name is what shipped.** This column holds no vector. It holds a JSON array of stemmed keyword tokens, and the read statement aliases it back as `fingerprint`. Do not size, index or migrate this column as if it were an embedding. |
| `response_json` | `JSONB NOT NULL` | The cached tutor response returned verbatim on a hit. |
| `hit_count` | `INTEGER NOT NULL DEFAULT 0` | Incremented on every cache hit. |
| `created_at` | `TIMESTAMP NOT NULL DEFAULT NOW()` | Set explicitly to `NOW()` by the insert AND carrying a default. Ordering key for the 500-row read window. |
| `updated_at` | `TIMESTAMP NOT NULL DEFAULT NOW()` | Set explicitly to `NOW()` by the insert and by the hit-count update. |

---

## 3. Cross-check: the declaration against the SQL the server actually issues

Two independent sources agree only if checked. Below is every live statement against
these two tables at the base SHA, and the column set each one requires.

### 3a. `step_solutions` - call sites

| Statement | Columns used | File |
|---|---|---|
| `SELECT solution_json FROM step_solutions WHERE question_hash = $1 LIMIT 1` | `solution_json`, `question_hash` | `lazytopper/server/routes/stepSolution.cjs` (`getCachedSolution`) |
| `INSERT INTO step_solutions (question_hash, solution_json) VALUES ($1, $2) ON CONFLICT (question_hash) DO NOTHING` | `question_hash`, `solution_json` | same file (`saveSolution`) |
| `INSERT ... ON CONFLICT (question_hash) DO UPDATE SET solution_json = EXCLUDED.solution_json` | `question_hash`, `solution_json` | same file (`saveSolutionForce`) |
| `DELETE FROM step_solutions WHERE question_hash = $1` | `question_hash` | same file (`deleteSolution`), reached only through the admin-gated route |
| `SELECT question_hash FROM step_solutions` | `question_hash` | `lazytopper/scripts/pregen-step-solutions.mjs`, `lazytopper/scripts/warmup-solution-cache.mjs` |
| `INSERT ... ON CONFLICT (question_hash) DO NOTHING` / `DO UPDATE` | `question_hash`, `solution_json` | the same two scripts |

**Columns the queries use that the schema lacks: NONE.**
**Columns the schema declares that no query names: `created_at`** - supplied by its
own default, so its absence from every statement is correct, not a defect.

**`ON CONFLICT (question_hash)` requires a unique constraint on that column.
The declaration carries it: `text("question_hash").primaryKey()`.** A PRIMARY KEY
creates the unique index the conflict target needs, so all three upsert statements
are valid against this schema. This was worth confirming rather than assuming - an
`ON CONFLICT` aimed at a non-unique column is a runtime error on the write path, and
that exact defect class is what the wider cleanup is guarding against. It is not
present here.

Note for anyone hand-creating this table: `question_hash TEXT PRIMARY KEY` is
load-bearing, not decorative. A table created without the primary key would satisfy
every `SELECT` and fail every `INSERT`.

### 3b. `tutor_cache` - call sites

All in `lazytopper/server/services/tutorCache.cjs`.

| Statement | Columns used |
|---|---|
| `SELECT id, embedding AS fingerprint, response_json FROM tutor_cache WHERE mode = $1 AND subject = $2 ORDER BY created_at DESC LIMIT 500` | `id`, `embedding`, `response_json`, `mode`, `subject`, `created_at` |
| `UPDATE tutor_cache SET hit_count = hit_count + 1, updated_at = NOW() WHERE id = $1` | `hit_count`, `updated_at`, `id` |
| `INSERT INTO tutor_cache (mode, subject, topic_key, question_normalized, embedding, response_json, hit_count, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, 0, NOW(), NOW())` | all ten except `id` |
| `SELECT COUNT(*) AS total, COALESCE(SUM(hit_count), 0) AS db_hits FROM tutor_cache` | `hit_count` |
| `SELECT id, mode, subject, topic_key, question_normalized, hit_count, updated_at FROM tutor_cache ORDER BY hit_count DESC LIMIT 10` | `id`, `mode`, `subject`, `topic_key`, `question_normalized`, `hit_count`, `updated_at` |

**Columns the queries use that the schema lacks: NONE.**
**Columns the schema declares that no query names: NONE.** All ten declared columns
are exercised by live SQL. The declaration and the query surface agree exactly.

The insert supplies `hit_count`, `created_at` and `updated_at` explicitly even though
all three have defaults. Harmless, and worth noting only so nobody removes the
defaults on the grounds that the writer always sets them - the defaults are what make
a hand-written `INSERT` safe.

---

## 4. Behaviour when a table is absent

Both caches are written to fail soft, and both do - but for different reasons in
different places, so this is stated per file rather than assumed symmetric.

**`DATABASE_URL` unset.** Neither module builds a pool (`getPool()` returns `null` in
both), and every entry point returns early. No SQL is issued. This is the normal
state of a deployment with no Postgres.

**`DATABASE_URL` set, table missing.** Postgres raises `42P01 undefined_table`.

- `step_solutions`: every statement sits inside a `try/catch` that logs
  `console.warn` and returns the miss value (`null`, `undefined`, or `false` for the
  delete). A missing table degrades to a permanent cache miss. Solutions are
  regenerated per request - a cost problem, never a correctness or availability one.
- `tutor_cache`: identically guarded. `findSimilarResponse` catches and returns
  `null` (a miss), `saveResponse` catches and returns, `fetchCacheStats` catches and
  returns its zeroed baseline. The two public entry points, `lookup` and `save`, add
  a second `try/catch` on top. No 42P01 reaches a user-facing route.

Neither table is created anywhere. There is no migration directory, no `.sql` file
and no boot-time `CREATE TABLE` for either one, anywhere in this repository. If you
want either cache to actually cache, run the DDL above by hand against the target
database, once.
