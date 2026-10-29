import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { packPriceLabel, type PackSku } from "../../services/packs";
import { BUNDLE_NAME, CBQ_MIN_PER_SUBJECT, MOCKS_PER_SUBJECT } from "../../lib/packs/packLabels";
import { firePackEntryClick } from "../../lib/packs/packEntry";
import { usePaidPremium } from "../../lib/packs/usePaidPremium";
import "./parentPacks.css";

/**
 * ParentPacksSection - PARENTS-PACKS-1 (owner ruling 29 Oct 2026): /for-parents links to the printable PDF packs.
 * Placed right after the Board Pass answer (Board Pass stays first, packs second but visible). Paid Premium sees nothing
 * (same rule as PacksStrip). Prices come from the catalogue AFTER MOUNT, so the prerendered HTML carries no rupee figure.
 * Both links carry `from=for_parents` (the page's own return-link contract); `#cbq` still scrolls on /packs.
 */
export const PARENT_PACKS_HEADING = "Printable question banks: CBQ packs";
/** PARENTS-PACKS-2: the CBQ price rides in the heading AFTER mount ("₹199 per subject"); the static HTML has no rupee figure. */
export const PARENT_PACKS_HEADING_TAIL = "per subject";
export const PARENT_PACKS_LINE =
  "PDF packs your child practises on paper, with worked solutions to check against. One-time payment, never renews. The Board Pass (Premium) includes everything online.";
export const PARENT_BAND_HEADLINE = `Question banks parents ask for: ${CBQ_MIN_PER_SUBJECT.toLocaleString("en-IN")}+ board CBQs per subject`;
export const HERO_CBQ_LABEL = "CBQ question banks";
export const PACKS_CBQ_TO = "/packs?from=for_parents#cbq";
export const PACKS_ALL_TO = "/packs?from=for_parents";

const ITEMS: ReadonlyArray<{ sku: PackSku; name: string; what: string; cbq?: boolean }> = [
  { sku: "pack_cbq", name: "Maths CBQ Pack", what: `${CBQ_MIN_PER_SUBJECT.toLocaleString("en-IN")}+ competency questions`, cbq: true },
  { sku: "pack_cbq", name: "Science CBQ Pack", what: `${CBQ_MIN_PER_SUBJECT.toLocaleString("en-IN")}+ competency questions`, cbq: true },
  { sku: "pack_mock", name: "Mock Pack", what: `${MOCKS_PER_SUBJECT} board-pattern papers` },
  { sku: "pack_chapter", name: "Chapter Pack", what: "every question of one chapter" },
  { sku: "pack_bundle", name: BUNDLE_NAME, what: "all chapters and the mocks" },
];

/** usePaidPremium needs AuthProvider; the page's public tests/prerender may render without one -> treat as not paid (signed out). The throw happens at the hook's first call, so the hook order is stable. */
function useNotPaid(): boolean {
  try {
    return usePaidPremium();
  } catch {
    return false;
  }
}

function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

/** PARENTS-PACKS-2: the hero's secondary action (outlined, green accent). Price after mount; hidden for paid Premium. */
export function ParentPacksHeroLink() {
  const paid = useNotPaid();
  const mounted = useMounted();
  if (paid) return null;
  return (
    <Link className="lt-fpk__hero-link" to={PACKS_CBQ_TO} data-testid="fp-packs-hero" onClick={() => firePackEntryClick("for_parents")}>
      {HERO_CBQ_LABEL}
      {mounted ? ` \u00b7 ${packPriceLabel("pack_cbq")}` : ""}
    </Link>
  );
}

/** PARENTS-PACKS-2: the compact band directly under the hero. Hidden for paid Premium. */
export function ParentPacksBand() {
  const paid = useNotPaid();
  if (paid) return null;
  return (
    <section aria-labelledby="fp-band" className="lt-fpk-band" data-testid="fp-packs-band">
      <h2 id="fp-band" className="lt-fpk-band__h">{PARENT_BAND_HEADLINE}</h2>
      <ul className="lt-fpk-band__chips">
        <li>Maths CBQ Pack</li>
        <li>Science CBQ Pack</li>
      </ul>
      <Link className="lt-fpk__btn lt-fpk__btn--primary lt-fpk-band__btn" to={PACKS_CBQ_TO} data-testid="fp-packs-band-link" onClick={() => firePackEntryClick("for_parents")}>
        See the packs
      </Link>
    </section>
  );
}

export default function ParentPacksSection() {
  const paid = useNotPaid();
  const mounted = useMounted();
  if (paid) return null;
  return (
    <section id="packs" aria-labelledby="fp-packs" className="lt-fpk" data-testid="fp-packs">
      <h2 id="fp-packs">
        {PARENT_PACKS_HEADING}
        {mounted ? ` ${packPriceLabel("pack_cbq")} ${PARENT_PACKS_HEADING_TAIL}` : ""}
      </h2>
      <p>{PARENT_PACKS_LINE}</p>
      <ul className="lt-fpk__list">
        {ITEMS.map((it) => (
          <li key={it.name} className="lt-fpk__item">
            <span className="lt-fpk__name">
              {it.name}
              {it.cbq ? <span className="lt-fpk__chip">NEW · CBQ</span> : null}
            </span>
            <span className="lt-fpk__what">{it.what}</span>
            <span className="lt-fpk__price" data-testid="fp-packs-price">{mounted ? packPriceLabel(it.sku) : ""}</span>
          </li>
        ))}
      </ul>
      <div className="lt-fpk__actions">
        <Link className="lt-fpk__btn lt-fpk__btn--primary" to={PACKS_CBQ_TO} data-testid="fp-packs-cbq" onClick={() => firePackEntryClick("for_parents")}>
          See the CBQ packs
        </Link>
        <Link className="lt-fpk__btn lt-fpk__btn--ghost" to={PACKS_ALL_TO} data-testid="fp-packs-all" onClick={() => firePackEntryClick("for_parents")}>
          All packs
        </Link>
      </div>
    </section>
  );
}
