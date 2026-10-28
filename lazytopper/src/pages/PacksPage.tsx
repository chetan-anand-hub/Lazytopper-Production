import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PublicLegalFooter from "../components/ux/PublicLegalFooter";
import { withSigninRedirect } from "../services/freeCheckClient";
import { newCheckoutAttemptId } from "../analytics/analytics";
import { trackPackCheckout, trackPackEvent, trackPackPurchase } from "../lib/packs/packAnalytics";
import {
  PACK_ALREADY_OWNED_COPY,
  PACK_CHAPTER_SLUGS,
  PACK_DETAILS_UNAVAILABLE_COPY,
  PacksLicenseeUnavailableError,
  hasLicenseeEmail,
  PACK_CHECKING_COPY,
  PACK_EXPIRED_COPY,
  PACK_FAILED_COPY,
  PACK_PAID_COPY,
  PACK_PRICE_INR,
  PACK_STILL_CONFIRMING_COPY,
  buyPack,
  chaptersOfSubject,
  checkPackOrder,
  fetchMyPacks,
  isAlreadyOwned,
  isPacksClientEnabled,
  packDescription,
  packIdOf,
  packPriceLabel,
  type MyPacks,
  type OwnedPack,
  type PackSku,
  type PackSubject,
} from "../services/packs";
import { BUNDLE_NAME, REDOWNLOAD_COPY, REDOWNLOAD_SHORT, packChapterLabel } from "../lib/packs/packLabels";
import { readPacksQuery } from "../lib/packs/packEntry";
import "./packs.css";

/** Where sign-in returns the student. A constant, never taken from the URL. */
export const PACKS_RETURN_PATH = "/packs";

const PackDialog = lazy(() => import("./PackDialog"));

const POLL_DELAYS_MS: readonly number[] = [0, 3_000, 10_000, 30_000];

const chapterLabel = packChapterLabel;

/** "Chapter Pack · Real Numbers" etc. — the title of an owned pack. */
export function ownedPackTitle(p: Pick<OwnedPack, "sku" | "target">): string {
  switch (p.sku) {
    case "pack_chapter":
      return `Chapter Pack · ${chapterLabel(p.target)}`;
    case "pack_mock":
      return `Mock Pack · ${p.target === "science" ? "Science" : "Maths"}`;
    case "pack_subject":
      return `Subject Pack · ${p.target === "science" ? "Science" : "Maths"}`;
    case "pack_bundle":
      return BUNDLE_NAME;
    default:
      return "PDF pack";
  }
}

