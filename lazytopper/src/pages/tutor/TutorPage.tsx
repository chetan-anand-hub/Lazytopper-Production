// src/pages/tutor/TutorPage.tsx
// FRESH tutor surface (D-TUT-12) — the /tutor route entry. NOT TeachFlow /
// ConceptTeachDrawer / TutorDrawerV2.
//
// Stage 2 (the round-trip): the durable session (useTutorSession) makes the thread
// survive close/reopen AND a round-trip to C&I / Practice; the tutor offers the
// round-trip CTAs (earned), shows a "holding your place" cue on the away-leg, and
// injects the reframed graded-sheet opener on return (D-TUT-6). Math renders through
// the shared <MathText> (KaTeX) — the model emits \(...\)/\[...\], not raw source.
//
// Bare full-screen route: the tutor owns its whole viewport (position:fixed + dvh,
// stream-only-scroll, pinned composer — no empty gap at 360px). Product grammar:
// light, green hsl(152,55%,45%), Fraunces + Inter. Two-panel scaffold; the
// explanation panel stays a CLOSED Stage-3 placeholder.

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { resolveCanonicalSlug } from "../../data/syllabus/canonicalTopicSlug";
import { desktopTopicBySlug } from "../../lib/desktop/topics";
import { MathText } from "../../components/question/MathText";
import { useTutorSession } from "./useTutorSession";
import { safeInternalReturnTo } from "./tutorPath";

// Language layer (Teach-Contract §5): explanation language is the student's choice;
// exam content stays English (enforced in the system prompt). Real selector.
const LANGUAGES = [
  "English",
  "Hindi",
  "Tamil",
  "Telugu",
  "Bengali",
  "Kannada",
  "Marathi",
  "Malayalam",
  "Gujarati",
] as const;

