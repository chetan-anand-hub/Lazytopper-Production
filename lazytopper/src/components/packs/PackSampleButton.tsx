import { packSampleFor, packSampleHref, PACK_SAMPLE_LINK_TEXT, type PackSampleSurface } from "../../lib/packs/packSamples";
import { trackPackSampleDownload } from "../../lib/packs/packAnalytics";
import type { PackSku } from "../../services/packs";
import "./packSampleButton.css";

/**
 * PackSampleButton - SAMPLE-FOLLOWUP-1 (owner, 4 Nov 2026): inside the pack window the free sample is a clear SECOND choice next to
 * Buy: a full-width outlined button, the same height as Buy's neighbours, never louder than the filled green Buy. Same file, same
 * `download`, same `pack_sample_download` event as PackSampleLink (which stays the quiet text link on the tiles). Renders nothing when
 * the pack has no sample. No sign-up, no account.
 */
export default function PackSampleButton({ sku, target, surface }: { sku: PackSku; target?: string | null; surface: PackSampleSurface }) {
  const sample = packSampleFor(sku, target);
  if (!sample) return null;
  return (
    <a
      className="lt-psbtn"
      href={packSampleHref(sample)}
      download={`${sample.id}.pdf`}
      target="_blank"
      rel="noopener"
      onClick={() => trackPackSampleDownload(`${sample.sku}:${sample.target}`, surface)}
      data-testid={`pack-sample-${sample.id}`}
      data-surface={surface}
    >
      <span className="lt-psbtn__icon" aria-hidden="true">&#8681;</span>
      {PACK_SAMPLE_LINK_TEXT}
      <span className="lt-psbtn__sr"> (PDF, one page, no sign-up needed)</span>
    </a>
  );
}
