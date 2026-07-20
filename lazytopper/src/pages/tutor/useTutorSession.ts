// src/pages/tutor/useTutorSession.ts
// Stage-2 tutor session: the Stage-1 chat + the DURABLE round-trip.
//
// - The thread is persisted to tutorSessions/{uid}/topics/{topicKey} (local-first +
//   cloud) so it SURVIVES close/reopen AND the round-trip. On mount we hydrate it
//   (real memory for the continuity opener, D-TUT-2).
// - Route-out (to C&I / a worksheet) writes a pending marker + an away-cue, then
//   navigates with returnTo=/tutor/... so the student returns to the SAME thread.
// - On return (a concrete /tutor mount), if a marker is pending we POLL
//   getSessionRecordsFromCloud once (+ short retries — grading isn't instant) for the
//   matching graded record and inject the reframed opener (D-TUT-6). NO onSnapshot.
//
// HONESTY (D-TUT-8): the tutor writes only the thread + doubts/coverage — NEVER a
// grade. The return-opener's numbers come from the graded sessionRecord (read), not
// computed here.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { callTutor, type TutorBrief, type TutorTurn, type TutorReturnedWork } from "../../ai/tutorClient";
import type { WorksheetGradeResponse } from "../../ai/aiClient";
import { assembleTutorBrief } from "./tutorContextBrief";
import type { AuthUser } from "../../context/AuthContext";
import { getSessionRecordsFromCloud, getSessionPerQuestion, type SessionRecord } from "../../services/sessionRecords";
import { getAttemptsFromCloud } from "../../services/practiceInsights";
import { canonicalSlugMatches } from "../../data/syllabus/canonicalTopicSlug";
import {
  loadTutorSessionLocal,
  loadTutorSessionFromCloud,
  saveTutorSession,
  type TutorCoverage,
  type TutorPendingMarker,
  type TutorSessionDoc,
} from "../../services/tutorSessionStore";
import {
  buildQuickPracticeRoundTripHref,
  buildReturnedWork,
  composeReturnOpener,
  composeCheckImproveRichReturnOpener,
  composePracticeReturnOpener,
  composePracticeRecordReturnOpener,
  matchReturningRecord,
  matchReturningAttempts,
  matchReturningPracticeRecord,
  RETURNED_WORK_DIGEST_ENABLED,
} from "./tutorRoundTrip";
import { selectTutorDemoQuestion } from "./tutorDemoQuestion";
import { catalogueFiguresForTopic } from "./conceptVisualCatalogue";

export type TutorStatus = "idle" | "sending" | "error";

export interface TutorFork {
  label: string;
  send: string;
}

export interface TutorOpener {
  text: string;
  forks: TutorFork[];
}

export interface UseTutorSessionArgs {
  user: AuthUser | null;
  topicKey: string; // canonical
  topicLabel: string;
  subject: "maths" | "science" | "";
  concept?: string;
  language: string;
  /** The tutor's own URL — passed as returnTo so the round-trip comes back here. */
  selfHref: string;
}

