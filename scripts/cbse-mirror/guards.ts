/**
 * guards — C4. A downloaded candidate replaces the live mirror copy ONLY IF EVERY
 * guard below passes. Each guard has a name, and a failure reports the name, because
 * the "rejected update" issue (C5) must say which one fired.
 *
 * ★ WHY THESE AND NOT A FIRST-PAGE TEXT CHECK (owner ruling, spec C4). Reading a
 * PDF's first page needs a PDF library this repo does not have, and adding one moves
 * the lockfile that #810 holds. These checks replace it and need nothing but node.
 *
 * ⚠ THE PAGE-MARKER GUARD HAD TO LEARN ABOUT OBJECT STREAMS, AND THAT WAS MEASURED,
 * NOT GUESSED. The spec's check is "a PDF contains at least one `/Type /Page`". On
 * 2026-09-26 the live `CFPQ_Science10.pdf` (22,067,517 bytes, a perfectly good PDF)
 * contained ZERO raw `/Type /Page` markers: PDF 1.5+ may store every page dictionary
 * inside a compressed `/ObjStm` object stream. A raw-bytes-only check would have
 * rejected that paper forever and opened a "rejected update" issue every morning.
 * So when the raw scan finds nothing, the Flate-compressed object streams are
 * inflated with `node:zlib` (no dependency) and scanned too — the same file then
 * yields 145 page markers. A file with neither is still rejected.
 */
import { constants, inflateSync } from "node:zlib";

import type { MirrorPaper } from "./papers";

export type GuardName =
  | "magic-bytes"
  | "min-size"
  | "size-ratio"
  | "subject-token"
  | "session-year"
  | "last-modified"
  | "pdf-page";

export const MIN_BYTES = 50_000;
export const RATIO_MIN = 0.33;
export const RATIO_MAX = 3;

/** What the mirror knows about the copy it is currently serving. */
export type LiveCopy = {
  readonly bytes: number;
  readonly sessionYear: string | null;
  readonly lastModified: string | null;
};

export type Candidate = {
  readonly url: string;
  readonly body: Uint8Array;
  readonly lastModified: string | null;
};

export type GuardOptions = {
  /** C7: a next-session candidate must be STRICTLY later, not merely not-earlier. */
  readonly requireLaterSession?: boolean;
};

export type GuardResult = { readonly pass: boolean; readonly failed: readonly GuardName[] };

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04]; // PK\x03\x04

function startsWith(body: Uint8Array, magic: readonly number[]): boolean {
  if (body.length < magic.length) return false;
  return magic.every((byte, i) => body[i] === byte);
}

export function hasMagic(body: Uint8Array, kind: MirrorPaper["kind"]): boolean {
  return startsWith(body, kind === "pdf" ? PDF_MAGIC : ZIP_MAGIC);
}

function basenameOf(url: string): string {
  let pathname = url;
  try {
    pathname = new URL(url).pathname;
  } catch {
    // Not absolute — use as-is.
  }
  const last = pathname.split("/").pop() ?? "";
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}

function pathnameOf(url: string): string {
  try {
    return decodeURIComponent(new URL(url).pathname);
  } catch {
    return url;
  }
}

/**
 * The subject a URL's FILENAME names. `HomeScience-SQP.pdf` and
 * `SocialScience-SQP.pdf` both contain "Science" and name different subjects, and the
 * 2026-27 SQP index links both right next to `Science-SQP.pdf` — so they are
 * classified first, as "other".
 */
export function subjectOfUrl(url: string): MirrorPaper["subject"] | "other" | null {
  const name = basenameOf(url).toLowerCase();
  if (/(home|social)[-_ ]?science/.test(name)) return "other";
  if (/scien/.test(name)) return "science";
  if (/math/.test(name)) return "maths";
  return null;
}

/**
 * The session a URL names, from its path: `ClassX_2025_26/` → "2025-26",
 * `..._2026-27.pdf` → "2026-27", `model-answer/2025/X/` → "2025". A pair is accepted
 * only when the second half really is the next year, so `2026_01` (a date) is not a
 * session.
 */
export function parseSessionYear(url: string): string | null {
  const path = pathnameOf(url);
  for (const match of path.matchAll(/(?<!\d)(20\d\d)[-_](\d\d)(?!\d)/g)) {
    const first = Number(match[1]);
    const second = Number(match[2]);
    if ((first + 1) % 100 === second) return `${match[1]}-${match[2]}`;
  }
  const single = path.match(/(?<!\d)(20\d\d)(?!\d)/);
  return single ? single[1] : null;
}

