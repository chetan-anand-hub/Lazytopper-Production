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
import { getSessionRecordsFromCloud } from "../../services/sessionRecords";
import {
  loadTutorSessionLocal,
  loadTutorSessionFromCloud,
  saveTutorSession,
  type TutorCoverage,
  type TutorPendingMarker,
  type TutorSessionDoc,
} from "../../services/tutorSessionStore";
import {
  buildCheckImproveRoundTripHref,
  buildWorksheetRoundTripHref,
  composeReturnOpener,
  matchReturningRecord,
} from "./tutorRoundTrip";

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
  routeToCheckImprove: () => void;
  routeToPractice: () => void;
  /** Re-poll for a pending round-trip's graded record (student says "I'm back"). */
  recheckPending: () => void;
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

  const briefRef = useRef<TutorBrief | null>(null);
  const coverageRef = useRef<TutorCoverage>(
    loadTutorSessionLocal(uid, topicKey)?.coverage ?? { ...EMPTY_COVERAGE },
  );
  const sendingRef = useRef(false);
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

  // Poll for the returning graded record and inject the reframed opener (D-TUT-6).
  const resolvePendingRoundTrip = useCallback(
    async (marker: TutorPendingMarker) => {
      if (!uid) return;
      for (let attempt = 0; attempt < 4; attempt++) {
        const records = await getSessionRecordsFromCloud(uid);
        if (!mountedRef.current) return;
        const match = matchReturningRecord(records, marker);
        if (match) {
          const reframed = composeReturnOpener(match, topicLabel, marker.surface);
          setPending(null);
          setMessages((prev) => {
            const next: TutorTurn[] = [...prev, { role: "tutor", content: reframed.text, kind: "return-result" }];
            persist(next, null);
            return next;
          });
          setReturnFollow(reframed.follow ?? null);
          return;
        }
        if (attempt < 3) await new Promise((r) => setTimeout(r, 1500));
      }
      // Not found yet — keep the marker; the UI shows a gentle "still holding your
      // place" affordance, and a later return re-polls.
    },
    [uid, topicLabel, persist],
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
      setPending(marker);
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
        });
        if (!mountedRef.current) return;
        setMessages((prev) => {
          const next: TutorTurn[] = [...prev, { role: "tutor", content: res.reply }];
          persist(next, pending);
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
    [uid, topicKey, topicLabel, subject, concept, language, persist, pending],
  );

  const send = useCallback(
    (text: string) => {
      const clean = text.trim();
      if (!clean || sendingRef.current) return;
      setReturnFollow(null);
      // Light, honest coverage: mark the opened concept as "worked" once engaged.
      if (concept && !coverageRef.current.worked.includes(concept)) {
        coverageRef.current = { ...coverageRef.current, worked: [...coverageRef.current.worked, concept] };
      }
      const next: TutorTurn[] = [...messages, { role: "user", content: clean }];
      setMessages(next);
      persist(next, pending);
      void runModel(next);
    },
    [messages, runModel, concept, persist, pending],
  );

  const retry = useCallback(() => {
    if (sendingRef.current) return;
    if (messages.length === 0 || messages[messages.length - 1].role !== "user") return;
    void runModel(messages);
  }, [messages, runModel]);

  // ── Round-trip route-out (offered, never forced — D-TUT-5) ──────────────────
  const routeOut = useCallback(
    (marker: TutorPendingMarker, cueText: string, href: string) => {
      setPending(marker);
      const cue: TutorTurn = { role: "tutor", content: cueText, kind: "away-cue" };
      const next: TutorTurn[] = [...messages, cue];
      setMessages(next);
      persist(next, marker); // sync local write BEFORE navigating, so the marker survives
      navigate(href);
    },
    [messages, persist, navigate],
  );

  const routeToCheckImprove = useCallback(() => {
    routeOut(
      { surface: "check-improve", topicKey, departureTs: Date.now(), note: "Check & Improve" },
      `Holding your place - open Check & Improve, upload your attempt and get it marked, then come straight back and we'll go through exactly where it slipped.`,
      buildCheckImproveRoundTripHref({ returnTo: selfHref, topicSlug: topicKey }),
    );
  }, [routeOut, topicKey, selfHref]);

  const routeToPractice = useCallback(() => {
    routeOut(
      { surface: "worksheet", topicKey, departureTs: Date.now(), note: "practice set" },
      `Holding your place - here's a short practice set on ${concept ? `"${concept}"` : "this"}. Do it, then come back and we'll read the result together.`,
      buildWorksheetRoundTripHref({ returnTo: selfHref, subject, topicKey, concept }),
    );
  }, [routeOut, topicKey, subject, concept, selfHref]);

  const recheckPending = useCallback(() => {
    if (pending) void resolvePendingRoundTrip(pending);
  }, [pending, resolvePendingRoundTrip]);

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
    routeToCheckImprove,
    routeToPractice,
    recheckPending,
  };
}