export interface UseTutorSession {
  opener: TutorOpener;
  messages: TutorTurn[];
  status: TutorStatus;
  error: string | null;
  started: boolean;
  /** True once a real exchange exists — the round-trip CTAs are "earned" (D-TUT-5). */
  canRoundTrip: boolean;
  /** A pending round-trip (student is away, or a record wasn't found yet). */
  pending: TutorPendingMarker | null;
  /** A one-shot quick-reply offered after a reframed return-opener. */
  returnFollow: TutorFork | null;
  send: (text: string) => void;
  retry: () => void;
  /** Open Check & Improve as an in-tree overlay over the tutor (build v1.1). The
   *  check-improve leg NO LONGER navigates/polls; closing the panel IS the return. */
  openCheckImproveOverlay: () => void;
  /** True while the C&I overlay panel is open (TutorPage mounts the host). */
  checkImproveOverlayOpen: boolean;
  /** Close the overlay. Poll-free: a graded record injects the reframed opener directly
   *  (D-TUT-6). With the graded response in-hand (Option 2b) the opener is the RICH one
   *  (names the actual lost step) and the question + digest are held as one-shot model
   *  context (build lane). The raw question is held in-memory only (never persisted). */
  closeCheckImprove: (
    record?: SessionRecord,
    question?: { text: string; imageBase64: string | null },
    gradedResponse?: WorksheetGradeResponse,
  ) => void;
  /** Open Quick Practice as an in-tree overlay over the tutor (the C&I overlay's twin). The
   *  practice leg NO LONGER navigates; closing the panel triggers the graded read-back over the
   *  EXISTING pending-marker round-trip (storage — QP is the reference impl composePracticeRecordReturnOpener). */
  openQuickPracticeOverlay: () => void;
  /** True while the QP overlay panel is open (TutorPage mounts the host). */
  quickPracticeOverlayOpen: boolean;
  /** Close the QP overlay + read back the graded record (poll-with-retries handles the
   *  persist→read race). A partial set with no record keeps the holding banner, exactly as the
   *  navigate leg did. */
  closeQuickPractice: () => void;
  /** The seed URL for the overlay's MemoryRouter — the SAME buildQuickPracticeRoundTripHref
   *  string the navigate leg used, so the hosted PracticePage sees a real tutor→QP visit. */
  quickPracticeHref: string;
  /** Re-poll for a pending round-trip's result (student says "I'm back"). Honest +
   *  non-blocking: clears the holding state whether or not a result is found (Fix 2). */
  recheckPending: () => void;
  /** Dismiss the holding banner without checking — re-engaging clears the marker (Fix 2). */
  dismissPending: () => void;
}

function buildOpener(topicLabel: string, concept?: string): TutorOpener {
  if (concept && concept.trim()) {
    const c = concept.trim();
    return {
      text: `${topicLabel} - ${c}. What's not clicking here? Tell me what you tried, or I can explain it from the top.`,
      forks: [{ label: `Explain "${c}" from the top`, send: `Explain "${c}" from the top.` }],
    };
  }
  return {
    text: `${topicLabel} - Class 10. Ask me anything on this topic. What's tripping you up - a specific question you got stuck on, or the concept itself?`,
    forks: [
      { label: "A specific question", send: "I have a specific question I got stuck on." },
      { label: "A concept I find hard", send: "There's a concept here I find hard." },
      { label: `I just don't get ${topicLabel.toLowerCase()}`, send: `Honestly, I just don't get ${topicLabel}.` },
    ],
  };
}

const EMPTY_COVERAGE: TutorCoverage = { worked: [], doubts: [] };

