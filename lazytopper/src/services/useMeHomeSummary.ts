// src/services/useMeHomeSummary.ts
//
// MI-HOME-SYNC — the React side of services/meHomeSummary. The read module (and the shared read
// model behind it) is loaded ON DEMAND, so Home's and Quick Practice's chunks do not carry it; a
// failed load or read is an honest "error" (the caller keeps today's empty state), never a guess.
//
// State is KEYED by what was read (uid / gen / paper) and the visible status is DERIVED during
// render: an effect only ever sets state from its async read callback (no synchronous setState in
// an effect body), and a result for another key is never shown — a uid change shows "loading"
// with NO read (one student's numbers never appear under another uid); a gen bump for the SAME
// uid keeps the previous read on screen while the fresh one loads.

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { studyDataVersion, subscribeStudyData } from "./studyDataSignal";
import type { DesktopSubject } from "../lib/desktop/navigation";
import type { MeHomeRead, MeHomeReader, MeHomeRow } from "./meHomeSummary";

export type MeHomeStatus = "idle" | "loading" | "ok" | "error";

interface Keyed<T> {
  key: string;
  uid: string;
  status: MeHomeStatus;
  value: T;
}

const EMPTY_ROWS: MeHomeRow[] = [];

/** Home + sidebar: Me's paper and Me's numbers for the signed-in uid (null uid → idle). */
export function useMeHome(
  uid: string | null,
  gen = 0,
  reader?: MeHomeReader,
  /** MI-CONSISTENCY-1 — a change (the host's route) re-asks the memo: a read older than its
   *  60 s life is refreshed, a fresh one is served as is. Not part of the state key. */
  refresh?: string,
): { status: MeHomeStatus; read: MeHomeRead | null } {
  // MI-CONSISTENCY-1 — a write on this device (services/studyDataSignal) re-reads at once; the
  // previous read stays on screen (same key) until the fresh one lands — no loading flash.
  const dataVersion = useSyncExternalStore(subscribeStudyData, studyDataVersion, studyDataVersion);
  const [state, setState] = useState<Keyed<MeHomeRead | null> | null>(null);
  // The reader is the same `readStudyModel` call every render; held in a ref (synced after
  // render, before the read effect below runs) so a new closure never triggers a re-read.
  const readerRef = useRef(reader);
  useEffect(() => {
    readerRef.current = reader;
  });
  const key = uid ? `${uid}|${gen}` : "";
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    const k = `${uid}|${gen}`;
    void (async () => {
      try {
        const { loadMeHome } = await import("./meHomeSummary");
        const read = await loadMeHome(uid, gen, readerRef.current);
        if (!cancelled) setState({ key: k, uid, status: "ok", value: read });
      } catch {
        if (!cancelled) setState({ key: k, uid, status: "error", value: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, gen, dataVersion, refresh]);
  return useMemo(() => {
    if (!uid) return { status: "idle" as const, read: null };
    if (state && state.key === key) return { status: state.status, read: state.value };
    // Loading: keep the previous read only for the SAME uid (a gen bump), never across uids.
    return { status: "loading" as const, read: state && state.uid === uid ? state.value : null };
  }, [uid, key, state]);
}

/** Quick Practice: Me's concept rows for one paper (null uid → idle, no read). */
export function useMeConceptRows(
  uid: string | null,
  paper: DesktopSubject,
  gen = 0,
): { status: MeHomeStatus; rows: MeHomeRow[] } {
  const [state, setState] = useState<Keyed<MeHomeRow[]> | null>(null);
  const key = uid ? `${uid}|${paper}|${gen}` : "";
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    const k = `${uid}|${paper}|${gen}`;
    void (async () => {
      try {
        const { loadMeConceptRows } = await import("./meHomeSummary");
        const rows = await loadMeConceptRows(uid, paper, gen);
        if (!cancelled) setState({ key: k, uid, status: "ok", value: rows });
      } catch {
        if (!cancelled) setState({ key: k, uid, status: "error", value: EMPTY_ROWS });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, paper, gen]);
  return useMemo(() => {
    if (!uid) return { status: "idle" as const, rows: EMPTY_ROWS };
    if (state && state.key === key) return { status: state.status, rows: state.value };
    return { status: "loading" as const, rows: EMPTY_ROWS };
  }, [uid, key, state]);
}
