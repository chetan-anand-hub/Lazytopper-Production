/**
 * PRICING-HUB-1 - the three-card hub's own stylesheet. A STRING rendered in a <style> inside the page, for the reason the legacy
 * page's PRICING_CSS is one (pricingPageCss.ts): /pricing is prerendered and its route CSS is not inlined, so a .css import would
 * arrive only with the chunk and the static body would paint unstyled first (layout shift). The hub ALSO renders PRICING_CSS, which
 * styles everything it reuses unchanged (the navy header, PassCheckout, the compare table, the FAQ, the Basic line, the waitlist);
 * every rule here is scoped under `.lt-ph`.
 *
 * PRICING-4CARD-1 (owner, 18 Nov 2026) - four cards: the ONLINE pair (Board Pass, Test Series), then the ON PAPER pair.
 * Phones (< 768 px): four tabs under two group labels, then a horizontal CSS scroll-snap carousel (one card ~290 px at 360 px with
 * ~24 px of the next one peeking), dots (grouped 2 + 2) and "1 of 4". Tablet and small desktop (768-1279 px): a 2x2 grid, the online
 * pair on top, the paper pair below, each row under its group label, cards in a row equal height. From 1280 px: four across (Board Pass
 * a little wider), the two groups labelled above and split by a thin divider - four across needs >= ~280 px per card for the Board
 * Pass Pay area and the two-up CBQ Buys, which only 1280 px gives. Every tap target >= 44 px. Fonts are the app's own.
 */
