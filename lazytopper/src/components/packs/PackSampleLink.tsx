import { useState } from "react";
import { Link } from "react-router-dom";
import { packSampleFor, packSampleHref, PACK_SAMPLE_LINK_TEXT, type PackSampleSurface } from "../../lib/packs/packSamples";
import { trackPackSampleDownload } from "../../lib/packs/packAnalytics";
import { BUNDLE_NAME } from "../../lib/packs/packLabels";
import { packPayLabel, subjectLabel, type PackSku, type PackSubject } from "../../services/packs";
import "./packSampleLink.css";

/**
 * PackSampleLink - the "Free sample page" link beside a pack's Buy button (PACK-SAMPLE-1, owner ruling 2 Nov 2026).
 *
 * A plain same-origin link to ONE pre-generated sample page under /samples/ (see lib/packs/packSamples.ts): no sign-up, no
 * account, no server call, and nothing here can reach a full pack. It is deliberately SECONDARY to the Buy button: a text link,
 * not a filled button. Tapping it saves the PDF (the `download` attribute) and sends `pack_sample_download` { pack, surface }.
 * `target` is a subject ("maths" | "science"), a chapter slug (Chapter Pack) or ignored (the bundle). Renders nothing when the
 * pack has no sample, so a new pack can never show a dead link.
 */
export interface PackSampleLinkProps {
  sku: PackSku;
  target?: string | null;
  surface: PackSampleSurface;
  /** `on-dark` for the navy CBQ band. */
  tone?: "light" | "on-dark";
  /** Replaces the default "Free sample page" text (e.g. "Maths" inside a Maths / Science pair, or "Free sample page (Maths)"). */
  label?: string;
  /** PACKS-CONVERT-1: told after the tap (after `pack_sample_download`), so the caller can show the "Liked the sample?" buy button. */
  onTapped?: () => void;
}

export default function PackSampleLink({ sku, target, surface, tone = "light", label, onTapped }: PackSampleLinkProps) {
  const sample = packSampleFor(sku, target);
  if (!sample) return null;
  return (
    <a
      className={tone === "on-dark" ? "lt-psl lt-psl--dark" : "lt-psl"}
      href={packSampleHref(sample)}
      download={`${sample.id}.pdf`}
      target="_blank"
      rel="noopener"
      onClick={() => {
        trackPackSampleDownload(`${sample.sku}:${sample.target}`, surface);
        onTapped?.();
      }}
      data-testid={`pack-sample-${sample.id}`}
      data-surface={surface}
    >
      <span className="lt-psl__icon" aria-hidden="true">&#8681;</span>
      {label ?? PACK_SAMPLE_LINK_TEXT}
      <span className="lt-psl__sr"> (PDF, one page, no sign-up needed)</span>
    </a>
  );
}

/**
 * PACKS-CONVERT-1 (owner, 3 Nov 2026: 42 sample downloads -> 13 checkouts) - the buy step right after a free sample. Where the
 * shop is on the page (/packs, /pricing) it is `{ onBuy }`: the SAME one-tap buy as the tile's Buy (PacksShopApi.buyNow /
 * chooseChapter, which send `pack_checkout` with `from: "sample"`). Where it is not (/cbq-class-10) it is `{ href }`: the
 * one-tap checkout link (`/packs?buy=…&from=sample`); NO event here - /packs sends the one `pack_checkout` { from: "sample" } when it
 * resumes that link (review fix 2: one tap, one event). null = nothing to sell. Names and prices only from the pack constants.
 */
export type SampleBuy = { onBuy: () => void; blocked?: boolean } | { href: string };

/** "Maths CBQ Pack", "Science Mock Pack", "Maths + Science Bundle", "Chapter Pack" (no chapter chosen yet). */
export function sampleBuyName(sku: PackSku, subject?: PackSubject | null): string {
  const s = subject ? `${subjectLabel(subject)} ` : "";
  switch (sku) {
    case "pack_bundle":
      return BUNDLE_NAME;
    case "pack_chapter":
      return "Chapter Pack";
    case "pack_mock":
      return `${s}Mock Pack`;
    case "pack_subject":
      return `${s}Subject Pack`;
    case "pack_cbq":
      return `${s}CBQ Pack`;
  }
}

export function sampleBuyLabel(sku: PackSku, subject?: PackSubject | null): string {
  // GST-EXCL-1: a buy link names the amount CHARGED (base + GST from 7 Nov 2026).
  return `Liked the sample? Get the ${sampleBuyName(sku, subject)} \u00b7 ${packPayLabel(sku)}`;
}

export function SampleBuyNext({ sku, subject, buy, tone = "light" }: { sku: PackSku; subject?: PackSubject | null; buy: SampleBuy; tone?: "light" | "on-dark" }) {
  const cls = tone === "on-dark" ? "lt-psb lt-psb--dark" : "lt-psb";
  const label = sampleBuyLabel(sku, subject);
  const testId = `sample-buy-${sku}${subject && sku !== "pack_bundle" ? `-${subject}` : ""}`;
  if ("href" in buy) {
    return (
      <Link className={cls} to={buy.href} data-testid={testId}>
        {label}
      </Link>
    );
  }
  return (
    <button type="button" className={cls} onClick={buy.onBuy} disabled={buy.blocked} aria-disabled={buy.blocked} data-testid={testId}>
      {label}
    </button>
  );
}

/**
 * PackSampleChoice - for a tile that has no subject yet (the /packs and /pricing tiles): "Free sample: Maths . Science", two links,
 * each opening its own subject's PDF. The bundle has ONE sample (Maths), so it is a single honestly labelled link instead.
 */
export function PackSampleChoice({ sku, surface, buy }: { sku: PackSku; surface: PackSampleSurface; buy?: (subject: PackSubject | null) => SampleBuy | null }) {
  // PACKS-CONVERT-1: which sample was tapped ("all" = the bundle's one sample); the buy button for THAT pack follows it.
  const [tapped, setTapped] = useState<PackSubject | "all" | null>(null);
  const subject = tapped === "maths" || tapped === "science" ? tapped : null;
  const action = tapped && buy ? buy(subject) : null;
  const next = action ? <SampleBuyNext sku={sku} subject={sku === "pack_chapter" ? null : subject} buy={action} /> : null;
  if (sku === "pack_bundle") {
    return (
      <>
        <PackSampleLink sku={sku} surface={surface} label={`${PACK_SAMPLE_LINK_TEXT} (Maths)`} onTapped={() => setTapped("all")} />
        {next}
      </>
    );
  }
  return (
    <>
      <div className="lt-psl-pair" data-testid={`pack-sample-choice-${sku}`}>
        <span className="lt-psl-pair__cap">Free sample:</span>
        <PackSampleLink sku={sku} target="maths" surface={surface} label="Maths" onTapped={() => setTapped("maths")} />
        <span className="lt-psl-pair__dot" aria-hidden="true">&middot;</span>
        <PackSampleLink sku={sku} target="science" surface={surface} label="Science" onTapped={() => setTapped("science")} />
      </div>
      {next}
    </>
  );
}
