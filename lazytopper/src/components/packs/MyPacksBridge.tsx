import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { trackSaleMoment } from "../../analytics/analytics";
import { trackPackEvent } from "../../lib/packs/packAnalytics";
import type { OwnedPack, PackSku } from "../../services/packs";
import {
  NOT_NOW_LABEL,
  passOffersSnoozed,
  pickPassOwnerOffer,
  snoozePassOffers,
  type PassOwnerOffer,
} from "../passOwnerOffers/passOwnerOffersModel";
import type { SessionRecord } from "../../services/sessionRecords";
import { roundMarks } from "../../lib/mistakeDisplay";
import type { BridgeData } from "./useMyPacksBridge";
export { prepareBridgeData } from "./useMyPacksBridge";
import {
  BRIDGE_ANALYTICS_SURFACE,
  BRIDGE_BOARD_PASS_HREF,
  BRIDGE_COPY,
  BRIDGE_PASS_POINTS,
  BRIDGE_ROWS_COLLAPSED,
  bridgeSamplePath,
  bridgeRows,
  cbqPapersFromRecords,
  firstMarked,
  mistakeLine,
  packPapers,
  paperHref,
  recordsByCode,
  scoreText,
  type BridgeKind,
  type BridgePaper,
  type BridgeRow,
  type GradeAllowance,
} from "./myPacksBridgeModel";
import "./myPacksBridge.css";

/**
 * MyPacksBridge - BRIDGE-PANEL-1 (approved design `MyPacks.dc.html`, owner 7 Nov 19:38 "i approve ... my packs panel"). Below the
 * owned pack cards in My packs, for a signed-in pack owner only:
 *   1. "Your first paper is marked" - only once the student's own first pack paper is graded: its real score and one line from
 *      its own stored mistake numbers (or an honest pointer to the scorecard when none were stored);
 *   2. "Get your papers marked" - every gradable paper of each pack with its real status (marked score / free mark left /
 *      with Board Pass), "Get marked" opening the paper's existing upload or review route, "Download" for a paper not yet
 *      downloaded (opens that pack's files - there is nothing to grade against before);
 *   3. the Board Pass card - only for an owner WITHOUT a paid Board Pass; it links to the existing Board Pass page.
 * Display only: nothing here grades, charges, unlocks or records (CLAUDE.md §4a / §5). Its own chunk, fetched only for a pack owner
 * (myPacksBridgeLoader); a PURE render of data read before My packs is revealed - so it lands in the same commit as the pack cards.
 */
export interface MyPacksBridgeProps {
  packs: readonly OwnedPack[];
  /** Everything the panel shows, read ONCE before My packs is revealed (`prepareBridgeData`), so the panel never grows later. */
  data: BridgeData;
  /** The pack's display title (PacksShop's `ownedPackTitle`, passed in so this chunk does not import the shop back). */
  titleOf: (pack: OwnedPack) => string;
  /** A confirmed Board Pass holder's pack card "Buy": the shop's own central buy path (pop-up + checkout), never new checkout code. */
  onBuyPack: (sku: PackSku, target: string | undefined) => void;
  /** Open (and scroll to) one pack's file list - the existing My packs mechanism. */
  onOpenFiles: (packId: string) => void;
  /**
   * PACKS-TIDY-1 (opt-in, /packs only): `tidy` lays the panel out as part of the collapsed My packs list - a compact first-marked card
   * and one intro line on top, the pack rows (`children`) below, the Board Pass / holder card beside them (>= 1024px) or under them.
   * The per-pack paper rows then live inside each pack's row (PackPapers). Left out: the panel exactly as before.
   */
  tidy?: boolean;
  children?: ReactNode;
}

interface PackGroup {
  pack: OwnedPack;
  rows: BridgeRow[];
}

