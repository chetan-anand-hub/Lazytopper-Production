// src/pages/tutor/useTutorSession.ts
// Stage-1 tutor session state (component-local — the DURABLE cross-device session
// is Stage 2, D-TUT-3A). Owns the conversation, the honest templated opener + fork,
// the one-time context-brief assembly, and the send/retry round to /api/tutor.
//
// HONESTY (D-TUT-2): the opener does NOT claim "last time we did X" — there is no
// durable session memory yet, so fabricated continuity is forbidden. MI shapes the
// reply on the SERVER (via the brief), surfacing only after the student's first
// message — never front-loaded here.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { callTutor, type TutorBrief, type TutorTurn } from "../../ai/tutorClient";
import { assembleTutorBrief } from "./tutorContextBrief";

export type TutorStatus = "idle" | "sending" | "error";

/** A quick-reply on the opener: `label` shows on the chip, `send` is submitted as the student turn. */
export interface TutorFork {
  label: string;
  send: string;
}

export interface TutorOpener {
  /** Warm, nameless orientation + the diagnostic fork (or a concept-first line). */
  text: string;
  forks: TutorFork[];
}

export interface UseTutorSessionArgs {
  uid: string | null;
  topicKey: string; // canonical
  topicLabel: string;
  subject: "maths" | "science" | "";
  concept?: string;
  language: string;
}

export interface UseTutorSession {
  opener: TutorOpener;
  messages: TutorTurn[];
  status: TutorStatus;
  error: string | null;
  /** True once the student has sent anything (the opener collapses to history). */
  started: boolean;
  send: (text: string) => void;
  retry: () => void;
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

export function useTutorSession({
  uid,
  topicKey,
  topicLabel,
  subject,
  concept,
  language,
}: UseTutorSessionArgs): UseTutorSession {
  const [messages, setMessages] = useState<TutorTurn[]>([]);
  const [status, setStatus] = useState<TutorStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const briefRef = useRef<TutorBrief | null>(null);
  const sendingRef = useRef(false);

  const opener = useMemo(() => buildOpener(topicLabel, concept), [topicLabel, concept]);

  // Assemble the context brief once (read-only). Failure is non-fatal: brief stays
  // null and the tutor is told (server-side) to reference no performance.
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

  // Ask the model for the next turn given the CURRENT message list (which ends with
  // the student's turn). Shared by send() and retry().
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
          messages: convo,
          brief: briefRef.current,
          language,
        });
        setMessages((m) => [...m, { role: "tutor", content: res.reply }]);
        setStatus("idle");
      } catch (e) {
        setError(e instanceof Error ? e.message : "The tutor is unavailable right now.");
        setStatus("error");
      } finally {
        sendingRef.current = false;
      }
    },
    [uid, topicKey, topicLabel, subject, concept, language],
  );

  const send = useCallback(
    (text: string) => {
      const clean = text.trim();
      if (!clean || sendingRef.current) return;
      const next: TutorTurn[] = [...messages, { role: "user", content: clean }];
      setMessages(next);
      void runModel(next);
    },
    [messages, runModel],
  );

  // Retry re-sends the current conversation (which still ends with the failed student
  // turn) — no duplicate student bubble, no fabricated reply.
  const retry = useCallback(() => {
    if (sendingRef.current) return;
    if (messages.length === 0 || messages[messages.length - 1].role !== "user") return;
    void runModel(messages);
  }, [messages, runModel]);

  return {
    opener,
    messages,
    status,
    error,
    started: messages.length > 0,
    send,
    retry,
  };
}
