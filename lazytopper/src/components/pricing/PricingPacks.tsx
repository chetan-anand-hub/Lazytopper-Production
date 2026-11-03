import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { PACK_PRICE_INR, packPriceLabel, subjectLabel, type PackSku, type PackSubject } from "../../services/packs";
import { OTHER_PAYMENT_BUSY_COPY, type PacksShopApi } from "../packs/PacksShop";
import ParentReturnLink from "../parents/ParentReturnLink";
import {
  BUNDLE_BODY,
  BUNDLE_BUY_LABEL,
  BUNDLE_NAME,
  CBQ_BODY,
  CBQ_KICKER,
  CBQ_NOT_IN_BUNDLE,
  CBQ_TITLE,
  CHAPTER_BODY,
  CHAPTER_TITLE,
  OWNED_LABEL,
  ONE_SUBJECT_PRICES,
  ONE_SUBJECT_TITLE,
  PACKS_SUB,
  PACKS_TITLE,
  PER_SUBJECT,
  ROW_BUY_LABEL,
  SEE_INSIDE_LABEL,
  SUBJECT_SWITCH_LABEL,
  WHAT_YOU_GET_COLUMNS,
  WHAT_YOU_GET_TITLE,
  bundleBadge,
  cbqBuyLabel,
  chapterBuyLabel,
  mockPackRow,
  oneSubjectFor,
  subjectPackRow,
  whatYouGetRows,
  type WhatCell,
} from "./pricingPlansCopy";

/**
 * PricingPacks - PRICING-B-1: the print products on /pricing ("Option B v3"). Presentation only: every Buy is the shared pack
 * shop's own buy (`PacksShopApi.buyNow` -> PacksShop.handleBuy: signed in -> Razorpay; signed out -> the pay-by-phone chooser when
 * that is on, else sign-in and resume on /pricing?buy=&t=), every "See inside" its own pop-up, and every "You own this" its own
 * ownership read (which counts a pack covered by a Subject Pack or the Bundle). Packs dark (`buyEnabled` false): the buttons open
 * the pop-up, which says "Opens soon", exactly as /packs does.
 */

const SUBJECTS: readonly PackSubject[] = ["maths", "science"];

function Owned({ testId, label }: { testId: string; label?: string }) {
  return (
    <span className="lt-pp-owned" data-testid={testId}>
      <span aria-hidden="true">&#10003;</span>
      {label ? `${label} · ${OWNED_LABEL}` : OWNED_LABEL}
    </span>
  );
}

/** One Buy for one pack: owned -> the pill; packs dark -> opens the pop-up; else the shop's one-tap buy. */
function PackBuy({
  api,
  sku,
  target,
  className,
  label,
  ariaLabel,
  testId,
  ownedLabel,
}: {
  api: PacksShopApi;
  sku: PackSku;
  target?: PackSubject;
  className: string;
  label: string;
  ariaLabel?: string;
  testId: string;
  ownedLabel?: string;
}) {
  const tid = target ? `${sku}-${target}` : sku;
  if (api.buyEnabled && api.ownsPack(sku, target)) return <Owned testId={`pricing-owned-${tid}`} label={ownedLabel} />;
  const blocked = api.buyEnabled && api.blockedBy(sku, target);
  const onClick = () => {
    if (!api.buyEnabled) {
      if (sku === "pack_cbq" && target) api.openCbq(target);
      else api.openPack(sku);
      return;
    }
    api.buyNow(sku, target);
  };
  return (
    <>
      <button
        type="button"
        className={className}
        onClick={onClick}
        disabled={blocked}
        aria-disabled={blocked}
        aria-label={ariaLabel}
        data-testid={testId}
        data-sku={sku}
        data-target={target ?? ""}
      >
        {label}
      </button>
      {blocked && (
        <p className="lt-pp-busy" role="status">
          {OTHER_PAYMENT_BUSY_COPY}
        </p>
      )}
    </>
  );
}

/** The CBQ Packs card (#cbq). Two one-tap buys, one per subject; ONE "See inside" link that follows the selected subject. */
export function CbqCard({ api, subject }: { api: PacksShopApi; subject: PackSubject }) {
  const price = packPriceLabel("pack_cbq");
  return (
    <section id="cbq" className="lt-pp-cbq" aria-labelledby="pricing-cbq-h" data-testid="cbq-band" data-price={PACK_PRICE_INR.pack_cbq}>
      <div className="lt-pp-cbq__copy">
        <ParentReturnLink testId="parent-return-cbq" />
        <div className="lt-pp-cbq__top">
          <span className="lt-pp-kicker">{CBQ_KICKER}</span>
        </div>
        <div className="lt-pp-cbq__head">
          <h2 className="lt-pp-cbq__title" id="pricing-cbq-h">{CBQ_TITLE}</h2>
          <span className="lt-pp-cbq__price" data-testid="pricing-cbq-price">
            {price} <span className="lt-pp-per">{PER_SUBJECT}</span>
          </span>
        </div>
        <p className="lt-pp-cbq__body">
          {CBQ_BODY} <strong>{CBQ_NOT_IN_BUNDLE}</strong>
        </p>
      </div>
      <div className="lt-pp-cbq__act">
        <div className="lt-pp-pair">
          {SUBJECTS.map((s) => (
            <div key={s} className="lt-pp-cbq__one">
              <PackBuy
                api={api}
                sku="pack_cbq"
                target={s}
                className="lt-pp-buy"
                label={cbqBuyLabel(s)}
                testId={`pricing-buy-pack_cbq-${s}`}
                ownedLabel={`${subjectLabel(s)} CBQ`}
              />
            </div>
          ))}
        </div>
        <button type="button" className="lt-pp-see" aria-haspopup="dialog" onClick={() => api.openCbq(subject)} data-testid="pricing-see-cbq">
          {SEE_INSIDE_LABEL}
        </button>
      </div>
    </section>
  );
}