/** PURE. The groups (one per pack, a paper listed once even when two packs cover it) and the first-marked paper. */
export function bridgeView(
  packs: readonly OwnedPack[],
  records: readonly SessionRecord[],
  opts: { paidPass: boolean; allowance: GradeAllowance | null },
): { groups: PackGroup[]; first: ReturnType<typeof firstMarked> } {
  const byCode = recordsByCode(records);
  const seen = new Set<string>();
  const freeTaken = new Set<BridgeKind>();
  const all: BridgePaper[] = [];
  const groups: PackGroup[] = [];
  for (const pack of packs) {
    const papers = (pack.sku === "pack_cbq" ? cbqPapersFromRecords(pack.target, records) : packPapers(pack)).filter((p) => {
      if (seen.has(p.code)) return false;
      seen.add(p.code);
      return true;
    });
    all.push(...papers);
    if (papers.length > 0) groups.push({ pack, rows: bridgeRows(papers, byCode, { ...opts, freeTaken }) });
  }
  return { groups, first: firstMarked(all, byCode) };
}

function RowAction({ row, packId, onOpenFiles }: { row: BridgeRow; packId: string; onOpenFiles: (packId: string) => void }) {
  const { state, paper } = row;
  if (state.kind === "marked") {
    return (
      <Link className="lt-pb__marked" to={state.href} data-testid="packs-bridge-marked" aria-label={`${paper.label}: marked ${scoreText(state.awarded, state.total)}. Open the scorecard`}>
        {state.partial ? "Part marked" : "Marked"} &middot; {scoreText(state.awarded, state.total)}
      </Link>
    );
  }
  const ghost = row.note === BRIDGE_COPY.withPass;
  if (state.kind === "waiting") {
    return (
      <Link className={`lt-pb__go${ghost ? " lt-pb__go--ghost" : ""}`} to={state.href} data-testid="packs-bridge-get" aria-label={`Get ${paper.label} (${paper.code}) marked`}>
        Get marked
      </Link>
    );
  }
  return (
    <button type="button" className="lt-pb__go lt-pb__go--ghost" onClick={() => onOpenFiles(packId)} data-testid="packs-bridge-download" aria-label={`Download ${paper.label} (${paper.code}) first`}>
      Download
    </button>
  );
}

export function PackPapers({ group, title, onOpenFiles }: { group: PackGroup; title: string | null; onOpenFiles: (packId: string) => void }) {
  const [open, setOpen] = useState(false);
  const rows = open ? group.rows : group.rows.slice(0, BRIDGE_ROWS_COLLAPSED);
  const more = group.rows.length - BRIDGE_ROWS_COLLAPSED;
  return (
    <div className="lt-pb__pack" data-testid="packs-bridge-pack">
      {title && <h4 className="lt-pb__packname">{title}</h4>}
      <ul className="lt-pb__rows">
        {rows.map((row) => (
          <li key={row.paper.code} className="lt-pb__row" data-testid="packs-bridge-row" data-code={row.paper.code}>
            <span className="lt-pb__rmain">
              <span className="lt-pb__rlabel">{row.paper.label}</span>
              <span className="lt-pb__rcode">
                {row.paper.code}
                {row.note && <span data-testid="packs-bridge-note"> &middot; {row.note}</span>}
              </span>
            </span>
            <RowAction row={row} packId={group.pack.packId} onOpenFiles={onOpenFiles} />
          </li>
        ))}
      </ul>
      {more > 0 && (
        <button type="button" className="lt-pb__more" aria-expanded={open} onClick={() => setOpen((v) => !v)} data-testid="packs-bridge-more">
          {open ? "Show fewer papers" : `+ ${more} more ${more === 1 ? "paper" : "papers"}`}
        </button>
      )}
    </div>
  );
}

