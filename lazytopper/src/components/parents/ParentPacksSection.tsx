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
export const PARENT_PACKS_HEADING = "Printable question banks: chapter, mock, CBQ and bundle packs";
export const PARENT_PACKS_LINE =
  "PDF packs your child practises on paper, with worked solutions to check against. One-time payment, never renews. The Board Pass (Premium) includes everything online.";
export const PARENT_BAND_HEADLINE = "Printable question banks for every need";
export const HERO_LABEL = "PDF question banks";
export const BAND_ANCHOR = "#packs";
export const PACKS_CBQ_TO = "/packs?from=for_parents#cbq";
export const PACKS_ALL_TO = "/packs?from=for_parents";

const ITEMS: ReadonlyArray<{ sku: PackSku; name: string; what: string; cbq?: boolean }> = [
  { sku: "pack_cbq", name: "Maths CBQ Pack", what: `${CBQ_MIN_PER_SUBJECT.toLocaleString("en-IN")}+ competency questions`, cbq: true },
  { sku: "pack_cbq", name: "Science CBQ Pack", what: `${CBQ_MIN_PER_SUBJECT.toLocaleString("en-IN")}+ competency questions`, cbq: true },
  { sku: "pack_subject", name: "Subject Pack", what: "every chapter of a subject and its mocks" },
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
    <Link className="lt-fpk__hero-link" to={PACKS_ALL_TO} data-testid="fp-packs-hero" onClick={() => firePackEntryClick("for_parents")}>
      {HERO_LABEL}
      {mounted ? ` \u00b7 from ${packPriceLabel("pack_chapter")}` : ""}
    </Link>
  );
}

/** PARENTS-PACKS-2: the compact band directly under the hero. Hidden for paid Premium. */
const BAND_CHIPS: ReadonlyArray<{ sku: PackSku; name: string; cbq?: boolean }> = [
  { sku: "pack_chapter", name: "Chapter Pack" },
  { sku: "pack_mock", name: "Mock Pack" },
  { sku: "pack_subject", name: "Subject Pack" },
  { sku: "pack_bundle", name: BUNDLE_NAME },
  { sku: "pack_cbq", name: "Maths CBQ Pack", cbq: true },
  { sku: "pack_cbq", name: "Science CBQ Pack", cbq: true },
];

/** PARENTS-PACKS-3: the compact band directly under the hero, all packs. Prices after mount. Hidden for paid Premium. */
export function ParentPacksBand() {
  const paid = useNotPaid();
  const mounted = useMounted();
  if (paid) return null;
  return (
    <section aria-labelledby="fp-band" className="lt-fpk-band" data-testid="fp-packs-band">
      <h2 id="fp-band" className="lt-fpk-band__h">{PARENT_BAND_HEADLINE}</h2>
      <ul className="lt-fpk-band__chips">
        {BAND_CHIPS.map((c) => (
          <li key={c.name}>
            {c.name}
            {c.cbq ? <span className="lt-fpk-band__new">NEW</span> : null}
            <span className="lt-fpk-band__price" data-testid="fp-band-price">{mounted ? packPriceLabel(c.sku) : ""}</span>
          </li>
        ))}
      </ul>
      <a className="lt-fpk__btn lt-fpk__btn--primary lt-fpk-band__btn" href={BAND_ANCHOR} data-testid="fp-packs-band-link">
        See all packs
      </a>
    </section>
  );
}

export default function ParentPacksSection() {
  const paid = useNotPaid();
  const mounted = useMounted();
  if (paid) return null;
  return (
    <section id="packs" aria-labelledby="fp-packs" className="lt-fpk" data-testid="fp-packs">
      <h2 id="fp-packs">{PARENT_PACKS_HEADING}</h2>
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