/** Student input that ends the hash re-assert: we never fight a deliberate scroll. */
const USER_EVENTS = ["wheel", "touchstart", "keydown"] as const;

/**
 * `/pricing#packs` and `/pricing#cbq` (walls, emails, llms.txt, ads): scroll the target's TOP into view on mount, then re-assert on
 * the next frames and after ~300 / ~900 ms (My packs or the trial state can still grow above it), stopping the moment the reader
 * scrolls, touches or presses a key. The SPA's route-change scroll leaves in-page targets to the page (useScrollTopOnRouteChange).
 */
export function useHashLanding(): void {
  const { hash } = useLocation();
  useEffect(() => {
    if (hash !== "#packs" && hash !== "#cbq") return undefined;
    let stopped = false;
    const timers: number[] = [];
    const frames: number[] = [];
    const assert = () => {
      if (stopped) return;
      document.getElementById(hash.slice(1))?.scrollIntoView?.({ block: "start" });
    };
    const stop = () => {
      stopped = true;
      timers.forEach((t) => window.clearTimeout(t));
      frames.forEach((f) => window.cancelAnimationFrame(f));
      USER_EVENTS.forEach((e) => window.removeEventListener(e, stop));
    };
    USER_EVENTS.forEach((e) => window.addEventListener(e, stop, { passive: true }));
    assert();
    frames.push(
      window.requestAnimationFrame(() => {
        assert();
        frames.push(window.requestAnimationFrame(assert));
      }),
    );
    timers.push(window.setTimeout(assert, 300), window.setTimeout(assert, 900));
    timers.push(window.setTimeout(stop, 950));
    return stop;
  }, [hash]);
}

/** The Maths / Science switch. It drives the chapter button, the one-subject rows, the CBQ "See inside", and the sticky bar. */
function SubjectSwitch({ subject, onSubject }: { subject: PackSubject; onSubject: (s: PackSubject) => void }) {
  return (
    <div className="lt-pp-switch" role="group" aria-label={SUBJECT_SWITCH_LABEL} data-testid="pricing-subject-switch">
      {SUBJECTS.map((s) => (
        <button key={s} type="button" aria-pressed={subject === s} onClick={() => onSubject(s)} data-testid={`pricing-subject-${s}`}>
          {subjectLabel(s)}
        </button>
      ))}
    </div>
  );
}

function OneRow({ api, sku, subject }: { api: PacksShopApi; sku: "pack_subject" | "pack_mock"; subject: PackSubject }) {
  const row = sku === "pack_subject" ? subjectPackRow(subject) : mockPackRow(subject);
  return (
    <div className="lt-pp-row" data-testid={`pricing-row-${sku}`}>
      <div className="lt-pp-row__copy">
        <p className="lt-pp-row__name">{row.name}</p>
        <p className="lt-pp-row__line lt-pp-row__line--long">{row.line}</p>
        <p className="lt-pp-row__line lt-pp-row__line--short" aria-hidden="true">{row.lineShort}</p>
      </div>
      <div className="lt-pp-row__act">
        <PackBuy
          api={api}
          sku={sku}
          target={subject}
          className="lt-pp-buy lt-pp-buy--outline lt-pp-buy--row"
          label={ROW_BUY_LABEL}
          ariaLabel={`${ROW_BUY_LABEL} ${row.name}`}
          testId={`pricing-buy-${sku}`}
        />
      </div>
    </div>
  );
}

