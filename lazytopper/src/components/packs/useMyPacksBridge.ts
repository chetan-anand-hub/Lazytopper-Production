/**
 * BRIDGE-PANEL-1 (round 2) - the READS behind the My packs "Get your papers marked" panel, run ONCE before My packs is revealed so the
 * pack cards and the panel appear in ONE commit (no late growth, review #1645 B1). Nothing here writes.
 *   - records: this device's session-record mirror (no network) + ONE cloud query of only the student's PACK-paper records
 *     (`id` in the `PK-` range; not the whole collection), memoised per tab per account;
 *   - allowance: ONE GET /api/usage/limits (the server's own tier + per-kind first-free / remaining), only while the limits client is on;
 *   - entitlement: a paid Board Pass = the cached paid status, or the server's tier "premium"; when the server's tier is unknown,
 *     the existing cloud subscription hydration decides. "Unknown" never shows the Board Pass card.
 * Any failure -> that part is null (the panel then says less, never more).
 */
import type { AuthUser } from "../../context/AuthContext";
import { loadLocalSessionRecords, type SessionRecord } from "../../services/sessionRecords";
import { isFirestoreEnabled, withFirestore } from "../../services/firestoreSdk";
import { LIMITS_ENDPOINT, MINT_TIMEOUT_MS, isLimitsClientEnabled } from "../../services/limitsClient";
import { paidJsonHeaders } from "../../ai/paidCallHeaders";
import { hydrateSubscriptionFromCloud, isPaidPremium } from "../../services/subscriptionService";
import { parseGradeAllowance, type GradeAllowance } from "./myPacksBridgeModel";

export interface BridgeData {
  records: SessionRecord[];
  allowance: GradeAllowance | null;
  /** A paid Board Pass (no Board Pass card; every paper "with Board Pass"). */
  paidPass: boolean;
  /** The entitlement is KNOWN (server tier or a cloud-reconciled subscription). Unknown -> no Board Pass card, no view event. */
  entitlementKnown: boolean;
}

export function bridgeUid(user: Pick<AuthUser, "uid" | "isLocalSession"> | null | undefined): string | null {
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

const isRecordLike = (v: unknown): v is SessionRecord => {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return typeof r.id === "string" && r.id.startsWith("PK-") && typeof r.surface === "string" && typeof r.gradedAt === "number";
};

/** Per tab, per account: the one cloud query of the student's pack-paper records. A failed query is not kept (next mount asks again). */
const cloudMemo = new Map<string, Promise<SessionRecord[] | null>>();

/** Test seam. */
export function __resetBridgeReadsForTests(): void {
  cloudMemo.clear();
}

function readCloudPackRecords(uid: string): Promise<SessionRecord[] | null> {
  if (!isFirestoreEnabled()) return Promise.resolve(null);
  const hit = cloudMemo.get(uid);
  if (hit) return hit;
  const p = withFirestore(({ fs, db }) =>
    fs.getDocs(fs.query(fs.collection(db, "sessionRecords", uid, "records"), fs.where("id", ">=", "PK-"), fs.where("id", "<", "PK."))),
  )
    .then((snap) => snap.docs.map((d) => d.data()).filter(isRecordLike))
    .catch(() => {
      cloudMemo.delete(uid);
      return null;
    });
  cloudMemo.set(uid, p);
  return p;
}

/** The student's pack-paper records: this device's mirror plus the cloud query (another device's grades). Never throws. */
export async function readPackRecords(uid: string): Promise<SessionRecord[]> {
  const local = loadLocalSessionRecords(uid).filter(isRecordLike);
  const cloud = await readCloudPackRecords(uid);
  return cloud ? [...cloud, ...local] : local;
}

/** Everything the panel shows, read once. Never throws. */
export async function prepareBridgeData(
  user: Pick<AuthUser, "uid" | "isLocalSession"> | null | undefined,
  cachedPaidPass: boolean,
): Promise<BridgeData | null> {
  const uid = bridgeUid(user);
  if (!uid) return null;
  const [records, allowance] = await Promise.all([readPackRecords(uid).catch(() => [] as SessionRecord[]), readGradeAllowance()]);
  if (cachedPaidPass || allowance?.tier === "premium") return { records, allowance, paidPass: true, entitlementKnown: true };
  if (allowance && (allowance.tier === "free" || allowance.tier === "trial")) return { records, allowance, paidPass: false, entitlementKnown: true };
  // The server's tier is unknown (limits client off / read failed): the existing cloud hydration decides.
  try {
    const status = await hydrateSubscriptionFromCloud(uid);
    return { records, allowance, paidPass: isPaidPremium(status), entitlementKnown: true };
  } catch {
    return { records, allowance, paidPass: false, entitlementKnown: false };
  }
}