/*
 * PRICING-CTA-UP-1 v1.1 (owner, 24 Nov 2026) - the slim card faces (rules at the end of HUB_CSS; comments kept OUT of the string, it
 * ships inline in the prerendered page): face = tag · name (the ONE link, stretched over the top area via .lt-ph-open::after) · hook
 * · three ticks · "Details ›" · a hairline · price · Buy, then the folded .lt-ph-more row. Each card takes its own height from 768 px
 * (.lt-ph-cards--up). The long validity line is hidden on the face (the Pay button says "valid till ...") and shown in the fold.
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
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 2px minmax(0, 1fr) minmax(0, 1fr);
    column-gap: 6px;
    row-gap: 4px;
    margin: 14px 0 0;
  }
  /* The group labels over each pair of tabs: a small caps word and a rule under the pair. */
  .lt-ph-tabgroup {
    grid-row: 1;
    padding: 0 2px 3px;
    border-bottom: 2px solid currentColor;
    font-size: 0.62rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    text-align: center;
    line-height: 1.2;
  }
  .lt-ph-tabgroup--online {
    grid-column: 1 / 3;
    color: var(--ph-green);
  }
  .lt-ph-tabgroup--paper {
    grid-column: 4 / 6;
    color: var(--ph-amber-ink);
  }
  .lt-ph-tab--pass { grid-row: 2; grid-column: 1; }
  .lt-ph-tab--ts { grid-row: 2; grid-column: 2; }
  .lt-ph-tab--cbq { grid-row: 2; grid-column: 4; }
  .lt-ph-tab--bank { grid-row: 2; grid-column: 5; }
  .lt-ph-tab {
    appearance: none;
    cursor: pointer;
    min-height: 56px;
    padding: 5px 3px;
    border-radius: 12px;
    border: 1.5px solid var(--ph-blue-line);
    background: #ffffff;
    color: var(--ph-navy);
    font: inherit;
    font-size: 0.72rem;
    font-weight: 700;
    line-height: 1.15;
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
  .lt-ph-tab--ts {
    border-color: var(--ph-green);
  }
  .lt-ph-tab[aria-pressed="true"] {
    background: var(--ph-navy);
    border-color: var(--ph-navy);
    color: #ffffff;
  }
  /* Two-word names: one line where they fit, two lines (at the space, never inside a word) on the narrowest phones. */
  .lt-ph-tab__name {
    max-width: 100%;
    text-align: center;
    overflow-wrap: normal;
    word-break: normal;
  }
  .lt-ph-tab__price {
    display: block;
    min-height: 1.2em;
    font-weight: 600;
    font-size: 0.7rem;
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
    flex: 0 0 min(340px, calc(100% - 36px));
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
    margin-right: calc(100% - min(340px, calc(100% - 36px)));
  }
  /* Group labels and the divider live in the track for the tablet / desktop grid; on phones the tabs carry the groups. */
  .lt-ph-group,
  .lt-ph-divider {
    display: none;
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
  .lt-ph-card--ts {
    border-color: var(--ph-green);
    background: #f6fbf8;
  }
  .lt-ph-card--ts .lt-ph-tag {
    color: var(--ph-green);
  }
  .lt-ph-chip--new {
    background: #ffffff;
    border: 1.5px solid var(--ph-green);
    color: var(--ph-green-dark);
  }
  .lt-ph-ts-head strong {
    color: var(--ph-navy);
  }
  /* "Want the tutor and Answer Checker too? -> Board Pass": a clearly visible line, one tap to the Board Pass card. */
  .lt-ph-upsell {
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    column-gap: 6px;
    padding: 6px 12px;
    border-radius: 12px;
    background: var(--ph-navy);
    color: #ffffff;
    font-size: 0.84rem;
    font-weight: 600;
    line-height: 1.35;
  }
  .lt-ph-upsell__go {
    appearance: none;
    cursor: pointer;
    min-height: 44px;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--ph-green-bright);
    font: inherit;
    font-weight: 800;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .lt-ph-upsell__go:hover {
    color: var(--ph-mint);
  }
  .lt-ph-tsrow {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 12px;
    border-radius: 10px;
    background: #ffffff;
    border: 1px solid #cfe8da;
  }
  .lt-ph-tsrow__name {
    font-size: 0.86rem;
    font-weight: 700;
  }
  .lt-ph-tsrow__line {
    font-size: 0.78rem;
    color: #4a5a73;
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
  .lt-ph-card--pass .lt-pricing-tillboards-validity,
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
  /* The WhatsApp opt-in above Pay (WhatsAppOptInFields, unchanged) is styled for a white sheet; on the navy card its label and tick
     read light, and "+91" never splits across lines in a narrow (four-across) card. */
  .lt-ph-card--pass .lt-waopt__label,
  .lt-ph-card--pass .lt-waopt__tick {
    color: #dbe5f3;
  }
  .lt-ph .lt-waopt__prefix {
    white-space: nowrap;
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
  .lt-ph-buy--link,
  .lt-pricing-page a.lt-ph-buy--link {
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    text-decoration: none;
    color: #ffffff;
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
  /* H6 - the parent-share actions on the pack cards (PaywallActions, unchanged): one quiet row under the Buy button(s), compact
     underlined actions side by side with 44 px targets (the OffersBlock precedent), never full-width buttons. An opened share panel
     takes the whole row. Empty (signed out, owned) -> nothing. */
  .lt-ph-share:empty {
    display: none;
  }
  .lt-ph-share--pair {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
    gap: 0 8px;
  }
  .lt-ph-share--pair > :has(.lt-parent-share-sheet, .lt-parent-share-note) {
    grid-column: 1 / -1;
  }
  .lt-ph-share .lt-paywall-actions {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 0 12px;
    width: 100%;
    max-width: none;
    margin: 0;
  }
  .lt-ph-share .lt-paywall-parent {
    width: auto;
    min-height: 44px;
    padding: 0 2px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--ph-green-dark);
    font-size: 0.8rem;
    line-height: 1.2;
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  /* One pack, two actions (the Bundle): side by side on one line from 360 px. */
  .lt-ph-share:not(.lt-ph-share--pair) .lt-paywall-parent {
    white-space: nowrap;
  }
  .lt-ph-share .lt-paywall-parent:hover {
    background: transparent;
    color: var(--ph-green);
  }
  .lt-ph-share .lt-parent-share-sheet,
  .lt-ph-share .lt-parent-share-note {
    flex: 1 1 100%;
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
  .lt-ph-card--ts .lt-ph-details {
    border-color: #9fd3b6;
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
  /* The dots read 2 + 2, like the tabs: a little extra room before the first paper card. */
  .lt-ph-dot--cbq {
    margin-left: 6px;
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
  /* "Compare all four": five columns. On a phone the table keeps a readable width and scrolls inside its own box (never the page),
     with the row labels held at the left edge. */
  .lt-ph-fold .lt-pp-table--4 {
    min-width: 540px;
  }
  .lt-ph-fold .lt-pp-table--4 col.lt-pp-col-label {
    width: 28%;
  }
  .lt-ph-fold .lt-pp-table--4 thead th:first-child,
  .lt-ph-fold .lt-pp-table--4 tbody th {
    position: sticky;
    left: 0;
    z-index: 1;
  }
  .lt-ph-fold .lt-pp-table--4 tbody th {
    background: #ffffff;
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

  /* ── Tablet and up: a grid, cards in a row equal height (stretch + the foot's margin-top:auto) ───────── */
  @media (min-width: 768px) {
    .lt-ph-tabs,
    .lt-ph-caption,
    .lt-ph-pager {
      display: none;
    }
    /* 768-1279 px: 2x2 - the online pair, then the paper pair, each under its label. */
    .lt-ph-cards {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      grid-template-areas:
        "go go"
        "c1 c2"
        "gp gp"
        "c3 c4";
      align-items: stretch;
      column-gap: 18px;
      row-gap: 12px;
      margin: 18px 0 0;
      padding: 0;
      overflow: visible;
      scroll-snap-type: none;
    }
    .lt-ph-card {
      padding: 20px 20px 18px;
    }
    .lt-ph-cards--up {
      align-items: start;
    }
    .lt-ph-card:last-child {
      margin-right: 0;
    }
    .lt-ph-card--pass { grid-area: c1; }
    .lt-ph-card--ts { grid-area: c2; }
    .lt-ph-card--cbq { grid-area: c3; }
    .lt-ph-card--bank { grid-area: c4; }
    .lt-ph-group {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .lt-ph-group::after {
      content: "";
      flex: 1 1 auto;
      height: 2px;
      border-radius: 2px;
      background: currentColor;
      opacity: 0.35;
    }
    .lt-ph-group--online {
      grid-area: go;
      color: var(--ph-green);
    }
    .lt-ph-group--paper {
      grid-area: gp;
      margin-top: 10px;
      color: var(--ph-amber-ink);
    }
    .lt-ph-extra {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .lt-ph-phone-only,
    .lt-ph-ticks li.lt-ph-phone-only {
      display: none;
    }
  }

  /* ── 1280 px and up: four across, the two groups split by a thin divider ──────────────────────────── */
  @media (min-width: 1280px) {
    .lt-ph-body {
      max-width: 1320px;
    }
    .lt-ph-cards {
      grid-template-columns: minmax(0, 1.12fr) minmax(0, 1fr) 1px minmax(0, 1fr) minmax(0, 1fr);
      grid-template-areas:
        "go go . gp gp"
        "c1 c2 dv c3 c4";
      column-gap: 16px;
    }
    .lt-ph-group--paper {
      margin-top: 0;
    }
    .lt-ph-divider {
      display: block;
      grid-area: dv;
      width: 1px;
      background: #cfd8e6;
    }
    .lt-ph-card--pass {
      box-shadow: 0 10px 28px rgba(11, 27, 58, 0.22);
    }
  }

  /* ── Desktop type sizes ────────────────────────────────────────────────── */
  @media (min-width: 1024px) {
    .lt-ph-body {
      padding: 0 32px 56px;
    }
    .lt-ph-card {
      padding: 22px 22px 20px;
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
  }
  @media (min-width: 1280px) {
    .lt-ph-card {
      padding: 20px 18px 18px;
    }
    .lt-ph-name {
      font-size: 1.8rem;
    }
    /* Four across: the two CBQ Buys ("Science · ₹235") stay on one line each. */
    .lt-ph-pair .lt-ph-buy {
      padding: 8px 4px;
      font-size: 0.86rem;
    }
  }

/* UI-FIX-1: the shortcut bar also shows on desktop (it was phone-only), so a buy button is inside the first 1280x800 screen - the
   cards' own Pay / Buy rows start ~900 px down. Same bar, same barGo handler, same hide-while-a-Pay-row-is-on-screen rule; only the
   shared sheet's "hide from 768 px" is overridden for /pricing (this wrapper), and the row is centred, narrower than the page so the Pay button clears the WhatsApp button. */
@media (min-width: 768px) {
  .lt-ph-barwrap .lt-stickybar { display: block; }
  .lt-ph-barwrap .lt-stickybar__row { max-width: 1080px; margin: 0 auto; }
}

/* TS-PRICE-2: reserved slot for a clock-derived Test Series price (the figure inside is written after mount and stripped from the capture). */
.lt-tsclk { display: inline-block; min-height: 1.2em; vertical-align: top; }
.lt-tsclk--tag { min-width: 9ch; }
.lt-tsclk--amt { min-width: 5.5ch; }
.lt-tsclk--line { display: block; min-height: 1.3em; }

.lt-ph-card--face {
  gap: 14px;
}
.lt-ph-face {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-radius: 12px;
}
.lt-ph-open {
  color: inherit;
  text-decoration: none;
}
.lt-pricing-page .lt-ph-open {
  color: inherit;
}
.lt-ph-open::after {
  content: "";
  position: absolute;
  inset: -6px;
  border-radius: 14px;
}
.lt-ph-open:focus-visible {
  outline: none;
}
.lt-ph-open:focus-visible::after {
  outline: 3px solid var(--ph-green-bright);
  outline-offset: 2px;
}
.lt-ph-open__cue {
  align-self: flex-start;
  font-size: 0.86rem;
  font-weight: 800;
  color: var(--ph-green);
  text-decoration: underline;
  text-decoration-thickness: 1.5px;
  text-underline-offset: 3px;
}
.lt-ph-card--pass .lt-ph-open__cue {
  color: var(--ph-mint);
}
.lt-ph-card--cbq .lt-ph-open__cue {
  color: var(--ph-amber-ink);
}
.lt-ph-face:hover .lt-ph-open__cue {
  text-decoration-thickness: 2.5px;
}
.lt-ph-card--face .lt-ph-ticks li {
  font-size: 0.9rem;
}
.lt-ph-card--face .lt-ph-ts-head {
  margin: 0;
  font-size: 1.02rem;
  line-height: 1.4;
}
.lt-ph-card--face .lt-ph-foot {
  margin-top: 0;
  padding-top: 14px;
  border-top: 1px solid rgba(11, 27, 58, 0.12);
  gap: 10px;
}
.lt-ph-card--pass.lt-ph-card--face .lt-ph-foot {
  border-top-color: rgba(255, 255, 255, 0.18);
}
.lt-ph-card--face .lt-pricing-tillboards-validity {
  display: none;
}
.lt-ph-card--face .lt-pricing-tillboards-slot {
  min-height: 0;
}
.lt-ph-more {
  margin: 0;
  border-top: 1px solid rgba(11, 27, 58, 0.12);
}
.lt-ph-card--pass .lt-ph-more {
  border-top-color: rgba(255, 255, 255, 0.18);
}
.lt-ph-more__sum {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 44px;
  cursor: pointer;
  list-style: none;
  font-size: 0.86rem;
  font-weight: 700;
  color: #22324d;
}
.lt-ph-more__sum::-webkit-details-marker {
  display: none;
}
.lt-ph-more__sum::after {
  content: "+";
  flex: 0 0 auto;
  font-size: 1.15rem;
  font-weight: 700;
  line-height: 1;
}
.lt-ph-more[open] > .lt-ph-more__sum::after {
  content: "\\2212";
}
.lt-ph-more__sum:focus-visible {
  outline: 3px solid var(--ph-green);
  outline-offset: 2px;
  border-radius: 6px;
}
.lt-ph-card--pass .lt-ph-more__sum {
  color: #dbe5f3;
}
.lt-ph-more__body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 2px 0 6px;
}
.lt-ph-more__group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.lt-ph-more__line {
  margin: 0;
  font-size: 0.84rem;
  line-height: 1.45;
  color: #4a5a73;
}
.lt-ph-card--pass .lt-ph-more__line {
  color: #c9d6e6;
}
`;
