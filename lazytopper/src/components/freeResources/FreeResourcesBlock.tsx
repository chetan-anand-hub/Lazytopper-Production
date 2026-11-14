import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import {
  FREE_ANCHOR_ID,
  FREE_RETURN_PATH,
  FREE_SIGN_IN_PATH,
  fetchFreeResources,
  formatBytes,
  requestFreeLink,
  startDownload,
  trackFreeResourceDownload,
  type FreeLinkFailure,
  type FreeList,
  type FreeResource,
  type FreeZip,
} from "../../services/freeResources";
import { isSafeInternalPath } from "../../utils/safeInternalPath";
import "./freeResources.css";

/**
 * FreeResourcesBlock - FREE-RES-1. "Free chapter practice" on /cbse/class-10: the free MCQ banks (and, later, notes), one row per chapter,
 * downloadable by any SIGNED-IN account (a signed-out visitor sees the same list and a "Sign in to download" button).
 *
 * ★ RENDERS NOTHING UNTIL THERE IS SOMETHING TO SHOW. The list is fetched after mount; an empty, absent or unreadable list renders null:
 *   no heading, no placeholder, no reserved box. That is also what the prerender capture freezes (its /api is unreachable), so this block
 *   does not change the committed /cbse/class-10 HTML. The block sits low on the page, below the first screen at 390 and 1440 px, so
 *   when the list arrives nothing the reader can see moves (CLS is measured in the lane report).
 * ★ useAuth LIVES IN THE INNER COMPONENT ON PURPOSE: the outer one (mounted by the page) needs no provider and stays inert on an empty
 *   list, so the page's own tests, which render it with no AuthProvider, are unaffected.
 * ★ ONE COMPONENT AT EVERY WIDTH, NO WIDTH HOOK: the rows reflow by CSS alone.
 */

const SUBJECTS = ["Maths", "Science"] as const;
const GROUP_OF: Record<"Maths" | "Science", "maths" | "science"> = { Maths: "maths", Science: "science" };

const FAILURE_COPY: Record<FreeLinkFailure, string> = {
  signed_out: "Please sign in again to download.",
  busy: "That is a lot of downloads in an hour. Please try again in a little while.",
  unavailable: "That file is not available right now. Please try again later.",
  timeout: "That took too long. Please try again.",
  network: "Could not reach LazyTopper. Check your connection and try again.",
  refused: "Could not prepare that download. Please try again.",
  bad_response: "Could not prepare that download. Please try again.",
};

function describe(r: FreeResource): string {
  if (r.kind === "kit") return `${r.pages} pages \u00b7 ${formatBytes(r.bytes)}`;
  if (r.kind === "notes") return `Chapter notes · ${r.pages} pages`;
  return r.questions ? `${r.questions} MCQs · worked solutions` : "MCQ practice · worked solutions";
}

export default function FreeResourcesBlock({ fetchList = fetchFreeResources }: { fetchList?: () => Promise<FreeList> }) {
  const [list, setList] = useState<FreeList | null>(null);
  useEffect(() => {
    let live = true;
    fetchList()
      .then((l) => {
        if (live) setList(l);
      })
      .catch(() => {
        /* the empty list: render nothing */
      });
    return () => {
      live = false;
    };
  }, [fetchList]);
  if (!list || list.resources.length === 0) return null;
  return <FreeResourcesList list={list} />;
}

function FreeResourcesList({ list }: { list: FreeList }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { hash } = useLocation();
  const sectionRef = useRef<HTMLElement | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [problem, setProblem] = useState<string>("");

  // The block did not exist when the browser looked for #free (it arrives after the fetch): land on it now.
  useEffect(() => {
    if (hash === `#${FREE_ANCHOR_ID}`) sectionRef.current?.scrollIntoView({ behavior: "auto", block: "start" });
  }, [hash]);

  const signedIn = !!user;
  const onPress = useCallback(
    async (id: string, kind: FreeResource["kind"] | "zip") => {
      if (!signedIn) {
        if (isSafeInternalPath(FREE_RETURN_PATH)) navigate(FREE_SIGN_IN_PATH);
        return;
      }
      setProblem("");
      setBusyId(id);
      const link = await requestFreeLink(id);
      setBusyId(null);
      if (!link.ok) {
        setProblem(FAILURE_COPY[link.reason]);
        return;
      }
      startDownload(link.url, link.filename);
      trackFreeResourceDownload(id, kind);
    },
    [signedIn, navigate],
  );

  const label = (busy: boolean, ready: string, signedOut = "Sign in to download"): string => (busy ? "Preparing…" : signedIn || loading ? ready : signedOut);
  const zipFor = (group: FreeZip["group"]): FreeZip | undefined => list.zips.find((z) => z.group === group);
  const everything = zipFor("all");
  const kit = list.resources.find((r) => r.kind === "kit");

  return (
    <section id={FREE_ANCHOR_ID} ref={sectionRef} className="lt-free" aria-labelledby="free-resources-h">
      <div className="lt-cbse__sh">
        <h2 id="free-resources-h">Free chapter practice</h2>
      </div>
      <p className="lt-cbse__lede">Every question is from the 2026-27 CBSE syllabus. Free with your LazyTopper account.</p>

      {kit && (
        <div className="lt-free__kit">
          <div className="lt-free__what">
            <span className="lt-free__kit-title">{kit.title}</span>
            <span className="lt-free__meta">{describe(kit)}</span>
          </div>
          <button type="button" className="lt-free__btn lt-free__btn--kit" disabled={busyId !== null} onClick={() => void onPress(kit.id, "kit")}>
            {label(busyId === kit.id, "Download the Excellence Kit", "Sign up free to download")}
          </button>
        </div>
      )}

      {SUBJECTS.map((subject) => {
        const rows = list.resources.filter((r) => r.kind !== "kit" && r.subject === subject);
        if (rows.length === 0) return null;
        const zip = zipFor(GROUP_OF[subject]);
        return (
          <div key={subject} className="lt-free__group">
            <div className="lt-free__ghead">
              <h3>{subject}</h3>
              {zip && (
                <button type="button" className="lt-free__btn lt-free__btn--ghost" disabled={busyId !== null} onClick={() => void onPress(zip.id, "zip")}>
                  {label(busyId === zip.id, `Download all ${subject} (ZIP)`)}
                </button>
              )}
            </div>
            <ul className="lt-free__list">
              {rows.map((r) => (
                <li key={r.id} className="lt-free__row">
                  <div className="lt-free__what">
                    <span className="lt-free__chapter">{r.chapter}</span>
                    <span className="lt-free__meta">
                      {describe(r)} &middot; {formatBytes(r.bytes)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="lt-free__btn"
                    disabled={busyId !== null}
                    onClick={() => void onPress(r.id, r.kind)}
                    aria-label={`${signedIn ? "Download" : "Sign in to download"}: ${r.title}`}
                  >
                    {label(busyId === r.id, "Download")}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      {everything && (
        <div className="lt-free__all">
          <button type="button" className="lt-free__btn lt-free__btn--wide" disabled={busyId !== null} onClick={() => void onPress(everything.id, "zip")}>
            {label(busyId === everything.id, "Download everything (ZIP)")}
          </button>
          <span className="lt-free__meta">
            {everything.count} files &middot; {formatBytes(everything.bytes)}
          </span>
        </div>
      )}
      <p className="lt-free__problem" role="status" aria-live="polite">
        {problem}
      </p>
    </section>
  );
}
