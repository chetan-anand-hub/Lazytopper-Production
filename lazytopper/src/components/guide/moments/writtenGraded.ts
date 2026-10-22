/**
 * MOMENTS-1 M11 — "has this account EVER had a written answer graded?" Local rows first (no
 * network: any written-surface record on this device is the answer), then the SERVER
 * (./writtenGradedCloud.ts), asked once per uid per tab and shared by every reader. "loading" until a
 * server answer; a failed read stays "loading" — the M11 nudge then never shows.
 */
import { useEffect, useMemo, useState } from "react";
import { loadLocalSessionRecords } from "../../../services/sessionRecords";
import { WRITTEN_GRADED_SURFACES, cloudHasWrittenGraded } from "./writtenGradedCloud";

export type WrittenGraded = "loading" | "none" | "some";

const kept = new Map<string, boolean>();
const inFlight = new Map<string, Promise<boolean | null>>();

export function resetWrittenGradedForTests(): void {
  kept.clear();
  inFlight.clear();
}

function askOnce(uid: string): Promise<boolean | null> {
  const k = kept.get(uid);
  if (k !== undefined) return Promise.resolve(k);
  const p = inFlight.get(uid);
  if (p) return p;
  const ask = cloudHasWrittenGraded(uid).then((has) => {
    inFlight.delete(uid);
    if (has !== null) kept.set(uid, has);
    return has;
  });
  inFlight.set(uid, ask);
  return ask;
}

function localSays(uid: string): boolean {
  const written = new Set<string>(WRITTEN_GRADED_SURFACES);
  return loadLocalSessionRecords(uid).some((r) => written.has(String(r.surface)));
}

export function useWrittenGraded(uid: string | null | undefined): WrittenGraded {
  const local = useMemo(() => (uid ? localSays(uid) : false), [uid]);
  const [asked, setAsked] = useState<{ uid: string; has: boolean } | null>(null);
  useEffect(() => {
    if (!uid || local) return;
    let live = true;
    void askOnce(uid).then((has) => {
      if (live && has !== null) setAsked({ uid, has });
    });
    return () => {
      live = false;
    };
  }, [uid, local]);
  if (!uid) return "loading";
  if (local) return "some";
  if (!asked || asked.uid !== uid) return "loading";
  return asked.has ? "some" : "none";
}