function FirstMarkedCard({ first, compact = false }: { first: NonNullable<ReturnType<typeof firstMarked>>; compact?: boolean }) {
  const { paper, record } = first;
  const line = mistakeLine(record);
  return (
    <div className={compact ? "lt-pb__first lt-pb__first--compact" : "lt-pb__first"} data-testid="packs-bridge-first">
      <span className="lt-pb__firsth">{BRIDGE_COPY.firstMarked}</span>
      <div className="lt-pb__score">
        <span className="lt-pb__big">{roundMarks(Number(record.marksAwarded) || 0)}</span>
        <span className="lt-pb__of">/ {roundMarks(Number(record.marksTotal) || 0)}</span>
        <span className="lt-pb__which">{paper.label}</span>
      </div>
      <p className="lt-pb__line" data-testid="packs-bridge-first-line">
        {line ?? "Open the scorecard to see where each mark went."}
      </p>
      <div className="lt-pb__btns">
        <Link className="lt-pb__go" to={paperHref(paper, "review")} data-testid="packs-bridge-scorecard">
          View scorecard
        </Link>
      </div>
    </div>
  );
}

function BoardPassCard() {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    trackSaleMoment("sale_moment_shown", { surface: BRIDGE_ANALYTICS_SURFACE, offer: "board_pass", rank: 1 });
  }, []);
  return (
    <aside className="lt-pb__pass" aria-labelledby="packs-bridge-pass-h" data-testid="packs-bridge-pass">
      <span className="lt-pb__kicker">{BRIDGE_COPY.passKicker}</span>
      <h3 id="packs-bridge-pass-h" className="lt-pb__passh">{BRIDGE_COPY.passTitle}</h3>
      <ul className="lt-pb__points">
        {BRIDGE_PASS_POINTS.map((p) => (
          <li key={p.lead}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            <span>
              <b>{p.lead}</b>
              {p.rest}
            </span>
          </li>
        ))}
      </ul>
      <Link
        className="lt-pb__passcta"
        to={BRIDGE_BOARD_PASS_HREF}
        data-testid="packs-bridge-pass-cta"
        onClick={() => trackSaleMoment("sale_moment_tap", { surface: BRIDGE_ANALYTICS_SURFACE, offer: "board_pass", rank: 1 })}
      >
        {BRIDGE_COPY.passCta}
      </Link>
      <span className="lt-pb__keep">{BRIDGE_COPY.passKeep}</span>
    </aside>
  );
}

/**
 * A confirmed Board Pass holder's ONE quiet packs card (PASS-OWNER-PACKS-1 rules and copy). Analytics reuse that feature's existing
 * events: `pack_view` (surface "pass_me") once when shown; the Buy tap goes through the shop's handleBuy, which sends `pack_checkout`
 * with from "pass_me". "Not now" is that feature's one-day, all-offers hide on this device.
 */
function HolderPacksCard({ offer, onBuy, onNotNow }: { offer: PassOwnerOffer; onBuy: (sku: PackSku, target: string | undefined) => void; onNotNow: () => void }) {
  const sent = useRef(false);
  const firstSku = offer.items[0]?.sku;
  useEffect(() => {
    if (!firstSku || sent.current) return;
    sent.current = true;
    trackPackEvent("pack_view", firstSku, "pass_me");
  }, [firstSku]);
  return (
    <aside className="lt-pb__pass lt-pb__holder" aria-label="Printed practice packs" data-testid="packs-bridge-holder">
      <span className="lt-pb__kicker">PDF packs</span>
      <p className="lt-pb__holderlead">{offer.lead}</p>
      <div className="lt-pb__holderrow">
        {offer.items.map((item) => (
          <button
            key={`${item.sku}:${item.target ?? "all"}`}
            type="button"
            className="lt-pb__holderbuy"
            onClick={() => onBuy(item.sku, item.target)}
            data-testid={`packs-bridge-holder-buy-${item.sku}${item.target ? `-${item.target}` : ""}`}
          >
            {item.label}
          </button>
        ))}
        <button type="button" className="lt-pb__holderlater" onClick={onNotNow} data-testid="packs-bridge-holder-not-now">
          {NOT_NOW_LABEL}
        </button>
      </div>
    </aside>
  );
}