export function useTutorSession({
  user,
  topicKey,
  topicLabel,
  subject,
  concept,
  language,
  selfHref,
}: UseTutorSessionArgs): UseTutorSession {
  const uid = user?.uid ?? null;

  // Hydrate the thread synchronously from the local mirror (instant on same-device
  // return); the mount effect reconciles the cloud copy.
  const [messages, setMessages] = useState<TutorTurn[]>(
    () => loadTutorSessionLocal(uid, topicKey)?.messages ?? [],
  );
  const [status, setStatus] = useState<TutorStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<TutorPendingMarker | null>(
    () => loadTutorSessionLocal(uid, topicKey)?.pending ?? null,
  );
  const [returnFollow, setReturnFollow] = useState<TutorFork | null>(null);

  // ── C&I OVERLAY (build v1.1) — the check-improve leg opens an in-tree panel over the
  // tutor instead of navigating out. No pending marker, no away-cue, no poll, no waiting
  // banner (all RETIRED for this leg; the practice leg still routes out and keeps them).
  const [checkImproveOverlayOpen, setCheckImproveOverlayOpen] = useState(false);
  // ── QP OVERLAY (the C&I overlay's twin) — the practice leg opens an in-tree panel over the
  // tutor instead of navigating out. Unlike the C&I leg it KEEPS the pending marker + holding
  // banner: the graded read-back is the shipped storage round-trip (QP persists at its scorecard;
  // the tutor reads it via composePracticeRecordReturnOpener), so the marker is still the key.
  const [quickPracticeOverlayOpen, setQuickPracticeOverlayOpen] = useState(false);
  // The raw question the student entered in the overlay, handed back on close. IN-MEMORY
  // only — never persisted, never added to the SessionRecord (owner ruling (a)). Held as
  // the seam a future prompt lane consumes so the model can reference what was asked
  // ([FU-TUTOR-OVERLAY-QUESTION-TO-MODEL]); the marks already reach the model via injectReturn.
  const overlayQuestionRef = useRef<{ text: string; imageBase64: string | null } | null>(null);
  // The one-shot returnedWork model-context assembled on overlay close (build lane — the tutor
  // sees the graded work): the verbatim question (Piece 1) + the eval-gated per-step digest
  // (Piece 2 / §6.3). Passed to `callTutor` on the return turn so the model can reference the
  // question AND, when the digest ships, what held up. EPHEMERAL — a ref, never persisted to the
  // thread; cleared to null on a bare pre-grade escape. [FU-TUTOR-OVERLAY-QUESTION-TO-MODEL].
  const returnedWorkRef = useRef<TutorReturnedWork | null>(null);

  // Mirror `pending` in a ref so callbacks persist the CURRENT marker, never a stale
  // closure copy (Fix 2 — clearing on re-engage must not be undone by an in-flight
  // runModel that captured the old value).
  const pendingRef = useRef<TutorPendingMarker | null>(pending);
  const updatePending = useCallback((next: TutorPendingMarker | null) => {
    pendingRef.current = next;
    setPending(next);
  }, []);

  // Fix 4: the verified bank question the tutor solves on a "see how it's solved"
  // demonstration (bank-over-self-invented). Selected once per (subject, topic, concept);
  // null when the bank has nothing usable → the server prompt self-gens a railed example.
  const demoQuestion = useMemo(
    () => selectTutorDemoQuestion({ subject, topicKey, concept }),
    [subject, topicKey, concept],
  );

  // Stage 3: the closed set of concepts in this topic that have a curated diagram — passed to
  // the model so it can signal one via [[figure:<key>]] (the panel then shows the real asset).
  const figures = useMemo(() => catalogueFiguresForTopic({ subject, topicKey }), [subject, topicKey]);

  const briefRef = useRef<TutorBrief | null>(null);
  const coverageRef = useRef<TutorCoverage>(
    loadTutorSessionLocal(uid, topicKey)?.coverage ?? { ...EMPTY_COVERAGE },
  );
  const sendingRef = useRef(false);
  const resolvingRef = useRef(false);
  const mountedRef = useRef(true);

  const opener = useMemo(() => buildOpener(topicLabel, concept), [topicLabel, concept]);

  // Persist the durable session (thread + coverage + pending). saveTutorSession is
  // honest-gated (skips signed-out/local) and writes the local mirror synchronously.
  const persist = useCallback(
    (msgs: TutorTurn[], nextPending: TutorPendingMarker | null) => {
      if (!user) return;
      const docToSave: TutorSessionDoc = {
        topicKey,
        topicLabel,
        subject,
        updatedAt: Date.now(),
        messages: msgs,
        coverage: coverageRef.current,
        pending: nextPending,
      };
      saveTutorSession(user, docToSave);
    },
    [user, topicKey, topicLabel, subject],
  );

  // Inject the reframed return-opener + clear the holding state (both legs share this).
  const injectReturn = useCallback(
    (opener: { text: string; follow?: TutorFork }) => {
      updatePending(null);
      setMessages((prev) => {
        const next: TutorTurn[] = [...prev, { role: "tutor", content: opener.text, kind: "return-result" }];
        persist(next, null);
        return next;
      });
      setReturnFollow(opener.follow ?? null);
    },
    [updatePending, persist],
  );

  // Poll for the returning result and inject the reframed opener (D-TUT-6). The PRACTICE
  // leg reads QP's graded session record first and falls back to `practiceInsights`
  // attempts (see the chain inside); the C&I / legacy-worksheet leg watches graded
  // `sessionRecords` (Fix 6 — unchanged). `explicit` = the student tapped "I'm back":
  // if nothing is found we then unblock honestly (Fix 2), rather than leaving a stuck banner.
  const resolvePendingRoundTrip = useCallback(
    async (marker: TutorPendingMarker, explicit = false) => {
      if (!uid) return;
      // Guard against overlapping resolves (a double "I'm back" tap, or a tap during the
      // auto mount poll) injecting two openers.
      if (resolvingRef.current) return;
      resolvingRef.current = true;
      try {

      for (let attempt = 0; attempt < 4; attempt++) {
        if (marker.surface === "practice") {
          // The practice leg reads TWO sources, richest-first — they have different
          // reach and neither subsumes the other:
          //
          //  1. QP's own durable session record (#436) + its perQuestion payload —
          //     carries the SAME grader's per-step detail C&I's opener reads, so the
          //     tutor can name WHERE it slipped. But QP writes it ONLY when the
          //     scorecard appears (`sessionFinished || allDone`, no unmount hook): a
          //     student who does 2 of 5 and taps "Back to your tutor" has NO record.
          //  2. `practiceInsights` attempts — written on EVERY answer, so they cover
          //     the unfinished-set case the record cannot, at marks-only depth.
          //
          // Hence ADDITIVE, never a replacement: record → attempts → nothing. The
          // composer returns null whenever the record can't actually beat the
          // marks-only line (MCQ-only, no quotable step), and we fall through rather
          // than dress up thin data.
          const records = await getSessionRecordsFromCloud(uid);
          if (!mountedRef.current) return;
          const qpRecord = matchReturningPracticeRecord(records, marker, canonicalSlugMatches);
          if (qpRecord) {
            const payload = await getSessionPerQuestion(uid, qpRecord.perQuestionRef);
            if (!mountedRef.current) return;
            const rich = composePracticeRecordReturnOpener(qpRecord, payload, topicLabel);
            if (rich) {
              injectReturn(rich);
              return;
            }
          }
          const attempts = await getAttemptsFromCloud(uid, { start: marker.departureTs });
          if (!mountedRef.current) return;
          const mine = matchReturningAttempts(attempts, marker, canonicalSlugMatches);
          if (mine.length) {
            injectReturn(composePracticeReturnOpener(mine, topicLabel));
            return;
          }
        } else {
          const records = await getSessionRecordsFromCloud(uid);
          if (!mountedRef.current) return;
          const match = matchReturningRecord(records, marker);
          if (match) {
            const surface = marker.surface === "worksheet" ? "worksheet" : "check-improve";
            injectReturn(composeReturnOpener(match, topicLabel, surface));
            return;
          }
        }
        if (attempt < 3) await new Promise((r) => setTimeout(r, 1500));
      }

      // Nothing found. On an EXPLICIT "I'm back" tap, unblock honestly (never a dead button
      // or an indefinite banner). On an auto (mount) poll, keep the marker — the banner stays
      // ACTIONABLE + dismissable and a later return / re-engage re-polls or clears it.
      if (explicit && mountedRef.current) {
        injectReturn({
          text: "I don't see a graded attempt yet — finish the set and tap back in, or just tell me how it went.",
        });
      }
      } finally {
        resolvingRef.current = false;
      }
    },
    [uid, topicLabel, injectReturn],
  );

  // Mount: reconcile the cloud thread + resolve any pending round-trip.
  useEffect(() => {
    mountedRef.current = true;
    if (!uid) return;
    let live = true;
    (async () => {
      const session = await loadTutorSessionFromCloud(uid, topicKey);
      if (!live || !session) return;
      if (session.coverage) coverageRef.current = session.coverage;
      setMessages((prev) => (session.messages.length > prev.length ? session.messages : prev));
      const marker = session.pending ?? null;
      updatePending(marker);
      if (marker) void resolvePendingRoundTrip(marker);
    })();
    return () => {
      live = false;
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, topicKey]);

  // Assemble the MI/progress brief once (read-only). Honest-or-silent on failure.
  useEffect(() => {
    if (!uid) return;
    let live = true;
    assembleTutorBrief({ uid, topicKey, subject })
      .then((b) => {
        if (live) briefRef.current = b;
      })
      .catch(() => {
        /* honest-or-silent */
      });
    return () => {
      live = false;
    };
  }, [uid, topicKey, subject]);

  const runModel = useCallback(
    async (convo: TutorTurn[]) => {
      if (sendingRef.current) return;
      sendingRef.current = true;
      setStatus("sending");
      setError(null);
      try {
        const res = await callTutor({
          uid: uid || "",
          topicKey,
          topicLabel,
          subject,
          concept,
          // Only real dialogue turns go to the model — skip the away-cue/return markers.
          messages: convo.filter((m) => m.kind !== "away-cue"),
          brief: briefRef.current,
          language,
          demoQuestion,
          figures,
          // The one-shot graded-work context from the last overlay close (build lane). A ref, so
          // it rides every turn while set without re-triggering runModel; null on any non-return
          // session. The server rebuilds it at the trust boundary before it reaches the prompt.
          returnedWork: returnedWorkRef.current,
        });
        if (!mountedRef.current) return;
        setMessages((prev) => {
          const next: TutorTurn[] = [
            // The model's per-turn intent (Fix 3) + any curated-figure signal (Stage 3) ride
            // ON the tutor turn — the UI gates ONE round-trip CTA off the LATEST tutor turn's
            // offer, and opens the explanation panel to the LATEST tutor turn's figure.
            ...prev,
            {
              role: "tutor",
              content: res.reply,
              ...(res.offer ? { offer: res.offer } : {}),
              ...(res.figure ? { figure: res.figure } : {}),
            },
          ];
          persist(next, pendingRef.current);
          return next;
        });
        setStatus("idle");
      } catch (e) {
        if (!mountedRef.current) return;
        setError(e instanceof Error ? e.message : "The tutor is unavailable right now.");
        setStatus("error");
      } finally {
        sendingRef.current = false;
      }
    },
    [uid, topicKey, topicLabel, subject, concept, language, persist, demoQuestion, figures],
  );

  const send = useCallback(
    (text: string) => {
      const clean = text.trim();
      if (!clean || sendingRef.current) return;
      setReturnFollow(null);
      // Fix 2: re-engaging IS the return signal — sending any new message clears a pending
      // holding marker (the banner never blocks a student who is back and typing).
      if (pendingRef.current) updatePending(null);
      // Light, honest coverage: mark the opened concept as "worked" once engaged.
      if (concept && !coverageRef.current.worked.includes(concept)) {
        coverageRef.current = { ...coverageRef.current, worked: [...coverageRef.current.worked, concept] };
      }
      const next: TutorTurn[] = [...messages, { role: "user", content: clean }];
      setMessages(next);
      persist(next, null);
      void runModel(next);
    },
    [messages, runModel, concept, persist, updatePending],
  );

  const retry = useCallback(() => {
    if (sendingRef.current) return;
    if (messages.length === 0 || messages[messages.length - 1].role !== "user") return;
    void runModel(messages);
  }, [messages, runModel]);

  // ── C&I + QP OVERLAYS — both practice-adjacent round-trips now open an IN-TREE PANEL over
  // the tutor instead of navigating out (the C&I leg, #476; the QP leg, its twin, here). The old
  // `routeOut` navigate helper is fully retired: routeToCheckImprove (removed #476) and
  // routeToPractice (removed here) were its ONLY callers, so nothing is left navigating away.
  //
  // The two legs differ ONLY in how the graded work returns:
  //   · C&I opens with NO marker + NO away-cue and hands the record back IN-MEMORY on close
  //     (Option 2b, poll-free) — the student never leaves, so there is no "away" state.
  //   · QP keeps the shipped STORAGE round-trip: openQuickPracticeOverlay writes the pending
  //     marker (below), QP persists at its scorecard, and closeQuickPractice reads it back via
  //     the existing composePracticeRecordReturnOpener chain — so the marker + holding banner stay.
  const openCheckImproveOverlay = useCallback(() => {
    setCheckImproveOverlayOpen(true);
  }, []);

  // Overlay close — the poll-free return path (report §6.4). The freshly-graded record AND the
  // graded response are handed straight in (Option 2b — no cloud poll, no marker match, no
  // latency). With the response, the tutor injects the RICH reframed opener that names the actual
  // lost step (composeCheckImproveRichReturnOpener); when the response is thin/absent it falls back
  // to the UNCHANGED thin `composeReturnOpener` (the honest floor). The question + eval-gated digest
  // are assembled into the one-shot returnedWork model-context. The tutor NEVER grades (D-TUT-8):
  // every number is the record C&I wrote. The raw question is held in-memory only (never persisted).
  const closeCheckImprove = useCallback(
    (
      record?: SessionRecord,
      question?: { text: string; imageBase64: string | null },
      gradedResponse?: WorksheetGradeResponse,
    ) => {
      setCheckImproveOverlayOpen(false);
      if (question) overlayQuestionRef.current = question;
      // Assemble the return-turn model context (Piece 1 + the eval-gated §6.3 digest). Null when
      // there is nothing usable (a bare pre-grade escape) — which clears any stale prior context.
      returnedWorkRef.current = buildReturnedWork({
        question,
        response: gradedResponse ?? null,
        includeDigest: RETURNED_WORK_DIGEST_ENABLED,
      });
      if (record) {
        const rich = gradedResponse
          ? composeCheckImproveRichReturnOpener(record, gradedResponse, topicLabel)
          : null;
        injectReturn(rich ?? composeReturnOpener(record, topicLabel, "check-improve"));
      }
    },
    [injectReturn, topicLabel],
  );

  // ── QP OVERLAY (the C&I overlay's twin) — replaces the navigate leg for the practice CTA ──
  // The seed URL is the SAME one the navigate leg built (buildQuickPracticeRoundTripHref):
  // source=tutor + topic + microconcept(subtopicHint) + a short count + backLabel. The overlay
  // host mounts PracticePage in a MemoryRouter seeded with it, so the page sees a real tutor→QP
  // visit (byte-identical params) without navigating away. Graded read-back is UNCHANGED.
  const quickPracticeHref = useMemo(
    () =>
      buildQuickPracticeRoundTripHref({
        returnTo: selfHref,
        subject,
        topicKey,
        concept,
        // [FU-TUTOR-BACKLABEL-COUNT]: name the back button "Back to your tutor" + a short set.
        backLabel: "Back to your tutor",
        count: 5,
      }),
    [selfHref, subject, topicKey, concept],
  );

  // Open the panel + write the pending marker (NO navigate, NO away-cue: the student never
  // leaves). The marker is the read-back key on close AND the holding-banner fallback if the
  // student closes a partial set with no graded record (mirrors the navigate leg's behaviour).
  const openQuickPracticeOverlay = useCallback(() => {
    setQuickPracticeOverlayOpen(true);
    const marker: TutorPendingMarker = {
      surface: "practice",
      topicKey,
      departureTs: Date.now(),
      note: "practice set",
    };
    updatePending(marker);
    persist(messages, marker);
  }, [topicKey, updatePending, persist, messages]);

  // Close the panel + resolve the graded round-trip (poll-with-retries absorbs the persist→read
  // race). On success the reframed opener is injected (composePracticeRecordReturnOpener) and the
  // marker cleared; a partial set with no record keeps the marker → the holding banner (unchanged).
  const closeQuickPractice = useCallback(() => {
    setQuickPracticeOverlayOpen(false);
    const marker = pendingRef.current;
    if (marker && marker.surface === "practice") void resolvePendingRoundTrip(marker);
  }, [resolvePendingRoundTrip]);

  const recheckPending = useCallback(() => {
    if (pendingRef.current) void resolvePendingRoundTrip(pendingRef.current, true);
  }, [resolvePendingRoundTrip]);

  const dismissPending = useCallback(() => {
    // Fix 2: dismissing the banner clears the marker (re-engaging without a check). The
    // tutor can still read the result on demand later via "I'm back" if the student re-routes.
    if (pendingRef.current) {
      updatePending(null);
      setMessages((prev) => {
        persist(prev, null);
        return prev;
      });
    }
  }, [updatePending, persist]);

  return {
    opener,
    messages,
    status,
    error,
    started: messages.length > 0,
    canRoundTrip: messages.some((m) => m.role === "tutor" && m.kind !== "away-cue"),
    pending,
    returnFollow,
    send,
    retry,
    openCheckImproveOverlay,
    checkImproveOverlayOpen,
    closeCheckImprove,
    openQuickPracticeOverlay,
    quickPracticeOverlayOpen,
    closeQuickPractice,
    quickPracticeHref,
    recheckPending,
    dismissPending,
  };
}
