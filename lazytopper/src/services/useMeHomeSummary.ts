// src/services/useMeHomeSummary.ts
//
// MI-HOME-SYNC — the React side of services/meHomeSummary. The read module (and the shared read
// model behind it) is loaded ON DEMAND, so Home's and Quick Practice's chunks do not carry it; a
// failed load or read is an honest "error" (the caller keeps today's empty state), never a guess.

import { useEffect, useRef, useState } from "react";
import type { DesktopSubject } from "../lib/desktop/navigation";
import type { MeHomeRead, MeHomeReader, MeHomeRow } from "./meHomeSummary";

export type MeHomeStatus = "idle" | "loading" | "ok" | "error";

/** Home + sidebar: Me's paper and Me's numbers for the signed-in uid (null uid → idle). */
export function useMeHome(
  uid: string | null,
  gen = 0,
  reader?: MeHomeReader,
): { status: MeHomeStatus; read: MeHomeRead | null } {
  const [state, setState] = useState<{ status: MeHomeStatus; read: MeHomeRead | null }>({ status: "idle", read: null });
  // The reader is the same `readStudyModel` call every render; held in a ref so it never re-reads.
  const readerRef = useRef(reader);
  readerRef.current = reader;
  useEffect(() => {
    if (!uid) {
      setState({ status: "idle", read: null });
      return;
    }
    let cancelled = false;
    setState((prev) => ({ status: "loading", read: prev.read }));
    void (async () => {
      try {
        const { loadMeHome } = await import("./meHomeSummary");
        const read = await loadMeHome(uid, gen, readerRef.current);
        if (!cancelled) setState({ status: "ok", read });
      } catch {
        if (!cancelled) setState({ status: "error", read: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, gen]);
  return state;
}

/** Quick Practice: Me's concept rows for one paper (null uid → idle, no read). */
export function useMeConceptRows(
  uid: string | null,
  paper: DesktopSubject,
  gen = 0,
): { status: MeHomeStatus; rows: MeHomeRow[] } {
  const [state, setState] = useState<{ status: MeHomeStatus; rows: MeHomeRow[] }>({ status: "idle", rows: [] });
  useEffect(() => {
    if (!uid) {
      setState({ status: "idle", rows: [] });
      return;
    }
    let cancelled = false;
    setState({ status: "loading", rows: [] });
    void (async () => {
      try {
        const { loadMeConceptRows } = await import("./meHomeSummary");
        const rows = await loadMeConceptRows(uid, paper, gen);
        if (!cancelled) setState({ status: "ok", rows });
      } catch {
        if (!cancelled) setState({ status: "error", rows: [] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, paper, gen]);
  return state;
}
