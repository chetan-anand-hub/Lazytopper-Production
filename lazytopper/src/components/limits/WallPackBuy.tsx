/**
 * WallPackBuy - PACKS-CONVERT-1 (owner, 3 Nov 2026: 31 students met the download wall in 30 days, a ready buying moment). The pack
 * that MATCHES the refused paper, as a one-tap buy (`/packs?buy=<sku>&t=<target>`: signed in -> Razorpay opens straight away), shown
 * under the Board Pass actions (the Board Pass stays first). Lazily loaded by DownloadLimitWall (its own chunk, with the pack
 * catalogue and the ownership read), only when a download wall is on screen.
 *
 * Never sells what the student has: the server's owned packs are read first (useOwnedPacks, the same read the sale-moment rows use).
 * While that read is in flight nothing shows; if it fails the wall shows its old generic packs link (when unsure, never sell a
 * specific pack). An owned match (directly, or through a Subject Pack / the Bundle) becomes "You own this pack - open My packs".
 * Owning a pack still makes its chapters' downloads not count: that is the server's mint (packOwned), untouched here.
 */
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { chapterFromLocation, firePackEntryClick, mockSubjectFromLocation } from "../../lib/packs/packEntry";
import { packChapterLabel } from "../../lib/packs/packLabels";
import { buyHrefFor } from "../packs/offersModel";
import { useOwnedPacks } from "../packs/useOwnedPacks";
import { PACK_CHAPTER_SLUGS, isAlreadyOwned, packPayLabel, subjectLabel, subjectOfChapter, type PackSku, type PackSubject } from "../../services/packs";
import type { DownloadCover } from "../../services/limitsClient";
import type { DownloadPaperHint } from "./DownloadLimitWall";
import type { DownloadKind } from "../../analytics/analytics";

export interface WallPackOffer {
  sku: PackSku;
  target: string;
  label: string;
  href: string;
  /** true when the paper's exact pack was not knowable and the subject's pack is offered instead. */
  fallback: boolean;
}

const CBQ_ADDRESS = /(?:^|[?&])(?:style=cbq|preset=comp|questionType=Competency)(?:&|$)/i;

/**
 * PURE. What the wall knows: the guard's cover (one chapter, a subject, or several chapters) and, for a practice set (no cover),
 * the page address.
 *   CBQ practice set (style=cbq / preset=comp / questionType=Competency) with a known subject -> that subject's CBQ Pack
 *   one known chapter                                -> that chapter's Chapter Pack
 *   a cover with a subject and NO chapters (a Full Mock), or a mock page address -> that subject's Mock Pack
 *   chapters (or unknown chapter slugs) of ONE known subject -> FALLBACK: that subject's Subject Pack
 *   nothing known (or chapters of both subjects)     -> null: the wall keeps its old "PDF packs from ₹49" link
 */