/** #packs: the Bundle, the Chapter Pack (with the subject switch) and "Only need one subject?" (Subject + Mock Pack rows). */
export function PacksSection({
  api,
  subject,
  onSubject,
  desktop,
}: {
  api: PacksShopApi;
  subject: PackSubject;
  onSubject: (s: PackSubject) => void;
  desktop: boolean;
}) {
  const [oneOpen, setOneOpen] = useState(false);
  return (
    <section id="packs" className="lt-pp-section lt-pp-packs" aria-labelledby="pricing-packs-h" data-testid="pricing-packs-strip">
      <ParentReturnLink testId="parent-return-packs" />
      <div className="lt-pp-packs__head">
        <h2 className="lt-pp-h2" id="pricing-packs-h">{PACKS_TITLE}</h2>
        <p className="lt-pp-sub" data-testid="pricing-packs-sub">{PACKS_SUB}</p>
      </div>
      <div className="lt-pp-grid">
        <div className="lt-pp-card lt-pp-card--bundle" data-testid="pricing-card-bundle">
          <span className="lt-pp-pill">{bundleBadge()}</span>
          <div className="lt-pp-card__top">
            <h3 className="lt-pp-card__name">{BUNDLE_NAME}</h3>
            <span className="lt-pp-card__price">{packPriceLabel("pack_bundle")}</span>
          </div>
          <p className="lt-pp-card__body">{BUNDLE_BODY}</p>
          <PackBuy api={api} sku="pack_bundle" className="lt-pp-buy" label={BUNDLE_BUY_LABEL} testId="pricing-buy-pack_bundle" />
          <button type="button" className="lt-pp-see" aria-haspopup="dialog" onClick={() => api.openPack("pack_bundle")} data-testid="pricing-see-bundle">
            {SEE_INSIDE_LABEL}
          </button>
        </div>

        <div className="lt-pp-card lt-pp-card--chapter" data-testid="pricing-card-chapter">
          <div className="lt-pp-card__top">
            <h3 className="lt-pp-card__name">{CHAPTER_TITLE}</h3>
            <span className="lt-pp-card__price">{packPriceLabel("pack_chapter")}</span>
          </div>
          <p className="lt-pp-card__body">{CHAPTER_BODY}</p>
          <SubjectSwitch subject={subject} onSubject={onSubject} />
          <button
            type="button"
            className="lt-pp-buy lt-pp-buy--outline"
            aria-haspopup="dialog"
            disabled={api.buyEnabled && api.blockedBy("pack_chapter")}
            onClick={() => (api.buyEnabled ? api.chooseChapter({ subject }) : api.openPack("pack_chapter"))}
            data-testid="pricing-choose-chapter"
            data-subject={subject}
          >
            {chapterBuyLabel(subject)}
          </button>
        </div>

        <div className={`lt-pp-card lt-pp-one${oneOpen ? " is-open" : ""}`} data-testid="pricing-card-one-subject">
          <button
            type="button"
            className="lt-pp-one__toggle"
            aria-expanded={oneOpen}
            aria-controls="pricing-one-body"
            onClick={() => setOneOpen((o) => !o)}
            data-testid="pricing-one-toggle"
          >
            <span>
              {ONE_SUBJECT_TITLE} <span className="lt-pp-one__prices">{ONE_SUBJECT_PRICES}</span>
            </span>
            <span aria-hidden="true">{oneOpen ? "▴" : "▾"}</span>
          </button>
          <h3 className="lt-pp-one__title">{ONE_SUBJECT_TITLE}</h3>
          <div className="lt-pp-one__body" id="pricing-one-body">
            <p className="lt-pp-one__for">{oneSubjectFor(subject, desktop)}</p>
            <OneRow api={api} sku="pack_subject" subject={subject} />
            <OneRow api={api} sku="pack_mock" subject={subject} />
          </div>
        </div>
      </div>
    </section>
  );
}

function WhatCellView({ cell, column }: { cell: WhatCell; column: string }) {
  if (cell.kind === "yes") {
    return (
      <td className="lt-pp-yes">
        <span aria-hidden="true">✓</span>
        <span className="lt-pricing-sr">{`${column}: included`}</span>
      </td>
    );
  }
  if (cell.kind === "no") {
    return (
      <td className="lt-pp-no">
        <span aria-hidden="true">—</span>
        <span className="lt-pricing-sr">{`${column}: not included`}</span>
      </td>
    );
  }
  if (cell.kind === "price") {
    return (
      <td>
        <strong>{cell.text}</strong>
      </td>
    );
  }
  return <td>{cell.text}</td>;
}

/** "What you get with each": Board Pass | CBQ Pack | Bundle, rows exactly as the prototype. `children` is the folded Basic table. */
export function WhatYouGet({ boardPassPrice, children }: { boardPassPrice: string; children?: ReactNode }) {
  return (
    <section className="lt-pp-section" aria-labelledby="pricing-what-h" data-testid="pricing-what-you-get">
      <h2 className="lt-pp-h2" id="pricing-what-h">{WHAT_YOU_GET_TITLE}</h2>
      <div className="lt-pp-table-wrap">
        <table className="lt-pp-table" data-testid="pricing-what-table">
          <colgroup>
            <col className="lt-pp-col-label" />
            <col />
            <col />
            <col />
          </colgroup>
          <thead>
            <tr>
              <th scope="col"><span className="lt-pricing-sr">Feature</span></th>
              {WHAT_YOU_GET_COLUMNS.map((c) => (
                <th key={c} scope="col">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {whatYouGetRows(boardPassPrice).map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                {row.cells.map((cell, i) => (
                  <WhatCellView key={WHAT_YOU_GET_COLUMNS[i]} cell={cell} column={WHAT_YOU_GET_COLUMNS[i]} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {children}
      </div>
    </section>
  );
}
