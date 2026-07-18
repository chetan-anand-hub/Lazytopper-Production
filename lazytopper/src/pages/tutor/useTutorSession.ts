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
import { useNavigate } from "react-router-dom";
import { callTutor, type TutorBrief, type TutorTurn } from "../../ai/tutorClient";
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
  composeReturnOpener,
  composePracticeReturnOpener,
  composePracticeRecordReturnOpener,
  matchReturningRecord,
  matchReturningAttempts,
  matchReturningPracticeRecord,
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
   *  (D-TUT-6); the raw question is held in-memory only (never persisted). */
  closeCheckImprove: (
    record?: SessionRecord,
    question?: { text: string; imageBase64: string | null },
  ) => void;
  routeToPractice: () => void;
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
  const navigate = useNavigate();

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
  // The raw question the student entered in the overlay, handed back on close. IN-MEMORY
  // only — never persisted, never added to the SessionRecord (owner ruling (a)). Held as
  // the seam a future prompt lane consumes so the model can reference what was asked
  // ([FU-TUTOR-OVERLAY-QUESTION-TO-MODEL]); the marks already reach the model via injectReturn.
  const overlayQuestionRef = useRef<{ text: string; imageBase64: string | null } | null>(null);

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

  // ── Round-trip route-out (offered, never forced — D-TUT-5) ──────────────────
  const routeOut = useCallback(
    (marker: TutorPendingMarker, cueText: string, href: string) => {
      updatePending(marker);
      const cue: TutorTurn = { role: "tutor", content: cueText, kind: "away-cue" };
      const next: TutorTurn[] = [...messages, cue];
      setMessages(next);
      persist(next, marker); // sync local write BEFORE navigating, so the marker survives
      navigate(href);
    },
    [messages, persist, navigate, updatePending],
  );

  // ── C&I OVERLAY (build v1.1) — replaces the navigate/marker/poll leg ──────────────
  // Opening the overlay writes NO pending marker and NO away-cue: the student never leaves
  // the thread, so there is no "away" state to hold and no banner to show. The navigate
  // round-trip for THIS leg — and its pending-marker poll + "tutor is waiting" banner —
  // is retired at EVERY width; the practice leg still uses routeOut and keeps them.
  // (Verified at trunk: routeToCheckImprove was the ONLY creator of a
  //  surface:"check-improve" pending marker, so nothing is left firing.)
  const openCheckImproveOverlay = useCallback(() => {
    setCheckImproveOverlayOpen(true);
  }, []);

  // Overlay close — the poll-free return path (report §6.4). The freshly-graded record is
  // handed straight in, so the tutor injects the SAME reframed opener the navigate path
  // would (composeReturnOpener, D-TUT-6) — no cloud poll, no marker match, no latency. The
  // tutor NEVER grades (D-TUT-8): every number is the record C&I wrote. The raw question
  // is held in-memory only (never persisted, never in the SessionRecord).
  const closeCheckImprove = useCallback(
    (record?: SessionRecord, question?: { text: string; imageBase64: string | null }) => {
      setCheckImproveOverlayOpen(false);
      if (question) overlayQuestionRef.current = question;
      if (record) injectReturn(composeReturnOpener(record, topicLabel, "check-improve"));
    },
    [injectReturn, topicLabel],
  );

  const routeToPractice = useCallback(() => {
    routeOut(
      { surface: "practice", topicKey, departureTs: Date.now(), note: "practice set" },
      `Holding your place - here's a short practice set on ${concept ? `"${concept}"` : "this"}. Do it, then come back and we'll read the result together.`,
      // [FU-TUTOR-BACKLABEL-COUNT]: name the back button "Back to your tutor" + a short set.
      buildQuickPracticeRoundTripHref({
        returnTo: selfHref,
        subject,
        topicKey,
        concept,
        backLabel: "Back to your tutor",
        count: 5,
      }),
    );
  }, [routeOut, topicKey, subject, concept, selfHref]);

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
    routeToPractice,
    recheckPending,
    dismissPending,
  };
}