function paidDate(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "";
  return new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

type Counts = Record<string, number>;

/**
 * Exact per-chapter question counts from the bank, MINUS the figure exclusions. NOTHING is loaded until the
 * visitor touches a picker (`request`): a visitor who only reads the page never fetches the bank. A chapter is
 * counted first when it is the one picked; the rest follow so subject and bundle totals can appear.
 */
function useChapterCounts(): { counts: Counts; request: (first?: string) => void } {
  const [counts, setCounts] = useState<Counts>({});
  const started = useRef<Set<string>>(new Set());
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const request = useCallback((first?: string) => {
    const order = first ? [first, ...PACK_CHAPTER_SLUGS.filter((s) => s !== first)] : [...PACK_CHAPTER_SLUGS];
    const todo = order.filter((s) => !started.current.has(s));
    if (todo.length === 0) return;
    todo.forEach((s) => started.current.add(s));
    void (async () => {
      try {
        const content = await import("../lib/packs/packContent");
        for (const slug of todo) {
          await content.loadChapter(slug);
          if (!alive.current) return;
          const n = content.countChapterQuestions(slug);
          setCounts((c) => ({ ...c, [slug]: n }));
        }
      } catch {
        /* honest: no count is shown rather than a guessed one */
      }
    })();
  }, []);
  return { counts, request };
}

interface BuyState {
  key: string;
  phase: "idle" | "busy" | "checking" | "confirming" | "paid" | "failed" | "expired" | "owned";
}

export default function PacksPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const enabled = isPacksClientEnabled();
  const { counts, request: requestCounts } = useChapterCounts();

  const [mine, setMine] = useState<MyPacks | null>(null);
  const [mineError, setMineError] = useState<false | "failed" | "details">(false);
  const [chapter, setChapter] = useState("");
  const [subject, setSubject] = useState<PackSubject>("maths");
  const [openSku, setOpenSku] = useState<PackSku | null>(null);
  const [entrySlide, setEntrySlide] = useState(0);
  const [buy, setBuy] = useState<BuyState>({ key: "", phase: "idle" });
  const mounted = useRef(true);
  const myPacksRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    mounted.current = true;
    trackPackEvent("pack_view");
    return () => {
      mounted.current = false;
    };
  }, []);

  const loadMine = useCallback(async () => {
    try {
      const data = await fetchMyPacks();
      if (mounted.current) {
        setMine(data);
        setMineError(false);
      }
      return data;
    } catch (e) {
      if (mounted.current) setMineError(e instanceof PacksLicenseeUnavailableError ? "details" : "failed");
      return null;
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setMine(null);
      return;
    }
    void loadMine();
  }, [user, loadMine]);

  const owned = useMemo(() => mine?.packs ?? [], [mine]);

  const subjectTotal = useCallback(
    (s: PackSubject): number | null => {
      const list = chaptersOfSubject(s);
      if (!list.every((slug) => counts[slug] !== undefined)) return null;
      return list.reduce((sum, slug) => sum + counts[slug], 0);
    },
    [counts],
  );

  function onSubject(next: PackSubject) {
    setSubject(next);
    requestCounts();
  }
  function onChapter(slug: string) {
    setChapter(slug);
    if (slug) requestCounts(slug);
  }
  function openPack(sku: PackSku) {
    setEntrySlide(0);
    setOpenSku(sku);
    requestCounts(sku === "pack_chapter" && chapter ? chapter : undefined);
  }
  const closePack = useCallback(() => {
    setOpenSku(null);
    setEntrySlide(0);
  }, []);

  // Entry links (packEntry.ts contract): ?chapter= / ?mock= / ?pack= (+ ?subject=) / ?view=sample open the matching pop-up, once.
  // utm_* and unknown values are ignored; closing never re-opens it.
  const entryDone = useRef(false);
  useEffect(() => {
    if (entryDone.current) return;
    const q = readPacksQuery(location.search);
    let sku: PackSku | null = null;
    let chosenChapter = "";
    let chosenSubject: PackSubject | null = null;
    if (q.chapter && PACK_CHAPTER_SLUGS.includes(q.chapter)) {
      sku = "pack_chapter";
      chosenChapter = q.chapter;
    } else if (q.mock) {
      sku = "pack_mock";
      chosenSubject = q.mock;
    } else if (q.pack) {
      sku = (`pack_${q.pack}`) as PackSku;
      if (q.pack === "mock" || q.pack === "subject") chosenSubject = q.subject;
    } else if (q.view === "sample") {
      sku = "pack_chapter";
    }
    if (!sku) return;
    entryDone.current = true;
    if (chosenChapter) setChapter(chosenChapter);
    if (chosenSubject) setSubject(chosenSubject);
    setEntrySlide(q.view === "sample" ? 1 : 0);
    setOpenSku(sku);
    requestCounts(chosenChapter || undefined);
  }, [location.search, requestCounts]);

  // `#my-packs` scrolls to the My packs section once it exists.
  useEffect(() => {
    if (location.hash === "#my-packs") myPacksRef.current?.scrollIntoView?.({ block: "start" });
  }, [location.hash, mine]);

  async function handleBuy(sku: PackSku, target: string | undefined) {
    if (!enabled || buy.phase === "busy" || buy.phase === "checking") return;
    if (!user) {
      navigate(withSigninRedirect("/login", PACKS_RETURN_PATH));
      return;
    }
    const key = packIdOf(sku, target);
    if (isAlreadyOwned(owned, sku, target)) {
      setBuy({ key, phase: "owned" });
      return;
    }
    setBuy({ key, phase: "busy" });
    const details = { sku, itemName: packDescription(sku, target, target ? chapterLabel(target) : undefined), valueInr: PACK_PRICE_INR[sku] };
    const attemptId = newCheckoutAttemptId();
    trackPackCheckout(details);
    const outcome = await buyPack(sku, target, { chapterName: target ? chapterLabel(target) : undefined });
    if (!mounted.current) return;
    if (outcome.status === "paid") {
      trackPackPurchase({ ...details, valueInr: outcome.amountInr ?? details.valueInr, transactionId: outcome.paymentId || attemptId });
      setBuy({ key, phase: "paid" });
      await loadMine();
      myPacksRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    } else if (outcome.status === "pending") {
      setBuy({ key, phase: "checking" });
      let settled = false;
      let elapsed = 0;
      for (const at of POLL_DELAYS_MS) {
        const wait = Math.max(0, at - elapsed);
        elapsed = Math.max(elapsed, at);
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
        if (!mounted.current) return;
        const status = await checkPackOrder(outcome.orderId);
        if (!mounted.current) return;
        if (status.state === "paid") {
          trackPackPurchase({ ...details, valueInr: status.amountInr ?? details.valueInr, transactionId: status.paymentId || outcome.paymentId || attemptId });
          settled = true;
          break;
        }
        if (status.state === "expired") {
          setBuy({ key, phase: "expired" });
          return;
        }
      }
      if (settled) {
        setBuy({ key, phase: "paid" });
        await loadMine();
      } else {
        setBuy({ key, phase: "confirming" });
      }
    } else if (outcome.status === "already_owned") {
      setBuy({ key, phase: "owned" });
      await loadMine();
    } else if (outcome.status === "expired") {
      setBuy({ key, phase: "expired" });
    } else if (outcome.status === "dismissed") {
      setBuy({ key: "", phase: "idle" });
    } else {
      setBuy({ key, phase: "failed" });
    }
  }

  const mathsTotal = subjectTotal("maths");
  const scienceTotal = subjectTotal("science");
  const bundleTotal = mathsTotal !== null && scienceTotal !== null ? mathsTotal + scienceTotal : null;

  // A confirmed payment closes the pop-up; the status line and My packs take over.
  useEffect(() => {
    if (buy.phase === "paid") setOpenSku(null);
  }, [buy.phase]);

  /** The buy button (and its status notes) for one SKU. `prefix` picks the pop-up's or the page's class set. */
  function buyArea(sku: PackSku, target: string | undefined, ready: boolean, prefix: "lt-pkd" | "lt-packs" = "lt-pkd") {
    const key = packIdOf(sku, target);
    const isOwned = ready && isAlreadyOwned(owned, sku, target);
    const mine_ = buy.key === key;
    const busy = mine_ && (buy.phase === "busy" || buy.phase === "checking");
    let label = `Buy for ${packPriceLabel(sku)}`;
    if (!enabled) label = "Opens soon";
    else if (!ready) label = "Choose a chapter first";
    else if (isOwned) label = "You own this";
    else if (busy) label = buy.phase === "checking" ? PACK_CHECKING_COPY : "Opening checkout…";
    else if (!user && !authLoading) label = `Sign in to buy · ${packPriceLabel(sku)}`;
    return (
      <>
        <button
          type="button"
          className={`${prefix}__btn`}
          disabled={!enabled || !ready || isOwned || busy}
          onClick={() => void handleBuy(sku, target)}
          data-testid={`packs-buy-${sku}`}
        >
          {label}
        </button>
        {mine_ && buy.phase === "confirming" && <p className={`${prefix}__note`} role="status">{PACK_STILL_CONFIRMING_COPY}</p>}
        {mine_ && buy.phase === "failed" && <p className={`${prefix}__note ${prefix}__note--bad`} role="alert">{PACK_FAILED_COPY}</p>}
        {mine_ && buy.phase === "expired" && <p className={`${prefix}__note`} role="alert">{PACK_EXPIRED_COPY}</p>}
        {mine_ && buy.phase === "owned" && <p className={`${prefix}__note`} role="status">{PACK_ALREADY_OWNED_COPY}</p>}
      </>
    );
  }

  const dialogTarget = openSku === "pack_chapter" ? chapter || undefined : openSku === "pack_mock" || openSku === "pack_subject" ? subject : undefined;
  const dialogQuestions =
    openSku === "pack_chapter" ? (chapter ? counts[chapter] ?? null : null) : openSku === "pack_subject" ? subjectTotal(subject) : openSku === "pack_bundle" ? bundleTotal : null;
  const showMine = Boolean(user) && (mineError !== false || (mine !== null && mine.packs.length > 0));
  const afterPay = buy.phase === "paid" || buy.phase === "checking" || buy.phase === "confirming";

  return (
    <main className="lt-packs" aria-label="LazyTopper PDF packs">
      {showMine && (
        <section className="lt-packs__mine" id="my-packs" ref={myPacksRef} aria-labelledby="packs-mine-h" data-testid="packs-mine">
          <div className="lt-packs__w">
            <h2 id="packs-mine-h">My packs</h2>
            {mineError && (
              <p className="lt-packs__note lt-packs__note--bad" role="alert">
                {mineError === "details" ? PACK_DETAILS_UNAVAILABLE_COPY : <>We couldn&rsquo;t load your packs.</>}{" "}
                <button type="button" className="lt-packs__link" onClick={() => void loadMine()}>Retry</button>
              </p>
            )}
            {mine && mine.packs.length > 0 && !hasLicenseeEmail(mine.licensee) && (
              <p className="lt-packs__note lt-packs__note--bad" role="alert" data-testid="packs-details-unavailable">
                {PACK_DETAILS_UNAVAILABLE_COPY}{" "}
                <button type="button" className="lt-packs__link" onClick={() => void loadMine()}>Retry</button>
              </p>
            )}
            {mine && hasLicenseeEmail(mine.licensee) && mine.packs.map((p) => <OwnedPackCard key={p.packId} pack={p} mine={mine} />)}
          </div>
        </section>
      )}

      {afterPay && openSku === null && (
        <div className="lt-packs__w">
          <p className="lt-packs__status" role="status" data-testid="packs-status">
            {buy.phase === "paid" ? PACK_PAID_COPY : buy.phase === "checking" ? PACK_CHECKING_COPY : PACK_STILL_CONFIRMING_COPY}
          </p>
        </div>
      )}

      <section className="lt-packs__hero" aria-labelledby="packs-h1">
        <div className="lt-packs__w lt-packs__herogrid">
          <div className="lt-packs__copy">
            <p className="lt-packs__kicker">PDF packs · CBSE Board Exam 2027</p>
            <h1 id="packs-h1">Every question. Worked solutions.</h1>
            <p className="lt-packs__lede">
              <span className="lt-packs__lede--long">Printable Class 10 Maths and Science question banks. Solve with a pen, then check your work against the worked solutions.</span>
              <span className="lt-packs__lede--short">Print, solve with a pen, check against worked solutions. Tap a pack to see inside.</span>
            </p>
            <p className="lt-packs__terms lt-packs__terms--hero">One-time payment · never renews · {REDOWNLOAD_SHORT}</p>
          </div>
          <div className="lt-packs__tiles" role="list">
            {TILES.map((t) => (
              <button
                key={t.sku}
                type="button"
                role="listitem"
                className={t.best ? "lt-packs__tile lt-packs__tile--best" : "lt-packs__tile"}
                onClick={() => openPack(t.sku)}
                aria-haspopup="dialog"
                data-testid={`packs-card-${t.id}`}
              >
                <span className="lt-packs__tkick">{t.kicker}</span>
                <span className="lt-packs__tname">{t.name}</span>
                <span className="lt-packs__tprice">{packPriceLabel(t.sku)}</span>
                <span className="lt-packs__tline lt-packs__tline--long">{t.lineLong}</span>
                <span className="lt-packs__tline lt-packs__tline--short">{t.lineShort}</span>
                <span className="lt-packs__topen">See inside →</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <p className="lt-packs__terms lt-packs__terms--page">One-time payment · never renews · {REDOWNLOAD_SHORT}</p>

      <section aria-labelledby="packs-faq-h" className="lt-packs__faq">
        <div className="lt-packs__w">
          <h2 id="packs-faq-h" className="lt-packs__sr">Questions</h2>
          <div className="lt-packs__faqgrid">
            <details>
              <summary>What&rsquo;s inside a pack?</summary>
              <p>
                For each chapter: its questions grouped by CBSE section (A to E) with a matching answer key with worked solutions, two chapter
                tests and one worksheet (each with a key). Mock packs are eight full 80-mark papers per subject with keys. A few questions that depend on a
                diagram we can&rsquo;t print cleanly are left out, so every page can be solved on paper.
              </p>
            </details>
            <details>
              <summary>Can I download again later?</summary>
              <p>
                Yes. {REDOWNLOAD_COPY}: sign in, open My packs at the top of this page and download any file as often as you like. Packs are for your own
                use; each PDF carries your name and email on every page, so please don&rsquo;t share the files.
              </p>
            </details>
            <details>
              <summary>Can I get my answers marked?</summary>
              <p>
                Chapter tests, worksheets and mock papers print a code (like PK-M-FULL-M1). After you solve one, upload your answers from the &ldquo;papers
                waiting for your answers&rdquo; row on Home and LazyTopper marks it. What marking you get there depends on your LazyTopper plan.
              </p>
            </details>
            <details>
              <summary>How does the Board Pass credit work?</summary>
              <p>
                Packs are one-time and never renew. If you take the Board Pass within 7 days of buying a pack, the pack price comes off the Board Pass. The
                Board Pass adds what a PDF can&rsquo;t: your answers marked step by step, Mistake Intelligence, the tutor for doubts and online timed
                tests. <Link to="/pricing">Compare with the Board Pass</Link>.
              </p>
            </details>
            <details>
              <summary>What if a file doesn&rsquo;t open?</summary>
              <p>
                Download it again from My packs; PDFs open in any PDF reader or in your browser. Still stuck? <Link to="/contact">Contact us</Link>.
              </p>
            </details>
            <details>
              <summary>What about refunds?</summary>
              <p>
                Read the <Link to="/legal/refund">cancellation and refund policy</Link> before you buy.
              </p>
            </details>
          </div>
        </div>
      </section>
      <PublicLegalFooter />

      {openSku &&
        createPortal(
          <Suspense fallback={null}>
            <PackDialog
              sku={openSku}
              chapter={chapter}
              subject={subject}
              onChapter={onChapter}
              onSubject={onSubject}
              questions={dialogQuestions}
              buy={buyArea(openSku, dialogTarget, openSku !== "pack_chapter" || Boolean(chapter))}
              onClose={closePack}
              initialSlide={entrySlide}
            />
          </Suspense>,
          document.body,
        )}
    </main>
  );
}

const TILES: ReadonlyArray<{ sku: PackSku; id: string; kicker: string; name: string; lineLong: string; lineShort: string; best?: boolean }> = [
  { sku: "pack_chapter", id: "chapter", kicker: "One chapter", name: "Chapter Pack", lineLong: "Every question of a chapter, with worked solutions", lineShort: "Every question + worked solutions" },
  { sku: "pack_mock", id: "mock", kicker: "Board papers", name: "Mock Pack", lineLong: "8 full papers, 80 marks each, with keys", lineShort: "8 full papers, 80 marks" },
  { sku: "pack_subject", id: "subject", kicker: "Whole subject", name: "Subject Pack", lineLong: "Every chapter of a subject plus its 8 mocks", lineShort: "All chapters + 8 mocks" },
  { sku: "pack_bundle", id: "bundle", kicker: "Best value", name: BUNDLE_NAME, lineLong: "All 27 chapters and 16 mock papers", lineShort: "All 27 chapters + 16 mocks", best: true },
];

type FilesState =
  | { phase: "closed" }
  | { phase: "loading" }
  | { phase: "error" }
  | { phase: "ready"; groups: Array<{ group: string; files: Array<{ id: string; label: string; build: () => Promise<void> }> }> };

function OwnedPackCard({ pack, mine }: { pack: OwnedPack; mine: MyPacks }) {
  const { user } = useAuth();
  const [state, setState] = useState<FilesState>({ phase: "closed" });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);

  async function open() {
    if (state.phase === "loading") return;
    if (state.phase === "ready") {
      setState({ phase: "closed" });
      return;
    }
    setState({ phase: "loading" });
    try {
      const { buildPackFiles, groupPackFiles } = await import("../lib/packs/buildPackFiles");
      const files = await buildPackFiles(
        { packId: pack.packId, sku: pack.sku as PackSku, target: pack.target },
        {
          licensee: mine.licensee,
          owned: mine.packs,
          user,
          onDownload: (sku) => trackPackEvent("pack_download", sku),
        },
      );
      setState({ phase: "ready", groups: groupPackFiles(files) });
    } catch {
      setState({ phase: "error" });
    }
  }

  async function download(file: { id: string; build: () => Promise<void> }) {
    if (busyId) return;
    setBusyId(file.id);
    setFailedId(null);
    try {
      await file.build();
    } catch {
      setFailedId(file.id);
    } finally {
      setBusyId(null);
    }
  }

  const when = paidDate(pack.paidAt);
  return (
    <div className="lt-packs__own" data-testid="packs-owned">
      <div className="lt-packs__own-head">
        <div>
          <h3>{ownedPackTitle(pack)}</h3>
          {when && <p className="lt-packs__muted">Bought {when}</p>}
        </div>
        <button type="button" className="lt-packs__btn lt-packs__btn--ghost" onClick={() => void open()} aria-expanded={state.phase === "ready"}>
          {state.phase === "loading" ? "Preparing…" : state.phase === "ready" ? "Hide files" : "Show files"}
        </button>
      </div>
      {state.phase === "error" && (
        <p className="lt-packs__note lt-packs__note--bad" role="alert">
          We couldn&rsquo;t prepare these files. <button type="button" className="lt-packs__link" onClick={() => void open()}>Retry</button>
        </p>
      )}
      {state.phase === "ready" &&
        (state.groups.length === 0 ? (
          <p className="lt-packs__muted">No printable files could be prepared for this pack yet.</p>
        ) : (
          state.groups.map((g) => (
            <div key={g.group} className="lt-packs__grp">
              <h4>{g.group}</h4>
              <ul className="lt-packs__files">
                {g.files.map((f) => (
                  <li key={f.id}>
                    <span>{f.label}</span>
                    <button
                      type="button"
                      className="lt-packs__btn lt-packs__btn--small"
                      disabled={busyId !== null}
                      onClick={() => void download(f)}
                    >
                      {busyId === f.id ? "Preparing PDF…" : failedId === f.id ? "Retry" : "Download"}
                    </button>
                    {failedId === f.id && <span className="lt-packs__note lt-packs__note--bad" role="alert">That didn&rsquo;t work. Try again.</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))
        ))}
    </div>
  );
}
