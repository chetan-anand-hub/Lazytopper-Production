/**
 * PRICING-HUB-1 - the three-card hub's own stylesheet. A STRING rendered in a <style> inside the page, for the reason the legacy
 * page's PRICING_CSS is one (pricingPageCss.ts): /pricing is prerendered and its route CSS is not inlined, so a .css import would
 * arrive only with the chunk and the static body would paint unstyled first (layout shift). The hub ALSO renders PRICING_CSS, which
 * styles everything it reuses unchanged (the navy header, PassCheckout, the compare table, the FAQ, the Basic line, the waitlist);
 * every rule here is scoped under `.lt-ph`.
 *
 * Phones (< 1024 px): three tabs, then a horizontal CSS scroll-snap carousel (one card ~300 px at 360 px with the next one peeking),
 * dots and "1 of 3". From 1024 px: three equal-height columns, no tabs. Every tap target >= 44 px. Fonts are the app's own.
 */
export const HUB_CSS = `
  .lt-ph {
    --ph-navy: #0b1b3a;
    --ph-navy-2: #132a52;
    --ph-navy-line: #2a4370;
    --ph-green: #0e7c47;
    --ph-green-dark: #0b5e36;
    --ph-green-bright: #22c07a;
    --ph-mint: #8ee6b7;
    --ph-amber: #f5b11a;
    --ph-amber-line: #f59e0b;
    --ph-amber-ink: #7a4a00;
    --ph-cream: #fffbeb;
    --ph-blue-line: #9fb3cf;
    --ph-blue-tile: #e8eef8;
  }

  .lt-ph .lt-pricing-band {
    padding-bottom: 22px;
  }
  .lt-ph-eyebrow {
    margin: 2px 0 0;
    text-align: center;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    color: var(--ph-mint);
  }

  .lt-ph-body {
    padding: 0 16px 40px;
    max-width: 1180px;
    margin: 0 auto;
  }
  /* The shop's (empty) My packs wrapper: packs.css pads it 28 px once its lazy sheet lands, ABOVE the cards here (CLS). Hidden while
     empty, as the legacy page does (.lt-pricing-body .lt-packs--embedded:empty); the post-pay status line still shows in it. */
  .lt-ph-body .lt-packs--embedded:empty {
    display: none;
  }
  .lt-ph-body > .lt-boards-slot {
    margin-top: 14px;
  }

  /* ── Tabs (phones) ─────────────────────────────────────────────────────── */
  .lt-ph-tabs {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    margin: 14px 0 0;
  }
  .lt-ph-tab {
    appearance: none;
    cursor: pointer;
    min-height: 52px;
    padding: 6px 4px;
    border-radius: 12px;
    border: 1.5px solid var(--ph-blue-line);
    background: #ffffff;
    color: var(--ph-navy);
    font: inherit;
    font-size: 0.78rem;
    font-weight: 700;
    line-height: 1.2;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    min-width: 0;
  }
  .lt-ph-tab--cbq {
    border-color: var(--ph-amber-line);
    background: var(--ph-cream);
  }
  .lt-ph-tab[aria-pressed="true"] {
    background: var(--ph-navy);
    border-color: var(--ph-navy);
    color: #ffffff;
  }
  .lt-ph-tab__name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }
  .lt-ph-tab__price {
    display: block;
    min-height: 1.2em;
    font-weight: 600;
    font-size: 0.74rem;
  }
  .lt-ph-caption {
    margin: 6px 0 0;
    text-align: center;
    font-size: 0.72rem;
    color: #4a5a73;
  }

  /* ── The cards row ─────────────────────────────────────────────────────── */
  /* Phones: each card takes its own height, so a short card's Buy sits right under its content (no stretched gap). */
  .lt-ph-cards {
    position: relative;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin: 12px -16px 0;
    padding: 4px 16px 10px;
    overflow-x: auto;
    overflow-y: hidden;
    scroll-snap-type: x mandatory;
    scroll-padding: 0 16px;
    overscroll-behavior-x: contain;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }
  .lt-ph-cards::-webkit-scrollbar {
    display: none;
  }
  .lt-ph-card {
    flex: 0 0 min(340px, calc(100% - 28px));
    min-width: 0;
    scroll-snap-align: start;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 18px 16px 16px;
    border-radius: 18px;
    border: 2px solid var(--ph-blue-line);
    background: #ffffff;
    color: var(--ph-navy);
    overflow-wrap: anywhere;
  }
  /* Trailing room so the LAST card can snap to the left edge like the others (it sits where the WhatsApp button cannot reach it,
     and the selected tab always matches the card at the edge). Equals the track's width minus one card. */
  .lt-ph-card:last-child {
    margin-right: calc(100% - min(340px, calc(100% - 28px)));
  }
  .lt-ph-card--pass {
    background: var(--ph-navy);
    border-color: var(--ph-green-bright);
    color: #ffffff;
  }
  .lt-ph-card--cbq {
    background: var(--ph-cream);
    border-color: var(--ph-amber-line);
  }
  .lt-ph-card:focus-visible {
    outline: 3px solid var(--ph-green);
    outline-offset: 2px;
  }

  .lt-ph-card__top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-height: 24px;
  }
  .lt-ph-tag {
    margin: 0;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: #4a5a73;
  }
  .lt-ph-card--pass .lt-ph-tag {
    color: var(--ph-mint);
  }
  .lt-ph-card--cbq .lt-ph-tag {
    color: var(--ph-amber-ink);
  }
  .lt-ph-chip {
    flex: 0 0 auto;
    padding: 3px 10px;
    border-radius: 999px;
    background: var(--ph-green-bright);
    color: var(--ph-navy);
    font-size: 0.66rem;
    font-weight: 800;
    letter-spacing: 0.06em;
  }
  .lt-ph-name {
    margin: 0;
    font-family: "Fraunces", "Fraunces Fallback", Georgia, serif;
    font-weight: 700;
    font-size: 1.75rem;
    line-height: 1.1;
    color: inherit;
  }
  .lt-ph-hero {
    margin: 0;
    font-size: 0.95rem;
    line-height: 1.45;
    color: #22324d;
  }

  /* The Board Pass "1 MINUTE" hero tile. */
  .lt-ph-minute {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 12px;
    padding: 12px;
    border-radius: 14px;
    border: 1.5px solid var(--ph-amber);
    background: var(--ph-navy-2);
  }
  .lt-ph-minute__fig {
    display: flex;
    flex-direction: column;
    align-items: center;
    color: var(--ph-amber);
    min-width: 56px;
  }
  .lt-ph-minute__num {
    font-family: "Fraunces", "Fraunces Fallback", Georgia, serif;
    font-size: 2.6rem;
    font-weight: 700;
    line-height: 1;
  }
  .lt-ph-minute__unit {
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.08em;
  }
  .lt-ph-minute__text {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 0.82rem;
    line-height: 1.4;
    color: #dbe5f3;
  }
  .lt-ph-minute__strong {
    font-size: 1rem;
    line-height: 1.3;
    color: #ffffff;
  }

  /* Number tiles. */
  .lt-ph-tiles {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  .lt-ph-tile {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 10px 12px;
    border-radius: 12px;
    background: var(--ph-blue-tile);
  }
  .lt-ph-card--pass .lt-ph-tile {
    background: var(--ph-navy-2);
  }
  .lt-ph-card--cbq .lt-ph-tile {
    background: #ffffff;
    border: 1px solid #f3dfae;
  }
  .lt-ph-tile__fig {
    font-family: "Fraunces", "Fraunces Fallback", Georgia, serif;
    font-weight: 700;
    font-size: 1.45rem;
    line-height: 1.1;
    color: var(--ph-navy);
  }
  .lt-ph-card--pass .lt-ph-tile__fig {
    color: var(--ph-mint);
  }
  .lt-ph-card--pass .lt-ph-tile:nth-child(2) .lt-ph-tile__fig {
    color: var(--ph-amber);
  }
  .lt-ph-card--cbq .lt-ph-tile__fig {
    color: var(--ph-amber-ink);
    font-size: 1.15rem;
  }
  .lt-ph-tile__lbl {
    font-size: 0.76rem;
    line-height: 1.3;
    color: #4a5a73;
  }
  .lt-ph-card--pass .lt-ph-tile__lbl {
    color: #dbe5f3;
  }

  /* The tutor box. */
  .lt-ph-tutor {
    margin: 0;
    padding: 12px 14px;
    border-radius: 14px;
    background: #ffffff;
    color: var(--ph-navy);
    font-size: 0.86rem;
    line-height: 1.45;
  }

  /* Ticks. */
  .lt-ph-ticks {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .lt-ph-ticks li {
    display: grid;
    grid-template-columns: 18px minmax(0, 1fr);
    gap: 6px;
    font-size: 0.86rem;
    line-height: 1.4;
  }
  .lt-ph-tick {
    color: var(--ph-green);
    font-weight: 800;
  }
  .lt-ph-card--pass .lt-ph-tick {
    color: var(--ph-green-bright);
  }
  .lt-ph-claim {
    margin: 0;
    font-size: 0.9rem;
  }

  /* The foot: price, Buy, details. margin-top:auto lines the three feet up on desktop. */
  .lt-ph-foot {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .lt-ph-price {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .lt-ph-price__amt {
    font-family: "Fraunces", "Fraunces Fallback", Georgia, serif;
    font-weight: 700;
    font-size: 2rem;
    line-height: 1.05;
  }
  .lt-ph-price__meta {
    font-size: 0.8rem;
    color: #4a5a73;
  }
  .lt-ph-note {
    margin: 0;
    font-size: 0.8rem;
    font-weight: 700;
    color: #22324d;
  }

  /* The Board Pass card on navy: the reused price + PassCheckout pieces read light. */
  .lt-ph-card--pass .lt-pricing-tillboards-amount,
  .lt-ph-card--pass .lt-pricing-tillboards-deadline,
  .lt-ph-card--pass .lt-pricing-checkout-note,
  .lt-ph-card--pass .lt-pricing-founding-note {
    color: #ffffff;
  }
  .lt-ph-card--pass .lt-pricing-tillboards-meta,
  .lt-ph-card--pass .lt-pp-payline,
  .lt-ph-card--pass .lt-pricing-period {
    color: #c9d6e6;
  }
  .lt-ph-card--pass .lt-pricing-tillboards-deadline strong {
    color: var(--ph-amber);
  }
  .lt-ph-card--pass .lt-pricing-tillboards-slot {
    min-height: 4.4rem;
  }
  .lt-ph-card--pass .lt-pricing-month {
    background: var(--ph-navy-2);
    border-color: var(--ph-navy-line);
  }
  .lt-ph-card--pass .lt-pricing-amount,
  .lt-ph-card--pass .lt-pricing-month__name {
    color: #ffffff;
  }
  /* The legacy sheet lays the Pay area out in a wrapping row from 1024 px (its wide card); in a hub card it stays one column. */
  .lt-ph .lt-pricing-passes {
    display: flex;
    flex-direction: column;
    flex-wrap: nowrap;
    align-items: stretch;
    gap: 8px;
  }
  .lt-ph .lt-pricing-passes > *,
  .lt-ph .lt-pricing-passes .lt-pricing-checkout > * {
    flex: 0 0 auto;
  }
  .lt-ph .lt-pricing-pay,
  .lt-ph .lt-pricing-passes .lt-pricing-pay {
    width: 100%;
    min-width: 0;
    flex: 0 0 auto;
    min-height: 52px;
    font-size: 1rem;
  }
  .lt-ph-card--pass .lt-pricing-pay--boards {
    background: var(--ph-green-bright);
    color: var(--ph-navy);
  }
  .lt-ph-card--pass .lt-pricing-pay--boards:not(:disabled):hover {
    background: var(--ph-mint);
  }
  .lt-ph-card--pass .lt-pricing-manual {
    color: #ffffff;
  }
  .lt-ph-card--pass .lt-pp-trial {
    color: #c9d6e6;
  }
  .lt-ph-card--pass .lt-pricing-trial-state-msg {
    color: #ffffff;
  }
  .lt-ph-card--pass .lt-pp-parents {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .lt-ph-trial {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    text-align: center;
  }
  .lt-ph-owned {
    margin: 0;
    padding: 10px 12px;
    border-radius: 12px;
    background: var(--ph-navy-2);
    font-weight: 700;
  }
  .lt-ph-owned a {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    margin-left: 6px;
    color: var(--ph-mint);
  }

  /* Pack buys. */
  .lt-ph-pair {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  .lt-ph-pair__one {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }
  .lt-ph-buy {
    appearance: none;
    cursor: pointer;
    width: 100%;
    min-height: 52px;
    padding: 8px 10px;
    border: 0;
    border-radius: 12px;
    background: var(--ph-green);
    color: #ffffff;
    font: inherit;
    font-size: 0.95rem;
    font-weight: 700;
    line-height: 1.2;
  }
  .lt-ph-buy:not(:disabled):hover {
    background: var(--ph-green-dark);
  }
  .lt-ph-buy:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
  .lt-ph-owned-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 52px;
    padding: 8px 10px;
    border-radius: 12px;
    border: 1.5px solid var(--ph-green);
    background: #eef8f2;
    color: var(--ph-green-dark);
    font-size: 0.86rem;
    font-weight: 700;
    text-align: center;
  }
  .lt-ph-busy {
    margin: 0;
    font-size: 0.78rem;
    color: #4a5a73;
  }
  .lt-ph-sep {
    margin: 0;
    font-size: 0.8rem;
    font-weight: 700;
    color: #22324d;
  }

  .lt-ph-details {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 46px;
    padding: 8px 12px;
    border-radius: 12px;
    border: 1.5px solid var(--ph-blue-line);
    background: #ffffff;
    color: var(--ph-navy);
    font-size: 0.9rem;
    font-weight: 700;
    text-align: center;
    text-decoration: none;
  }
  .lt-pricing-page .lt-ph-details {
    color: var(--ph-navy);
  }
  .lt-ph-card--pass .lt-ph-details,
  .lt-pricing-page .lt-ph-card--pass .lt-ph-details {
    background: transparent;
    border-color: #6f86ad;
    color: #ffffff;
  }
  .lt-ph-card--cbq .lt-ph-details {
    border-color: #f3c66b;
  }
  .lt-ph-mypacks {
    align-self: center;
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    font-size: 0.86rem;
    font-weight: 700;
  }

  /* Dots + "1 of 3". */
  .lt-ph-pager {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    margin: 4px 0 0;
  }
  .lt-ph-dots {
    display: flex;
    gap: 6px;
  }
  .lt-ph-dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: #c3cfdf;
  }
  .lt-ph-dot.is-on {
    width: 22px;
    background: var(--ph-navy);
  }
  .lt-ph-pos {
    margin: 0;
    font-size: 0.78rem;
    color: #4a5a73;
  }

  /* ── Folded rows ───────────────────────────────────────────────────────── */
  .lt-ph-folds {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin: 22px 0 0;
  }
  .lt-ph-fold {
    border-radius: 14px;
    border: 1px solid #e1e7ef;
    background: #ffffff;
  }
  .lt-ph-fold > summary {
    cursor: pointer;
    list-style: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    min-height: 52px;
    padding: 6px 16px;
  }
  .lt-ph-fold > summary::-webkit-details-marker {
    display: none;
  }
  .lt-ph-fold > summary::after {
    content: "";
    flex: 0 0 auto;
    width: 9px;
    height: 9px;
    border-right: 2px solid var(--ph-navy);
    border-bottom: 2px solid var(--ph-navy);
    transform: rotate(45deg);
    margin-top: -4px;
  }
  .lt-ph-fold[open] > summary::after {
    transform: rotate(225deg);
    margin-top: 4px;
  }
  .lt-ph-fold__title {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
    color: var(--ph-navy);
  }
  .lt-ph-fold__body {
    padding: 0 16px 16px;
    min-width: 0;
  }
  .lt-ph-fold__body > .lt-pp-section {
    margin: 0;
  }
  /* "Compare all three": the table keeps every row; on a phone its words wrap at spaces, never inside a word. */
  .lt-ph-fold .lt-pp-table th,
  .lt-ph-fold .lt-pp-table td,
  .lt-ph-fold .lt-pricing-compare-table th,
  .lt-ph-fold .lt-pricing-compare-table td {
    overflow-wrap: normal;
    word-break: normal;
    hyphens: manual;
  }
  .lt-ph-fold .lt-pp-table-wrap,
  .lt-ph-fold .lt-pricing-compare-scroll {
    max-width: 100%;
    overflow-x: auto;
  }

  .lt-ph .lt-pp-basicline {
    margin-top: 22px;
  }
  .lt-ph-barwrap {
    display: contents;
  }
  /* Desktop-only extras (the band beside the taller Board Pass card): hidden below 1024 px, where they would push Buy down. */
  .lt-ph-extra {
    display: none;
  }
  .lt-ph-extra__title {
    margin: 0;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #4a5a73;
  }
  .lt-ph-card--cbq .lt-ph-extra__title {
    color: var(--ph-amber-ink);
  }
  .lt-ph-chips {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .lt-ph-chip2 {
    padding: 4px 10px;
    border-radius: 999px;
    border: 1px solid #f3c66b;
    background: #ffffff;
    font-size: 0.76rem;
    font-weight: 600;
    color: var(--ph-amber-ink);
  }
  .lt-ph-extra__line {
    margin: 0;
    font-size: 0.82rem;
    line-height: 1.4;
    color: #22324d;
  }
  .lt-ph-row {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-height: 44px;
    padding: 8px 12px;
    border-radius: 10px;
    background: var(--ph-blue-tile);
    text-decoration: none;
  }
  .lt-pricing-page a.lt-ph-row {
    color: var(--ph-navy);
  }
  .lt-ph-row:hover {
    background: #dde6f4;
  }
  .lt-ph-row__top {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    font-size: 0.86rem;
    font-weight: 700;
  }
  .lt-ph-row__price {
    white-space: nowrap;
  }
  .lt-ph-row__line {
    font-size: 0.78rem;
    color: #4a5a73;
  }

  /* WhatsApp button on the hub (phones): the shared button (contact/WhatsAppFab, 52 px at right 16 px) would sit over the right
     edge of the cards' text. Here it is 44 px at right 4 px, which clears every card's text column at 320-412 px, still above the
     phone bar (its bottom stays 84 px; the bar is 64 px). The right-aligned rows below the cards keep a matching gutter.
     Same page-level :has() mechanism the legacy PRICING_CSS uses for the page background and the shell's fixed bar. */
  @media (max-width: 767px) {
    body:has(.lt-ph) .lt-wa-fab {
      width: 44px;
      height: 44px;
      right: 4px;
    }
    body:has(.lt-ph) .lt-wa-fab__icon {
      width: 24px;
      height: 24px;
    }
    .lt-ph .lt-pp-basicline {
      padding-right: 48px;
    }
    .lt-ph-fold > summary {
      padding-right: 52px;
    }
  }


  /* The H1 keeps two lines' room on phones: the web font swapping in re-wraps it at some widths (412 px: CLS 0.03 on trunk too). */
  @media (max-width: 599px) {
    .lt-ph .lt-pricing-title {
      min-height: 2.4em;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .lt-ph-cards {
      scroll-behavior: auto;
    }
  }

  @media (min-width: 600px) {
    .lt-ph-tab {
      font-size: 0.86rem;
    }
  }

  /* ── Desktop: three equal-height columns ───────────────────────────────── */
  @media (min-width: 1024px) {
    .lt-ph-body {
      padding: 0 32px 56px;
    }
    .lt-ph-tabs,
    .lt-ph-caption,
    .lt-ph-pager {
      display: none;
    }
    .lt-ph-cards {
      display: grid;
      grid-template-columns: 1.08fr 1fr 1fr;
      align-items: stretch;
      gap: 22px;
      margin: 22px 0 0;
      padding: 0;
      overflow: visible;
      scroll-snap-type: none;
    }
    .lt-ph-card {
      padding: 22px 22px 20px;
    }
    .lt-ph-card:last-child {
      margin-right: 0;
    }
    .lt-ph-name {
      font-size: 2rem;
    }
    .lt-ph-price__amt {
      font-size: 2.2rem;
    }
    .lt-ph-card--pass .lt-pricing-tillboards-amount {
      font-size: 2.2rem;
    }
    .lt-ph-card--pass .lt-pricing-tillboards-meta {
      font-size: 0.82rem;
    }
    .lt-ph-folds {
      margin-top: 28px;
    }
    .lt-ph-extra {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .lt-ph-phone-only {
      display: none;
    }
  }
`;
