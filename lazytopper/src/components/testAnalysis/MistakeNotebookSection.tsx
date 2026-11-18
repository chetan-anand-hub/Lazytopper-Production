// src/components/testAnalysis/MistakeNotebookSection.tsx
//
// TS-ANALYSIS-1 — the Mistake notebook as a self-loading section for /test-series (signed-in only;
// the page lazy-loads it after auth, so the signed-out prerender is unchanged). Reads the student's
// own session records + per-question payloads; nothing is written.

import { useEffect, useState } from "react";
import { getAllSessionPerQuestionFromCloud, getSessionRecordsFromCloud } from "../../services/sessionRecords";
import { analyseHistory, tsAnalysisDisabled, type AnalysedQuestion } from "./testAnalysisModel";
import MistakeNotebook from "./MistakeNotebook";
import "./testAnalysis.css";

type Load = { status: "loading" } | { status: "error" } | { status: "ready"; rows: AnalysedQuestion[] };

export default function MistakeNotebookSection({ uid, returnTo }: { uid: string; returnTo: string }) {
  const disabled = tsAnalysisDisabled(import.meta.env.VITE_TS_ANALYSIS_DISABLED);
  const [load, setLoad] = useState<Load>({ status: "loading" });
  useEffect(() => {
    if (disabled) return;
    let live = true;
    setLoad({ status: "loading" });
    Promise.all([getSessionRecordsFromCloud(uid), getAllSessionPerQuestionFromCloud(uid)])
      .then(([records, payloads]) => live && setLoad({ status: "ready", rows: analyseHistory(records, payloads) }))
      .catch(() => live && setLoad({ status: "error" }));
    return () => {
      live = false;
    };
  }, [uid, disabled]);

  if (disabled) return null;
  return (
    <div className="lt-tsa lt-tsa--section">
      <div className="lt-tsa__card">
        {load.status === "loading" ? (
          <>
            <h2 className="lt-tsa__h">Mistake notebook</h2>
            <p className="lt-tsa__p">Reading your tests…</p>
          </>
        ) : load.status === "error" ? (
          <>
            <h2 className="lt-tsa__h">Mistake notebook</h2>
            <p className="lt-tsa__p">Your past tests could not be read right now. Try again later.</p>
          </>
        ) : (
          <MistakeNotebook rows={load.rows} returnTo={returnTo} startOpen />
        )}
      </div>
    </div>
  );
}
