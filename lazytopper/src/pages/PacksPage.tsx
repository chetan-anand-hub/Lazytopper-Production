import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  subjectLabel,
  type MyPacks,
  type OwnedPack,
  type PackSku,
  type PackSubject,
} from "../services/packs";
import { desktopTopicBySlug } from "../lib/desktop/topics";
import "./packs.css";

/** Where sign-in returns the student. A constant, never taken from the URL. */
export const PACKS_RETURN_PATH = "/packs";

const POLL_DELAYS_MS: readonly number[] = [0, 3_000, 10_000, 30_000];

const chapterLabel = (slug: string): string => desktopTopicBySlug(slug)?.name ?? slug;

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
      return "Complete Bundle · Maths + Science";
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

const nf = (n: number): string => n.toLocaleString("en-IN");

interface BuyState {
  key: string;
  phase: "idle" | "busy" | "checking" | "confirming" | "paid" | "failed" | "expired" | "owned";
}

export default function PacksPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const enabled = isPacksClientEnabled();
  const { counts, request: requestCounts } = useChapterCounts();

  const [mine, setMine] = useState<MyPacks | null>(null);
  const [mineError, setMineError] = useState<false | "failed" | "details">(false);
  const [chapter, setChapter] = useState("");
  const [subject, setSubject] = useState<PackSubject>("maths");
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

  const chapterCount = chapter && counts[chapter] !== undefined ? counts[chapter] : null;
  const mathsTotal = subjectTotal("maths");
  const scienceTotal = subjectTotal("science");
  const bundleTotal = mathsTotal !== null && scienceTotal !== null ? mathsTotal + scienceTotal : null;
  const selectedSubjectTotal = subjectTotal(subject);

  function buyArea(sku: PackSku, target: string | undefined, ready: boolean) {
    const key = packIdOf(sku, target);
    const isOwned = ready && isAlreadyOwned(owned, sku, target);
    const mine_ = buy.key === key;
    const busy = mine_ && (buy.phase === "busy" || buy.phase === "checking");
    let label = `Buy for ${packPriceLabel(sku)}`;
    if (!enabled) label = "Opens soon";
    else if (isOwned) label = "You own this";
    else if (busy) label = buy.phase === "checking" ? PACK_CHECKING_COPY : "Opening checkout…";
    else if (!user && !authLoading) label = `Sign in to buy · ${packPriceLabel(sku)}`;
    return (
      <div className="lt-packs__buy">
        <button
          type="button"
          className="lt-packs__btn"
          disabled={!enabled || !ready || isOwned || busy}
          onClick={() => void handleBuy(sku, target)}
          data-testid={`packs-buy-${sku}`}
        >
          {label}
        </button>
        {mine_ && buy.phase === "paid" && <p className="lt-packs__note lt-packs__note--ok" role="status">{PACK_PAID_COPY}</p>}
        {mine_ && buy.phase === "confirming" && <p className="lt-packs__note" role="status">{PACK_STILL_CONFIRMING_COPY}</p>}
        {mine_ && buy.phase === "failed" && <p className="lt-packs__note lt-packs__note--bad" role="alert">{PACK_FAILED_COPY}</p>}
        {mine_ && buy.phase === "expired" && <p className="lt-packs__note" role="alert">{PACK_EXPIRED_COPY}</p>}
        {mine_ && buy.phase === "owned" && <p className="lt-packs__note" role="status">{PACK_ALREADY_OWNED_COPY}</p>}
      </div>
    );
  }

  const chapterReady = Boolean(chapter);

  return (
    <main className="lt-packs" aria-label="LazyTopper PDF packs">
      <header className="lt-packs__hero">
        <div className="lt-packs__w">
          <nav className="lt-packs__nav" aria-label="Packs navigation">
            <Link to="/pricing" className="lt-packs__back">← Pricing</Link>
            <span className="lt-packs__brand">LazyTopper</span>
          </nav>
          <p className="lt-packs__kicker">PDF packs · Class 10 CBSE</p>
          <h1>Printable chapter-wise question banks with worked solutions</h1>
          <p className="lt-packs__lede">
            Every question in a chapter, section by section, with a worked solution for every question and an answer key you open
            after you try. Print it, solve it with a pen, check it. Plus two chapter tests and a worksheet per chapter, and full
            board-pattern mock papers.
          </p>
          <p className="lt-packs__lede lt-packs__lede--small">One-time payment · never renews · price credited to the Board Pass if you upgrade within 7 days.</p>
        </div>
      </header>

      <div className="lt-packs__w lt-packs__body">
        {user && (
          <section className="lt-packs__mine" ref={myPacksRef} aria-labelledby="packs-mine-h" data-testid="packs-mine">
            <h2 id="packs-mine-h">My packs</h2>
            {mineError && (
              <p className="lt-packs__note lt-packs__note--bad" role="alert">
                {mineError === "details" ? PACK_DETAILS_UNAVAILABLE_COPY : <>We couldn&rsquo;t load your packs.</>}{" "}
                <button type="button" className="lt-packs__link" onClick={() => void loadMine()}>Retry</button>
              </p>
            )}
            {!mineError && mine === null && <p className="lt-packs__muted">Loading your packs…</p>}
            {mine && mine.packs.length > 0 && !hasLicenseeEmail(mine.licensee) && (
              <p className="lt-packs__note lt-packs__note--bad" role="alert" data-testid="packs-details-unavailable">
                {PACK_DETAILS_UNAVAILABLE_COPY}{" "}
                <button type="button" className="lt-packs__link" onClick={() => void loadMine()}>Retry</button>
              </p>
            )}
            {mine && mine.packs.length === 0 && (
              <p className="lt-packs__muted">You don&rsquo;t own a pack yet. Pick one below &mdash; it appears here the moment the payment is confirmed.</p>
            )}
            {mine && hasLicenseeEmail(mine.licensee) && mine.packs.map((p) => <OwnedPackCard key={p.packId} pack={p} mine={mine} />)}
          </section>
        )}

        <section aria-labelledby="packs-choose-h">
          <h2 id="packs-choose-h">Choose a pack</h2>
          <div className="lt-packs__grid">
            <article className="lt-packs__card" data-testid="packs-card-chapter">
              <p className="lt-packs__tag">One chapter</p>
              <h3>Chapter Pack</h3>
              <p className="lt-packs__price">{packPriceLabel("pack_chapter")}</p>
              <label className="lt-packs__label" htmlFor="packs-chapter">Pick a chapter</label>
              <select id="packs-chapter" className="lt-packs__select" value={chapter} onChange={(e) => {
                  setChapter(e.target.value);
                  if (e.target.value) requestCounts(e.target.value);
                }}>
                <option value="">Choose a chapter…</option>
                {(["maths", "science"] as const).map((s) => (
                  <optgroup key={s} label={subjectLabel(s)}>
                    {chaptersOfSubject(s).map((slug) => (
                      <option key={slug} value={slug}>{chapterLabel(slug)}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <ul className="lt-packs__list">
                <li>
                  {chapterCount !== null
                    ? <><b>{nf(chapterCount)}</b> questions, each with a worked solution</>
                    : "Every question of the chapter, with worked solutions"}
                </li>
                <li>Section-wise question sheets and answer keys</li>
                <li>2 chapter tests and a worksheet, each with a key</li>
              </ul>
              {buyArea("pack_chapter", chapter || undefined, chapterReady)}
            </article>

            <article className="lt-packs__card" data-testid="packs-card-mock">
              <p className="lt-packs__tag">Board-pattern papers</p>
              <h3>Mock Pack</h3>
              <p className="lt-packs__price">{packPriceLabel("pack_mock")}</p>
              <SubjectToggle value={subject} onChange={onSubject} idPrefix="mock" />
              <ul className="lt-packs__list">
                <li><b>5</b> full {subjectLabel(subject)} papers, 80 marks each</li>
                <li>Section A to E, as in the board paper</li>
                <li>An answer key with worked solutions for each paper</li>
              </ul>
              {buyArea("pack_mock", subject, true)}
            </article>

            <article className="lt-packs__card lt-packs__card--best" data-testid="packs-card-subject">
              <p className="lt-packs__tag">Whole subject</p>
              <h3>Subject Pack</h3>
              <p className="lt-packs__price">{packPriceLabel("pack_subject")}</p>
              <SubjectToggle value={subject} onChange={onSubject} idPrefix="subject" />
              <ul className="lt-packs__list">
                <li>
                  All <b>{chaptersOfSubject(subject).length}</b> {subjectLabel(subject)} chapters
                  {selectedSubjectTotal !== null && <> &mdash; <b>{nf(selectedSubjectTotal)}</b> questions</>}
                </li>
                <li>Chapter tests and worksheets for every chapter</li>
                <li>Plus the 5 {subjectLabel(subject)} mock papers</li>
              </ul>
              {buyArea("pack_subject", subject, true)}
            </article>

            <article className="lt-packs__card" data-testid="packs-card-bundle">
              <p className="lt-packs__tag">Everything</p>
              <h3>Complete Bundle</h3>
              <p className="lt-packs__price">{packPriceLabel("pack_bundle")}</p>
              <ul className="lt-packs__list">
                <li>
                  Maths and Science: <b>26</b> chapters
                  {bundleTotal !== null && <> &mdash; <b>{nf(bundleTotal)}</b> questions</>}
                </li>
                <li>All chapter tests and worksheets</li>
                <li>All <b>10</b> mock papers, with keys</li>
              </ul>
              {buyArea("pack_bundle", undefined, true)}
            </article>
          </div>
          {!enabled && <p className="lt-packs__muted lt-packs__center">Packs open for purchase soon. If you already own one, it is under My packs above.</p>}
          <p className="lt-packs__muted lt-packs__center">
            Questions that depend on a figure we cannot print are left out, so every page you buy can be solved on paper.
          </p>
        </section>

        <section className="lt-packs__sample" aria-label="Sample page">
          <div className="lt-packs__sample-slot" data-slot="sample-page" role="img" aria-label="Sample page placeholder">
            <span>Sample page</span>
          </div>
          <p className="lt-packs__muted lt-packs__center">A page of a chapter pack: the question, then the step-by-step solution in the answer key.</p>
        </section>

        <section aria-labelledby="packs-faq-h" className="lt-packs__faq">
          <h2 id="packs-faq-h">Questions</h2>
          <details>
            <summary>What&rsquo;s inside a pack?</summary>
            <p>
              For each chapter: the chapter&rsquo;s questions grouped by CBSE section (A to E) with a matching answer key, two chapter
              tests and one worksheet (each with a key). Mock packs are five full 80-mark papers with keys. Every question has a worked
              solution.
            </p>
          </details>
          <details>
            <summary>Can I download again later?</summary>
            <p>Yes. Sign in and open My packs on this page &mdash; download any file, any time, as often as you like.</p>
          </details>
          <details>
            <summary>Whose copy is it?</summary>
            <p>Packs are for your own use. Each PDF carries your name and email on every page, so please don&rsquo;t share the files.</p>
          </details>
          <details>
            <summary>Does it renew?</summary>
            <p>Never. It is a one-time payment and nothing is charged again. If you take the Board Pass within 7 days, the pack price is credited against it.</p>
          </details>
          <details>
            <summary>What about refunds?</summary>
            <p>
              Read the <Link to="/legal/refund">cancellation and refund policy</Link> before you buy.
            </p>
          </details>
        </section>
      </div>
      <PublicLegalFooter />
    </main>
  );
}

function SubjectToggle(props: { value: PackSubject; onChange: (s: PackSubject) => void; idPrefix: string }) {
  return (
    <div className="lt-packs__seg" role="radiogroup" aria-label="Subject">
      {(["maths", "science"] as const).map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={props.value === s}
          id={`packs-${props.idPrefix}-${s}`}
          className={props.value === s ? "lt-packs__seg-btn is-on" : "lt-packs__seg-btn"}
          onClick={() => props.onChange(s)}
        >
          {subjectLabel(s)}
        </button>
      ))}
    </div>
  );
}

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