export default function MyPacksBridge({ packs, data, titleOf, onOpenFiles, onBuyPack, tidy = false, children }: MyPacksBridgeProps) {
  const { records, allowance, paidPass } = data;
  const samplePath = bridgeSamplePath(packs);
  const { groups, first } = useMemo(() => bridgeView(packs, records, { paidPass, allowance }), [packs, records, paidPass, allowance]);
  // The Board Pass card only to an owner KNOWN not to hold a paid Board Pass (never on a guess, never its view event either).
  const showPass = !paidPass && data.entitlementKnown;
  // Owner ruling 8 Nov 22:11: a CONFIRMED Board Pass holder gets ONE quiet packs card in the same place instead (PASS-OWNER-PACKS-1's
  // "pass_me" rule: the CBQ Packs they do not own, else the Bundle, else nothing), from the SERVER's owned list (`packs` = /api/packs/mine).
  const [snoozed, setSnoozed] = useState<boolean>(() => passOffersSnoozed(Date.now()));
  const holderOffer = paidPass && data.entitlementKnown && !snoozed ? pickPassOwnerOffer("pass_me", {}, packs) : null;
  if (packs.length === 0) return null;
  const hasPapers = groups.length > 0;
  // PACKS-FIRSTBUY-1: a CBQ-only owner has no paper rows until a CBQ paper is marked, but still gets the intro line + the CBQ sample PDF link.
  const cbqOnly = packs.every((p) => p.sku === "pack_cbq");
  const showIntro = hasPapers || cbqOnly;
  const side = showPass || holderOffer !== null;
  if (tidy) {
    const holder = holderOffer ? (
      <HolderPacksCard
        offer={holderOffer}
        onBuy={onBuyPack}
        onNotNow={() => {
          snoozePassOffers(Date.now());
          setSnoozed(true);
        }}
      />
    ) : null;
    return (
      <div className={side ? "lt-pbt" : "lt-pbt lt-pbt--single"} data-testid="packs-bridge">
        <div className="lt-pbt__main">
          {first && (
            <div className="lt-pb lt-pb--inline">
              <FirstMarkedCard first={first} compact />
            </div>
          )}
          {showIntro && (
            <div className="lt-pbt__intro">
              <p className="lt-pbt__introp">
                {BRIDGE_COPY.intro} {BRIDGE_COPY.free}
              </p>
              <a className="lt-pbt__sample" href={samplePath} target="_blank" rel="noopener" data-testid="packs-bridge-sample">
                {BRIDGE_COPY.sample}
              </a>
            </div>
          )}
          {children}
        </div>
        {side && (
          <div className="lt-pbt__side">
            {showPass && <BoardPassCard />}
            {holder}
          </div>
        )}
      </div>
    );
  }
  if (!first && !showIntro && !side) return null;
  return (
    <div className={`lt-pb${!side ? " lt-pb--nopass" : ""}${!first && !showIntro ? " lt-pb--passonly" : ""}`} data-testid="packs-bridge">
      {(first || showIntro) && (
      <div className="lt-pb__main">
        {first && <FirstMarkedCard first={first} />}
        {showIntro && (
          <>
            <div className="lt-pb__intro">
              {hasPapers && <h3 className="lt-pb__h">{BRIDGE_COPY.heading}</h3>}
              <p className="lt-pb__p">
                {BRIDGE_COPY.intro} {BRIDGE_COPY.free}
              </p>
              <a className="lt-pb__sample" href={samplePath} target="_blank" rel="noopener" data-testid="packs-bridge-sample">
                {BRIDGE_COPY.sample}
              </a>
            </div>
            {groups.map((g) => (
              <PackPapers key={g.pack.packId} group={g} title={groups.length > 1 ? titleOf(g.pack) : null} onOpenFiles={onOpenFiles} />
            ))}
          </>
        )}
      </div>
      )}
      {showPass && <BoardPassCard />}
      {holderOffer && (
        <HolderPacksCard
          offer={holderOffer}
          onBuy={onBuyPack}
          onNotNow={() => {
            snoozePassOffers(Date.now());
            setSnoozed(true);
          }}
        />
      )}
    </div>
  );
}
