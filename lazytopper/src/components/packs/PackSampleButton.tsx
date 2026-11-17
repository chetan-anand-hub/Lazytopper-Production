import { useState } from "react";
import { packSampleFor, packSampleHref, PACK_SAMPLE_LINK_TEXT, type PackSampleSurface } from "../../lib/packs/packSamples";
import { trackPackSampleDownload } from "../../lib/packs/packAnalytics";
import type { PackSku, PackSubject } from "../../services/packs";
import { SampleBuyNext, type SampleBuy } from "./PackSampleLink";
import WhatsAppSampleOptIn from "../whatsapp/WhatsAppSampleOptIn";
import "./packSampleButton.css";

/**
 * PackSampleButton - SAMPLE-FOLLOWUP-1 (owner, 4 Nov 2026): inside the pack window the free sample is a clear SECOND choice next to
 * Buy: a full-width outlined button, the same height as Buy's neighbours, never louder than the filled green Buy. Same file, same
 * `download`, same `pack_sample_download` event as PackSampleLink (which stays the quiet text link on the tiles). Renders nothing when
 * the pack has no sample. No sign-up, no account.
 *
 * SAMPLE-DIALOG-BUY-1: when the host passes `buy` (the SAME action as the Buy above), a tap on the sample also shows the
 * "Liked the sample? Get the <Pack> · price" button (SampleBuyNext, as PackSampleLink's hosts do), under the sample and above the
 * WhatsApp line, for THAT sample only. VITE_SAMPLE_DIALOG_BUY_DISABLED=1 -> never shown (today's render).
 */
export function isSampleDialogBuyKilled(): boolean {
  try {
    return /^(1|true|on|yes)$/i.test(String(import.meta.env.VITE_SAMPLE_DIALOG_BUY_DISABLED ?? "").trim());
  } catch {
    return false;
  }
}

export default function PackSampleButton({ sku, target, surface, buy = null }: { sku: PackSku; target?: string | null; surface: PackSampleSurface; buy?: SampleBuy | null }) {
  // The id of the sample that was tapped: switching chapter / subject hides the follow-up until that sample is tapped.
  const [tappedId, setTappedId] = useState<string | null>(null);
  const sample = packSampleFor(sku, target);
  if (!sample) return null;
  const subject: PackSubject | null = sku !== "pack_chapter" && (target === "maths" || target === "science") ? target : null;
  const next = buy && tappedId === sample.id && !isSampleDialogBuyKilled() ? <SampleBuyNext sku={sku} subject={subject} buy={buy} /> : null;
  return (
    <>
    <a
      className="lt-psbtn"
      href={packSampleHref(sample)}
      download={`${sample.id}.pdf`}
      target="_blank"
      rel="noopener"
      onClick={() => {
        trackPackSampleDownload(`${sample.sku}:${sample.target}`, surface);
        setTappedId(sample.id);
      }}
      data-testid={`pack-sample-${sample.id}`}
      data-surface={surface}
    >
      <span className="lt-psbtn__icon" aria-hidden="true">&#8681;</span>
      {PACK_SAMPLE_LINK_TEXT}
      <span className="lt-psbtn__sr"> (PDF, one page, no sign-up needed)</span>
    </a>
    {next}
    {/* WHATSAPP-OPTIN-1: the download above stays one tap and ungated; this line is a separate, collapsed choice. */}
    <WhatsAppSampleOptIn packId={`${sample.sku}:${sample.target}`} />
    </>
  );
}