function prettify(slug: string): string {
  return slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function TutorPage() {
  const params = useParams<{ grade?: string; subject?: string; topicKey?: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { user } = useAuth();

  const grade = params.grade || "10";
  const subjectParam = params.subject || "";
  const subject: "maths" | "science" | "" =
    subjectParam.toLowerCase() === "science"
      ? "science"
      : subjectParam.toLowerCase() === "maths"
        ? "maths"
        : "";

  const topicKeyRaw = params.topicKey || "";
  const canonicalTopicKey = resolveCanonicalSlug(topicKeyRaw) || topicKeyRaw;
  const topicLabel = useMemo(
    () => desktopTopicBySlug(topicKeyRaw)?.name || prettify(topicKeyRaw) || "this topic",
    [topicKeyRaw],
  );

  const concept = searchParams.get("concept") || undefined;
  const backHref =
    safeInternalReturnTo(searchParams.get("returnTo")) ||
    (subjectParam && topicKeyRaw
      ? `/topic-hub/${grade}/${subjectParam}/${encodeURIComponent(topicKeyRaw)}`
      : "/exam-trends");

  // The tutor's own URL — the round-trip passes it as returnTo so C&I / Practice
  // bring the student back to THIS thread.
  const selfHref = `${location.pathname}${location.search}`;

  const [language, setLanguage] = useState<string>("English");
  const [draft, setDraft] = useState("");

  const {
    opener,
    messages,
    status,
    error,
    canRoundTrip,
    pending,
    returnFollow,
    send,
    retry,
    routeToCheckImprove,
    routeToPractice,
    recheckPending,
  } = useTutorSession({
    user,
    topicKey: canonicalTopicKey,
    topicLabel,
    subject,
    concept,
    language,
    selfHref,
  });

  const streamRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = streamRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, status, pending]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || status === "sending") return;
    setDraft("");
    send(text);
  };

  return (
    <div className="lt-tutor">
      <style>{TUTOR_CSS}</style>

      {/* Nameless, warm header — back + concept + Class 10 + language */}
      <header className="lt-tutor__top">
        <Link to={backHref} className="lt-tutor__back" aria-label="Back">
          <span aria-hidden="true">&larr;</span>
        </Link>
        <div className="lt-tutor__ttl">
          <div className="lt-tutor__c">{concept ? `${topicLabel} · ${concept}` : topicLabel}</div>
          <div className="lt-tutor__s2">Class 10 · ask anything on this topic</div>
        </div>
        <label className="lt-tutor__lang">
          <span className="lt-tutor__lang-lbl">Language</span>
          <select
            className="lt-tutor__lang-sel"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            aria-label="Explanation language"
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </header>

      <div className="lt-tutor__body">
        {/* Chat panel — primary, full-width when the explanation panel is closed */}
        <section className="lt-tutor__chat">
          <div className="lt-tutor__stream" ref={streamRef} role="log" aria-live="polite">
            {/* Opener shows only for a fresh session (no persisted thread) */}
            {messages.length === 0 && (
              <>
                <div className="lt-tutor__t">
                  <MathText text={opener.text} />
                </div>
                <div className="lt-tutor__forks">
                  {opener.forks.map((f) => (
                    <button
                      key={f.label}
                      type="button"
                      className="lt-tutor__fork"
                      onClick={() => send(f.send)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {messages.map((m, i) => {
              if (m.role === "user") {
                return (
                  <div key={i} className="lt-tutor__s">
                    <span>
                      <MathText text={m.content} />
                    </span>
                  </div>
                );
              }
              if (m.kind === "away-cue") {
                return (
                  <div key={i} className="lt-tutor__away">
                    <span aria-hidden="true">⏸</span> {m.content}
                  </div>
                );
              }
              return (
                <div
                  key={i}
                  className={m.kind === "return-result" ? "lt-tutor__t lt-tutor__t--return" : "lt-tutor__t"}
                >
                  <MathText text={m.content} />
                </div>
              );
            })}

            {/* One-shot follow-up quick-reply after a reframed return-opener */}
            {returnFollow && !pending && (
              <div className="lt-tutor__forks">
                <button type="button" className="lt-tutor__fork" onClick={() => send(returnFollow.send)}>
                  {returnFollow.label}
                </button>
              </div>
            )}

            {/* Pending round-trip — holding your place; re-poll on "I'm back" */}
            {pending && (
              <div className="lt-tutor__pending">
                <span>
                  Holding your place — you&rsquo;re in {pending.note || "another surface"}. Come back when it&rsquo;s
                  graded.
                </span>
                <button type="button" className="lt-tutor__retry" onClick={recheckPending}>
                  I&rsquo;m back — check
                </button>
              </div>
            )}

            {status === "sending" && (
              <div className="lt-tutor__typing" aria-label="Tutor is typing">
                <span></span>
                <span></span>
                <span></span>
              </div>
            )}
            {status === "error" && (
              <div className="lt-tutor__err">
                <span>{error || "The tutor is unavailable right now."}</span>
                <button type="button" className="lt-tutor__retry" onClick={retry}>
                  Try again
                </button>
              </div>
            )}
          </div>

          {/* Round-trip CTAs — offered once earned, never forced (D-TUT-5) */}
          {canRoundTrip && !pending && (
            <div className="lt-tutor__actions">
              <button type="button" className="lt-tutor__action" onClick={routeToPractice}>
                Practise this
              </button>
              <button type="button" className="lt-tutor__action" onClick={routeToCheckImprove}>
                Get my attempt marked
              </button>
            </div>
          )}

          <form className="lt-tutor__composer" onSubmit={onSubmit}>
            <div className="lt-tutor__cbar">
              <input
                className="lt-tutor__input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={`Ask about ${topicLabel.toLowerCase()} in English, Hindi, or Hinglish...`}
                aria-label={`Ask about ${topicLabel}`}
                disabled={status === "sending"}
                autoComplete="off"
              />
              <button
                type="submit"
                className="lt-tutor__send"
                aria-label="Send"
                disabled={status === "sending" || !draft.trim()}
              >
                <span aria-hidden="true">&uarr;</span>
              </button>
            </div>
            <div className="lt-tutor__foot">
              CBSE Class-10 · NCERT-grounded · graded work stays in Check &amp; Improve / Practice
            </div>
          </form>
        </section>

        {/* Explanation panel — CLOSED scaffold (Stage 3 populates it). Split on
            desktop, overlay on mobile — CSS-driven. */}
        <aside className="lt-tutor__panel lt-tutor__panel--closed" aria-hidden="true" />
      </div>
    </div>
  );
}

const TUTOR_CSS = `
.lt-tutor {
  --lt-green: hsl(152, 55%, 45%);
  --lt-green-deep: hsl(152, 60%, 30%);
  --lt-green-tint: hsl(152, 50%, 96%);
  --lt-green-line: hsl(152, 42%, 86%);
  --lt-ink: hsl(220, 25%, 14%);
  --lt-soft: hsl(220, 15%, 42%);
  --lt-faint: hsl(220, 15%, 60%);
  --lt-line: hsl(220, 20%, 92%);
  --lt-bg: hsl(210, 30%, 99%);
  --lt-amber-ink: hsl(35, 55%, 38%);
  --lt-amber-bg: hsl(42, 90%, 96%);
  --lt-amber-line: hsl(40, 60%, 84%);
  font-family: var(--font-body, "Inter", system-ui, sans-serif);
  color: var(--lt-ink);
  background: #fff;
  /* Lock the shell to the visible viewport so the composer stays pinned and there is
     no empty gap below it at mobile width (100dvh tracks the mobile URL bar). */
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 100vh;
  height: 100dvh;
  z-index: 40;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.lt-tutor__top {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px clamp(14px, 3vw, 24px);
  border-bottom: 1px solid var(--lt-line);
  flex: none;
}
.lt-tutor__back {
  color: var(--lt-faint);
  font-size: 20px;
  line-height: 1;
  text-decoration: none;
  padding: 4px 6px;
  border-radius: 8px;
}
.lt-tutor__back:hover { color: var(--lt-ink); background: var(--lt-bg); }
.lt-tutor__ttl { flex: 1; min-width: 0; }
.lt-tutor__c {
  font-family: var(--font-display, "Fraunces", Georgia, serif);
  font-weight: 600;
  font-size: 16px;
  color: hsl(215, 45%, 16%);
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lt-tutor__s2 { font-size: 11.5px; color: var(--lt-faint); }
.lt-tutor__lang { display: inline-flex; align-items: center; gap: 6px; flex: none; }
.lt-tutor__lang-lbl { font-size: 11px; color: var(--lt-faint); font-weight: 600; }
.lt-tutor__lang-sel {
  font-family: var(--font-body, "Inter", system-ui, sans-serif);
  font-size: 12.5px;
  font-weight: 500;
  color: var(--lt-soft);
  background: var(--lt-bg);
  border: 1px solid var(--lt-line);
  border-radius: 8px;
  padding: 5px 8px;
  cursor: pointer;
}
.lt-tutor__body { flex: 1; display: flex; min-height: 0; }
.lt-tutor__chat { flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column; }
.lt-tutor__stream {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px clamp(14px, 4vw, 40px) 10px;
  max-width: 860px;
  width: 100%;
  margin: 0 auto;
}
.lt-tutor__t {
  max-width: 92%;
  margin: 0 0 15px;
  font-size: 15px;
  line-height: 1.62;
  color: var(--lt-ink);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.lt-tutor__t--return {
  border-left: 3px solid var(--lt-green);
  padding-left: 12px;
  background: var(--lt-green-tint);
  border-radius: 0 10px 10px 0;
  padding-top: 10px;
  padding-bottom: 10px;
  padding-right: 12px;
  max-width: 96%;
}
.lt-tutor__s { display: flex; justify-content: flex-end; margin: 0 0 15px; }
.lt-tutor__s span {
  background: var(--lt-green);
  color: #fff;
  font-size: 14.5px;
  line-height: 1.5;
  padding: 9px 13px;
  border-radius: 15px;
  border-bottom-right-radius: 5px;
  max-width: 82%;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.lt-tutor__away {
  display: flex;
  align-items: center;
  gap: 7px;
  justify-content: center;
  width: fit-content;
  margin: 4px auto 15px;
  font-size: 12px;
  font-weight: 600;
  color: var(--lt-amber-ink);
  background: var(--lt-amber-bg);
  border: 1px solid var(--lt-amber-line);
  border-radius: 999px;
  padding: 7px 14px;
  text-align: center;
}
.lt-tutor__pending {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 13px;
  color: var(--lt-amber-ink);
  background: var(--lt-amber-bg);
  border: 1px solid var(--lt-amber-line);
  border-radius: 12px;
  padding: 11px 14px;
  margin: 2px 0 14px;
}
.lt-tutor__forks { display: flex; flex-wrap: wrap; gap: 8px; margin: 2px 0 14px; }
.lt-tutor__fork {
  font-family: var(--font-body, "Inter", system-ui, sans-serif);
  font-size: 13px;
  font-weight: 500;
  color: var(--lt-green-deep);
  background: #fff;
  border: 1px solid var(--lt-green-line);
  border-radius: 999px;
  padding: 8px 14px;
  cursor: pointer;
}
.lt-tutor__fork:hover { background: var(--lt-green-tint); }
.lt-tutor__typing { display: flex; gap: 5px; padding: 4px 2px 12px; }
.lt-tutor__typing span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--lt-faint);
  animation: lt-tutor-bounce 1.2s infinite ease-in-out;
}
.lt-tutor__typing span:nth-child(2) { animation-delay: 0.15s; }
.lt-tutor__typing span:nth-child(3) { animation-delay: 0.3s; }
@keyframes lt-tutor-bounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
  30% { transform: translateY(-4px); opacity: 1; }
}
.lt-tutor__err {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 13.5px;
  color: hsl(4, 60%, 42%);
  background: hsl(4, 70%, 97%);
  border: 1px solid hsl(4, 60%, 90%);
  border-radius: 10px;
  padding: 10px 13px;
  margin: 2px 0 12px;
}
.lt-tutor__retry {
  font-family: var(--font-body, "Inter", system-ui, sans-serif);
  font-size: 12.5px;
  font-weight: 600;
  color: var(--lt-green-deep);
  background: #fff;
  border: 1px solid var(--lt-green-line);
  border-radius: 8px;
  padding: 5px 11px;
  cursor: pointer;
}
.lt-tutor__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
  padding: 8px clamp(14px, 4vw, 40px) 0;
  max-width: 860px;
  width: 100%;
  margin: 0 auto;
  flex: none;
}
.lt-tutor__action {
  font-family: var(--font-body, "Inter", system-ui, sans-serif);
  font-size: 12.5px;
  font-weight: 600;
  color: var(--lt-green-deep);
  background: var(--lt-green-tint);
  border: 1px solid var(--lt-green-line);
  border-radius: 10px;
  padding: 8px 14px;
  cursor: pointer;
}
.lt-tutor__action:hover { background: #fff; border-color: var(--lt-green); }
.lt-tutor__composer {
  padding: 10px clamp(14px, 4vw, 40px) 12px;
  border-top: 1px solid var(--lt-line);
  flex: none;
  max-width: 860px;
  width: 100%;
  margin: 0 auto;
}
.lt-tutor__cbar {
  display: flex;
  align-items: center;
  gap: 9px;
  background: var(--lt-bg);
  border: 1px solid var(--lt-line);
  border-radius: 14px;
  padding: 6px 7px 6px 14px;
}
.lt-tutor__cbar:focus-within { border-color: var(--lt-green-line); background: #fff; }
.lt-tutor__input {
  flex: 1;
  border: none;
  background: transparent;
  font-family: var(--font-body, "Inter", system-ui, sans-serif);
  font-size: 14px;
  color: var(--lt-ink);
  outline: none;
}
.lt-tutor__input::placeholder { color: var(--lt-faint); }
.lt-tutor__send {
  flex: none;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: none;
  background: var(--lt-green);
  color: #fff;
  font-size: 17px;
  line-height: 1;
  cursor: pointer;
}
.lt-tutor__send:disabled { opacity: 0.45; cursor: default; }
.lt-tutor__foot { font-size: 10.5px; color: var(--lt-faint); text-align: center; margin-top: 7px; }
.lt-tutor__panel {
  flex: none;
  width: 320px;
  border-left: 1px solid var(--lt-line);
  background: var(--lt-bg);
  transition: width 0.2s ease;
}
.lt-tutor__panel--closed { width: 0; border-left: none; overflow: hidden; }

/* KaTeX: keep long display math from forcing a horizontal page scroll on mobile. */
.lt-tutor__t .katex-display { overflow-x: auto; overflow-y: hidden; margin: 0.4em 0; }

/* Mobile reflow — pure CSS, no JS width branch. The explanation panel (Stage 3)
   overlays instead of splitting; the chat stays full-viewport. */
@media (max-width: 1023px) {
  .lt-tutor__stream { padding: 16px 16px 8px; }
  .lt-tutor__composer { padding: 10px 16px 12px; }
  .lt-tutor__actions { padding: 8px 16px 0; }
  .lt-tutor__panel {
    position: absolute;
    inset: 0;
    width: 100%;
    border-left: none;
    z-index: 6;
    transform: translateY(0);
  }
  .lt-tutor__panel--closed { width: 100%; transform: translateY(101%); }
  .lt-tutor__lang-lbl { display: none; }
}
`;
