// LOW-END-1 PR-1 rework (owner ruling 1) — KaTeX UP FRONT on pages that show maths on their
// FIRST screen.
//
// MathText fetches KaTeX on demand, so that Check & Improve and the Chapter Test start screen
// (no maths until the student acts) do not carry it. A page that shows maths immediately must
// not flash a plain-text stand-in first, so it imports THIS module for its side effect:
//
//     import "../components/question/katexEager";
//
// That puts KaTeX (and its stylesheet) in the page's static import graph — fetched in parallel
// with the page itself — and hands it to MathText before the page's first render, so the first
// render is already KaTeX's own markup. Importers today: PracticeQuestionCard, SolutionChecker,
// HighlyProbableQuestions, TutorPage, FullMockPage. (Notes and the Topic Hub's notes modal
// already load KaTeX statically through NoteRichText.)
//
// ⚠ Never import this from Check & Improve, the Chapter Test page, or anything in their static
// graph (the PDF print docs included) — MathText.katexOnDemand.test.tsx walks both graphs.

import katex from "katex";
import "katex/dist/katex.min.css";
import { registerKatex } from "./MathText";

registerKatex(katex);
