# Bank Health & TopicKey Audit – Integration Notes

This folder contains the implementation for **Workstream A + C**:

- Bank Health metrics (coverage per subject/topicKey, difficulty breakdown).
- TopicKey alignment between the **canonical question bank** and **TopicHub / trends**.
- A debug UI panel that you can plug into your existing `PredictionDebugView`.

## Files in this bundle

- `src/prediction/bankHealth.ts`
  - Pure TypeScript utilities:
    - `buildBankHealthReport({ questions, topicKeySources, minHealthyCount })`
    - `summariseBankHealth(report)`
  - No external imports – you pass in your own `CanonicalQuestion[]` and topic key sources.

- `src/debug/BankHealthPanel.tsx`
  - React component for rendering:
    - Summary stats (zero coverage, low coverage, missing topics).
    - A table of `(subject, topicKey)` rows with difficulty breakdown and status.
  - Uses the types exported from `bankHealth.ts`.

## 1. Wiring questions from PredictionCore

In your existing codebase you already have a `PredictionCore` facade which can return
the canonical questions (as per your status doc). Typical usage:

```ts
import { PredictionCore } from '../prediction/PredictionCore';
import { buildBankHealthReport } from '../prediction/bankHealth';

const allQuestions = PredictionCore.getAllQuestions();
```

If your `CanonicalQuestion` type is richer than `CanonicalQuestionLike`, you can
pass it directly to `buildBankHealthReport` because the function only cares about:

- `id`
- `subject`
- `topicKey`
- `difficulty?`

## 2. Building topicKeySources from TopicHub / Trends

Workstream C requires us to align topic keys between:

- The **canonical question bank**.
- The **TopicHub / trend files** (`class10MathTopicTrends`, `class10ScienceTopicTrends`, etc.).

The `bankHealth` module expects a flat list:

```ts
interface TopicKeySource {
  subject: string;
  topicKey: string;
}
```

You can adapt your existing trend or TopicHub data into this shape with a small helper,
for example (pseudo-code; adjust paths and field names to match your project):

```ts
import { class10MathTopicTrends } from '../data/class10MathTopicTrends';
import { class10ScienceTopicTrends } from '../data/class10ScienceTopicTrends';
import type { TopicKeySource } from '../prediction/bankHealth';

function buildTopicKeySources(): TopicKeySource[] {
  const sources: TopicKeySource[] = [];

  for (const entry of class10MathTopicTrends) {
    sources.push({
      subject: 'Maths',
      topicKey: entry.topicKey,
    });
  }

  for (const entry of class10ScienceTopicTrends) {
    sources.push({
      subject: 'Science',
      topicKey: entry.topicKey,
    });
  }

  return sources;
}
```

If your TopicHub config already has a canonical `topicKey` per card,
you can generate `TopicKeySource[]` from that instead (or in addition).

## 3. Creating the BankHealthReport

Once you have `allQuestions` and `topicKeySources`, you can build the report:

```ts
import { buildBankHealthReport } from '../prediction/bankHealth';

const topicKeySources = buildTopicKeySources();

const report = buildBankHealthReport({
  questions: allQuestions,
  topicKeySources,
  minHealthyCount: 8, // or 10 / 12 depending on how strict you want to be
});
```

This `report` object is all you need to feed into the React panel.

## 4. Embedding BankHealthPanel into PredictionDebugView

In your dev-only `PredictionDebugView.tsx` (or similar), you can add a new tab
or section for bank health:

```tsx
import React from 'react';
import { PredictionCore } from '../prediction/PredictionCore';
import { buildBankHealthReport } from '../prediction/bankHealth';
import { BankHealthPanel } from './BankHealthPanel';

export const PredictionDebugView: React.FC = () => {
  const allQuestions = PredictionCore.getAllQuestions();
  const topicKeySources = buildTopicKeySources(); // from step 2

  const report = buildBankHealthReport({
    questions: allQuestions,
    topicKeySources,
    minHealthyCount: 8,
  });

  return (
    <div>
      {/* existing debug sections */}
      {/* ... */}

      <section style={{ marginTop: 24 }}>
        <BankHealthPanel report={report} />
      </section>
    </div>
  );
};
```

If your debug view already uses a tabbed UI, you can render `<BankHealthPanel />`
inside a new tab instead of a plain `<section>`.

## 5. Styling and class names

`BankHealthPanel` uses some basic class names (`lt-bh-*`) and also includes an
inline `<style>` block so it works out-of-the-box without extra CSS.

If you prefer, you can:

- Remove the inline `<style>` and move the rules into your global CSS.
- Swap the table for your design system’s table component (MUI, Chakra, etc.).

## 6. How this supports Workstream A + C

- **Workstream A – Bank Health**
  - Shows per-topic question counts and difficulty distribution.
  - Highlights zero and low coverage topics.

- **Workstream C – TopicKey Alignment**
  - Flags topics that appear in TopicHub/Trends but not in the bank (`missingInBank`).
  - Flags topics that appear in the bank but not in TopicHub/Trends (`missingInTopicSource`).
  - Gives you a concrete list of topic keys to rename or align.

Once this panel is wired, you can continuously use it as a live TODO board
for content enrichment and key alignment, instead of manually scanning JSON files.
