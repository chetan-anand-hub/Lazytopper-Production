import { packSampleFor, packSampleHref, PACK_SAMPLE_LINK_TEXT, type PackSampleSurface } from "../../lib/packs/packSamples";
import { trackPackSampleDownload } from "../../lib/packs/packAnalytics";
import type { PackSku } from "../../services/packs";
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
}

export default function PackSampleLink({ sku, target, surface, tone = "light" }: PackSampleLinkProps) {
  const sample = packSampleFor(sku, target);
  if (!sample) return null;
  return (
    <a
      className={tone === "on-dark" ? "lt-psl lt-psl--dark" : "lt-psl"}
      href={packSampleHref(sample)}
      download={`${sample.id}.pdf`}
      target="_blank"
      rel="noopener"
      onClick={() => trackPackSampleDownload(`${sample.sku}:${sample.target}`, surface)}
      data-testid={`pack-sample-${sample.id}`}
      data-surface={surface}
    >
      <span className="lt-psl__icon" aria-hidden="true">&#8681;</span>
      {PACK_SAMPLE_LINK_TEXT}
      <span className="lt-psl__sr"> (PDF, one page, no sign-up needed)</span>
    </a>
  );
}