/**
 * A comparable number for a session string. "2025-26" → 2025. A bare exam year
 * "2025" belongs to the 2024-25 session, so it maps to 2024 — which keeps the two
 * forms comparable if CBSE ever switches a paper from one naming to the other.
 */
export function sessionKey(session: string | null | undefined): number | null {
  if (!session) return null;
  const pair = session.match(/^(20\d\d)-\d\d$/);
  if (pair) return Number(pair[1]);
  const single = session.match(/^(20\d\d)$/);
  if (single) return Number(single[1]) - 1;
  return null;
}

const PAGE_MARKER = /\/Type\s*\/Page(?![A-Za-z])/;
const MAX_INFLATED_BYTES = 256 * 1024 * 1024;
const MAX_STREAMS_SCANNED = 20_000;

/** At least one page dictionary, raw or inside a Flate-compressed object stream. */
export function pdfHasPage(body: Uint8Array): boolean {
  const buf = Buffer.from(body.buffer, body.byteOffset, body.byteLength);
  const text = buf.toString("latin1");
  if (PAGE_MARKER.test(text)) return true;

  const streamStart = /stream\r?\n/g;
  let inflated = 0;
  let scanned = 0;
  let match: RegExpExecArray | null;
  while ((match = streamStart.exec(text)) !== null && scanned < MAX_STREAMS_SCANNED) {
    const at = match.index;
    if (text.slice(Math.max(0, at - 3), at) === "end") continue; // "endstream"
    scanned += 1;
    const objAt = text.lastIndexOf("obj", at);
    const dict = text.slice(Math.max(objAt < 0 ? 0 : objAt, at - 4096), at);
    const start = at + match[0].length;
    const end = text.indexOf("endstream", start);
    if (end < 0) break;
    streamStart.lastIndex = end;
    if (!/\/ObjStm/.test(dict) || !/\/FlateDecode/.test(dict)) continue;
    try {
      const out = inflateSync(buf.subarray(start, end), {
        finishFlush: constants.Z_SYNC_FLUSH,
      });
      inflated += out.length;
      if (PAGE_MARKER.test(out.toString("latin1"))) return true;
    } catch {
      // A corrupt stream proves nothing either way; keep looking.
    }
    if (inflated > MAX_INFLATED_BYTES) break;
  }
  return false;
}

function laterThan(a: string, b: string): boolean | null {
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return null;
  return ta > tb;
}

/**
 * C4 — every guard, evaluated independently so a rejection names ALL that failed.
 * `live` is null on the first seed, which skips the guards that compare against it
 * (size ratio, session year, Last-Modified).
 */
export function evaluateCandidate(
  paper: Pick<MirrorPaper, "kind" | "subject">,
  candidate: Candidate,
  live: LiveCopy | null,
  options: GuardOptions = {},
): GuardResult {
  const failed: GuardName[] = [];
  const size = candidate.body.length;

  if (!hasMagic(candidate.body, paper.kind)) failed.push("magic-bytes");

  if (size < MIN_BYTES) failed.push("min-size");

  if (live && live.bytes > 0) {
    const ratio = size / live.bytes;
    // CA-1 (owner ruling, AUDIT HOLD on #824): a C7 NEW-SESSION candidate skips the 3x
    // UPPER bound only — a new session's paper is a different document, and the real
    // 2026-27 Maths Standard SQP is 5.9x its 2025-26 predecessor. The 0.33x lower bound
    // still applies to it, and a same-session update keeps the 3x ceiling.
    const skipCeiling = options.requireLaterSession === true;
    if (ratio < RATIO_MIN || (!skipCeiling && ratio > RATIO_MAX)) failed.push("size-ratio");
  }

  if (subjectOfUrl(candidate.url) !== paper.subject) failed.push("subject-token");

  if (live) {
    const liveKey = sessionKey(live.sessionYear);
    const candidateKey = sessionKey(parseSessionYear(candidate.url));
    if (liveKey !== null) {
      if (candidateKey === null) failed.push("session-year");
      else if (options.requireLaterSession ? candidateKey <= liveKey : candidateKey < liveKey) {
        failed.push("session-year");
      }
    } else if (options.requireLaterSession && candidateKey === null) {
      failed.push("session-year");
    }
  }

  if (live?.lastModified && candidate.lastModified) {
    if (laterThan(candidate.lastModified, live.lastModified) === false) {
      failed.push("last-modified");
    }
  }

  if (paper.kind === "pdf" && !pdfHasPage(candidate.body)) failed.push("pdf-page");

  return { pass: failed.length === 0, failed };
}
