import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { trackSaleMoment } from "../../analytics/analytics";
import type { OwnedPack } from "../../services/packs";
import type { SessionRecord } from "../../services/sessionRecords";
import { roundMarks } from "../../lib/mistakeDisplay";
import { useMyPacksBridge } from "./useMyPacksBridge";
import {
  BRIDGE_ANALYTICS_SURFACE,
  BRIDGE_BOARD_PASS_HREF,
  BRIDGE_COPY,
  BRIDGE_PASS_POINTS,
  BRIDGE_ROWS_COLLAPSED,
  BRIDGE_SAMPLE_PDF_PATH,
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
 * Display only: nothing here grades, charges, unlocks or records (CLAUDE.md §4a / §5). Lazy chunk (PacksShop loads it).
 */
export interface MyPacksBridgeProps {
  packs: readonly OwnedPack[];
  /** A server-backed paid Board Pass (usePaidPremium) - no Board Pass card, every paper "with Board Pass". */
  paidPass: boolean;
  /** The pack's display title (PacksShop's `ownedPackTitle`, passed in so this chunk does not import the shop back). */
  titleOf: (pack: OwnedPack) => string;
  /** Open (and scroll to) one pack's file list - the existing My packs mechanism. */
  onOpenFiles: (packId: string) => void;
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

function PackPapers({ group, title, onOpenFiles }: { group: PackGroup; title: string | null; onOpenFiles: (packId: string) => void }) {
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

function FirstMarkedCard({ first }: { first: NonNullable<ReturnType<typeof firstMarked>> }) {
  const { paper, record } = first;
  const line = mistakeLine(record);
  return (
    <div className="lt-pb__first" data-testid="packs-bridge-first">
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

export default function MyPacksBridge({ packs, paidPass, titleOf, onOpenFiles }: MyPacksBridgeProps) {
  const { user } = useAuth();
  const { records, allowance } = useMyPacksBridge(user);
  const { groups, first } = useMemo(() => bridgeView(packs, records, { paidPass, allowance }), [packs, records, paidPass, allowance]);
  if (packs.length === 0) return null;
  const hasPapers = groups.length > 0;
  if (!first && !hasPapers && paidPass) return null;
  return (
    <div className={`lt-pb${paidPass ? " lt-pb--nopass" : ""}`} data-testid="packs-bridge">
      <div className="lt-pb__main">
        {first && <FirstMarkedCard first={first} />}
        {hasPapers && (
          <>
            <div className="lt-pb__intro">
              <h3 className="lt-pb__h">{BRIDGE_COPY.heading}</h3>
              <p className="lt-pb__p">
                {BRIDGE_COPY.intro} {BRIDGE_COPY.free}{" "}
                <a className="lt-pb__sample" href={BRIDGE_SAMPLE_PDF_PATH} target="_blank" rel="noopener" data-testid="packs-bridge-sample">
                  {BRIDGE_COPY.sample}
                </a>
              </p>
            </div>
            {groups.map((g) => (
              <PackPapers key={g.pack.packId} group={g} title={groups.length > 1 ? titleOf(g.pack) : null} onOpenFiles={onOpenFiles} />
            ))}
          </>
        )}
      </div>
      {!paidPass && <BoardPassCard />}
    </div>
  );
}
