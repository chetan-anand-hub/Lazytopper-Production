import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { packPriceLabel, type PackSku } from "../../services/packs";
import { BUNDLE_NAME, CBQ_MIN_PER_SUBJECT, MOCKS_PER_SUBJECT } from "../../lib/packs/packLabels";
import { firePackEntryClick } from "../../lib/packs/packEntry";
import "./parentPacks.css";

/**
 * ParentPacksSection - PARENTS-PACKS-1 (owner ruling 29 Oct 2026): /for-parents links to the printable PDF packs.
 * Placed right after the Board Pass answer (Board Pass stays first, packs second but visible). Shown to EVERY account, paid Premium
 * included (PARENTS-PAID-PACKS-1, owner 29-30 Oct 2026: a parent may buy for a child already on Premium). Prices come from the catalogue AFTER MOUNT, so the prerendered HTML carries no rupee figure.
 * Both links carry `from=for_parents` (the page's own return-link contract); `#cbq` scrolls on /pricing (PRICING-ONE-1).
 */
export const PARENT_PACKS_HEADING = "Printable question banks: chapter, mock, CBQ and bundle packs";
export const PARENT_PACKS_LINE =
  "PDF packs your child practises on paper, with worked solutions to check against. One-time payment, never renews. The Board Pass (Premium) includes everything online.";
export const PARENT_BAND_HEADLINE = "Printable question banks for every need";
export const HERO_LABEL = "PDF question banks";
export const PACKS_CBQ_TO = "/pricing?from=for_parents#cbq";
export const PACKS_ALL_TO = "/pricing?from=for_parents#packs";

const ITEMS: ReadonlyArray<{ sku: PackSku; name: string; what: string; cbq?: boolean }> = [
  { sku: "pack_cbq", name: "Maths CBQ Pack", what: `${CBQ_MIN_PER_SUBJECT.toLocaleString("en-IN")}+ competency questions`, cbq: true },
  { sku: "pack_cbq", name: "Science CBQ Pack", what: `${CBQ_MIN_PER_SUBJECT.toLocaleString("en-IN")}+ competency questions`, cbq: true },
  { sku: "pack_subject", name: "Subject Pack", what: "every chapter of a subject and its mocks" },
  { sku: "pack_mock", name: "Mock Pack", what: `${MOCKS_PER_SUBJECT} board-pattern papers` },
  { sku: "pack_chapter", name: "Chapter Pack", what: "every question of one chapter" },
  { sku: "pack_bundle", name: BUNDLE_NAME, what: "all chapters and the mocks" },
];

function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

/** PARENTS-PACKS-2: the hero's secondary action (outlined, green accent). Price after mount; shown to every account. */
export function ParentPacksHeroLink() {
  const mounted = useMounted();
  return (
    <Link className="lt-fpk__hero-link" to={PACKS_ALL_TO} data-testid="fp-packs-hero" onClick={() => firePackEntryClick("for_parents")}>
      {HERO_LABEL}
      {mounted ? ` \u00b7 from ${packPriceLabel("pack_chapter")}` : ""}
    </Link>
  );
}

/** PARENTS-PACKS-2: the compact band directly under the hero. */
const BAND_CHIPS: ReadonlyArray<{ sku: PackSku; name: string; cbq?: boolean }> = [
  { sku: "pack_chapter", name: "Chapter Pack" },
  { sku: "pack_mock", name: "Mock Pack" },
  { sku: "pack_subject", name: "Subject Pack" },
  { sku: "pack_bundle", name: BUNDLE_NAME },
  { sku: "pack_cbq", name: "Maths CBQ Pack", cbq: true },
  { sku: "pack_cbq", name: "Science CBQ Pack", cbq: true },
];

/** PARENTS-PACKS-3: the compact band directly under the hero, all packs. Prices after mount. */
export function ParentPacksBand() {
  const mounted = useMounted();
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
      <Link className="lt-fpk__btn lt-fpk__btn--primary lt-fpk-band__btn" to={PACKS_ALL_TO} data-testid="fp-packs-band-link" onClick={() => firePackEntryClick("for_parents")}>
        See all packs
      </Link>
    </section>
  );
}

export default function ParentPacksSection() {
  const mounted = useMounted();
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
