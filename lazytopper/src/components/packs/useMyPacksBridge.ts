/**
 * useMyPacksBridge - BRIDGE-PANEL-1. The two READS behind the My packs "Get your papers marked" panel. Nothing is written.
 *   - records: this device's session-record mirror at once (no network), then ONE cloud read of the student's own records
 *     (`getSessionRecordsFromCloud`, the read Home's "papers waiting" already makes once per tab);
 *   - allowance: ONE GET /api/usage/limits (the server's own per-kind first-free flags), only while the limits client is on.
 *     Any failure -> null, and the panel then shows no status words (never a promise the server did not make).
 */
import { useEffect, useState } from "react";
import type { AuthUser } from "../../context/AuthContext";
import { getSessionRecordsFromCloud, loadLocalSessionRecords, type SessionRecord } from "../../services/sessionRecords";
import { LIMITS_ENDPOINT, MINT_TIMEOUT_MS, isLimitsClientEnabled } from "../../services/limitsClient";
import { paidJsonHeaders } from "../../ai/paidCallHeaders";
import { parseGradeAllowance, type GradeAllowance } from "./myPacksBridgeModel";

function realUid(user: Pick<AuthUser, "uid" | "isLocalSession"> | null | undefined): string | null {
  const uid = user?.uid;
  if (!uid || user?.isLocalSession || uid === "anonymous") return null;
  return uid;
}

/** One read-only GET of the caller's limits summary. Never throws; null on anything but a clean 200. */
export async function readGradeAllowance(): Promise<GradeAllowance | null> {
  if (!isLimitsClientEnabled()) return null;
  const ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = setTimeout(() => ctl?.abort(), MINT_TIMEOUT_MS);
  try {
    const headers = await paidJsonHeaders();
    if (!headers["X-Lazytopper-Uid"]) return null;
    const res = await fetch(LIMITS_ENDPOINT, { method: "GET", headers, ...(ctl ? { signal: ctl.signal } : {}) });
    if (!res.ok) return null;
    return parseGradeAllowance(JSON.parse(await res.text()));
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function useMyPacksBridge(user: Pick<AuthUser, "uid" | "isLocalSession"> | null | undefined): {
  records: SessionRecord[];
  allowance: GradeAllowance | null;
} {
  const uid = realUid(user);
  const [records, setRecords] = useState<SessionRecord[]>(() => (uid ? loadLocalSessionRecords(uid) : []));
  const [allowance, setAllowance] = useState<GradeAllowance | null>(null);
  useEffect(() => {
    let live = true;
    if (!uid) {
      setRecords([]);
      setAllowance(null);
      return undefined;
    }
    setRecords(loadLocalSessionRecords(uid));
    void getSessionRecordsFromCloud(uid)
      .then((all) => {
        if (live && Array.isArray(all)) setRecords(all);
      })
      .catch(() => {
        /* the device mirror stays */
      });
    void readGradeAllowance().then((a) => {
      if (live) setAllowance(a);
    });
    return () => {
      live = false;
    };
  }, [uid]);
  return { records, allowance };
}