export function wallPackOffer(ctx: {
  cover?: DownloadCover | null;
  chapter?: string | null;
  pathname?: string;
  search?: string;
  /** WALL-KIND-1: what the download call site said it was (preferred over the page address, which stays the fallback). */
  kind?: DownloadKind | null;
  hint?: DownloadPaperHint | null;
}): WallPackOffer | null {
  const fromAddress = !ctx.cover;
  const raw = ctx.cover ? ctx.cover.chapters ?? [] : [ctx.chapter ?? chapterFromLocation(ctx.pathname ?? "", ctx.search ?? "")].filter((c): c is string => typeof c === "string");
  const chapters = raw.filter((c) => PACK_CHAPTER_SLUGS.includes(c));
  const subjects = new Set(chapters.map((c) => subjectOfChapter(c)).filter((x): x is PackSubject => x !== null));
  let addrSubject: PackSubject | null = null;
  if (fromAddress) {
    try {
      const v = new URLSearchParams(ctx.search ?? "").get("subject")?.toLowerCase();
      if (v === "maths" || v === "science") addrSubject = v;
    } catch {
      /* no subject */
    }
  }
  const hintSubject: PackSubject | null = ctx.hint?.subject === "maths" || ctx.hint?.subject === "science" ? ctx.hint.subject : null;
  const subject: PackSubject | null = ctx.cover?.subject ?? (subjects.size === 1 ? [...subjects][0] : null) ?? hintSubject ?? addrSubject;
  const offer = (sku: PackSku, target: string, name: string, fallback = false): WallPackOffer => ({
    sku,
    target,
    // GST-EXCL-1: a one-tap buy link names the amount CHARGED (base + GST from 7 Nov 2026).
    label: `Or get the ${name} · ${packPayLabel(sku)}`,
    href: buyHrefFor(sku, target),
    fallback,
  });
  // WALL-KIND-1: the call site's own word that this is a CBQ practice set beats reading the address.
  const kindCbq = ctx.kind === "practice-set" && ctx.hint?.cbq === true;
  if (fromAddress && subject && (kindCbq || CBQ_ADDRESS.test(ctx.search ?? ""))) return offer("pack_cbq", subject, `${subjectLabel(subject)} CBQ Pack`);
  if (raw.length === 1 && chapters.length === 1) return offer("pack_chapter", chapters[0], `${packChapterLabel(chapters[0])} Chapter Pack`);
  // Review fix 3: the Mock offer needs a paper with NO chapters at all (a raw empty cover), never chapters we could not read.
  const mockFromKind = ctx.kind === "full-mock" && raw.length === 0 ? ctx.cover?.subject ?? hintSubject ?? addrSubject : null;
  const mock = mockFromKind ?? (ctx.cover ? (raw.length === 0 ? ctx.cover.subject ?? null : null) : raw.length === 0 ? mockSubjectFromLocation(ctx.pathname ?? "", ctx.search ?? "") : null);
  if (mock) return offer("pack_mock", mock, `${subjectLabel(mock)} Mock Pack`);
  if (subject && subjects.size <= 1) return offer("pack_subject", subject, `${subjectLabel(subject)} Subject Pack`, true);
  return null;
}

export const WALL_OWNED_COPY = "You own this pack — open My packs";

/**
 * PACK-OWNER-GATES-1 (fix 5) - a CBQ practice set is not a pack product to the server (limits.cjs coverIsOwned: practice-set never
 * sends a cover), so a CBQ Pack owner can still meet this week's download limit on one. The bare "You own this pack" next to "you've used
 * this week's free download" read as a contradiction; this says why it helps, and is the wall's primary action for that student.
 */
export function wallCbqOwnedCopy(subject: PackSubject): string {
  return `Your ${subjectLabel(subject)} CBQ Pack has these questions — open My packs`;
}
export const WALL_MY_PACKS_HREF = "/packs#my-packs";

export default function WallPackBuy({ cover, chapter, light, fallback, kind = null, hint = null }: { cover: DownloadCover | null; chapter: string | null; light: boolean; fallback: ReactNode; kind?: DownloadKind | null; hint?: DownloadPaperHint | null }) {
  const location = useLocation();
  const { user } = useAuth();
  const uid = user && !user.isLocalSession ? user.uid : "";
  const offer = wallPackOffer({ cover, chapter, pathname: location.pathname, search: location.search, kind, hint });
  const owned = useOwnedPacks(uid, Boolean(offer));
  if (!offer) return <>{fallback}</>;
  if (owned.phase === "loading") return null;
  if (owned.phase === "error") return <>{fallback}</>;
  const cls = light ? "lt-limit-pack lt-limit-pack--light" : "lt-limit-pack";
  if (isAlreadyOwned(owned.packs, offer.sku, offer.target)) {
    if (offer.sku === "pack_cbq" && (offer.target === "maths" || offer.target === "science")) {
      return (
        <div className={cls} data-testid="wall-pack-owned" data-sku={offer.sku} data-cbq-owned="1">
          <Link className="lt-limit-btn lt-limit-btn--primary" to={WALL_MY_PACKS_HREF}>
            {wallCbqOwnedCopy(offer.target)}
          </Link>
        </div>
      );
    }
    return (
      <div className={cls} data-testid="wall-pack-owned" data-sku={offer.sku}>
        <Link className="lt-limit-btn lt-limit-btn--pack" to={WALL_MY_PACKS_HREF}>
          {WALL_OWNED_COPY}
        </Link>
      </div>
    );
  }
  return (
    <div className={cls} data-testid="wall-pack-buy" data-sku={offer.sku} data-fallback={offer.fallback ? "subject" : undefined}>
      <Link className="lt-limit-btn lt-limit-btn--pack" to={offer.href} onClick={() => firePackEntryClick("download_wall")}>
        {offer.label}
      </Link>
    </div>
  );
}
