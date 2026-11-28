/**
 * PurchaseCard - PAID-SHOWS-1 (owner 12 Nov 2026): "once somebody has paid, they should be shown what they got".
 *
 * The first block of the paid screen (above "Who will use it?"), and the same card on /packs after a reload. Lives in lazy chunks only
 * (the checkout sheet, the packs page). The proof is Razorpay's checkout signature, held in memory / this tab's sessionStorage; the
 * server (POST /api/pay/guest/receipt) answers what was bought and the masked contact the files are licensed to. The PDFs are built here,
 * from the pack, by the same buildPackFiles as My packs. A receipt is a READ: it grants nothing, makes no account, ends no hold.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  RECEIPT_FAILED,
  RECEIPT_FILES_FAILED,
  RECEIPT_HIDE,
  RECEIPT_LOADING,
  RECEIPT_PASS_TITLE,
  RECEIPT_PAYMENT_RECEIVED,
  RECEIPT_PREPARING,
  RECEIPT_RETRY,
  fetchReceipt,
  receiptExpired,
  receiptPackTitle,
  receiptSavedTo,
  receiptSavedToPending,
  type AttachProof,
  type ReceiptOutcome,
} from "../../services/checkoutWho";
import type { PackFile } from "../../lib/packs/buildPackFiles";
import type { PackLicensee, PackSku } from "../../services/packs";
import { meCardPackTitle } from "../../lib/packs/packTitle";
import { trackPackEvent } from "../../lib/packs/packAnalytics";
import { recoverFromChunkError } from "../../lib/chunkReload";
import { GUEST_ZIP_PER_GROUP, isServerPdfDisabled } from "../../lib/packs/serverPdfLinks";
import "./purchaseCard.css";

type Files = { phase: "idle" } | { phase: "loading" } | { phase: "ready"; groups: Array<{ group: string; files: PackFile[] }> } | { phase: "error" };

export interface PurchaseCardProps {
  proof: AttachProof;
  /** The attach choice below the card is still open (only the sheet knows; the server's own `attached` answers otherwise). */
  onHide?: () => void;
  /** Hide the card's own "Payment received" line (the sheet's attach step already says it above). Default off. */
  hidePaymentLine?: boolean;
  /** Fold the files (and the "saved to" line) into one "Your files (N) - Show" line. Default off. */
  filesFolded?: boolean;
  /** Test seams. */
  fetchReceiptImpl?: typeof fetchReceipt;
}

export const ZIP_EXPIRED = "This download link has expired. Sign in with the number or email you paid with to download again.";

export default function PurchaseCard({ proof, onHide, hidePaymentLine = false, filesFolded = false, fetchReceiptImpl = fetchReceipt }: PurchaseCardProps) {
  const [receipt, setReceipt] = useState<ReceiptOutcome | null>(null);
  const [files, setFiles] = useState<Files>({ phase: "idle" });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [progress, setProgress] = useState<string | null>(null);
  // GUEST-ZIP-1: "Download all (ZIP)" - one ZIP of the whole pack from the server. It is only ever a shortcut: when the server cannot
  // make one (kill switch, 404, a slow or failed build) the button goes quiet or says "Try again" and the files stay one tap each.
  const [zipBusy, setZipBusy] = useState(false);
  const [zipFailed, setZipFailed] = useState(false);
  const [zipSaved, setZipSaved] = useState(false);
  const [zipExpired, setZipExpired] = useState(false);
  const [zipOff, setZipOff] = useState<boolean>(() => isServerPdfDisabled());
  // PACK-PDF-SIZE-1: a multi-chapter pack (the bundle ~2.5 GB) is offered as one ZIP PER CHAPTER, each its own "Download" row.
  const [zipGroupBusy, setZipGroupBusy] = useState<string | null>(null);
  const [zipProgress, setZipProgress] = useState<string | null>(null);
  const [zipGroupFailed, setZipGroupFailed] = useState<string | null>(null);
  const [zipGroupSaved, setZipGroupSaved] = useState<ReadonlySet<string>>(() => new Set());
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    setReceipt(null);
    const r = await fetchReceiptImpl(proof);
    if (alive.current) setReceipt(r);
  }, [proof, fetchReceiptImpl]);
  useEffect(() => {
    void load();
  }, [load]);

  const ok = receipt && receipt.status === "ok" ? receipt : null;
  const pack = ok?.pack;
  const licensee = ok?.licensee;
  const buildFiles = useCallback(async () => {
    if (!pack || !licensee) return;
    setFiles({ phase: "loading" });
    try {
      const { buildPackFiles, groupPackFiles } = await import("../../lib/packs/buildPackFiles");
      const built = await buildPackFiles(
        { packId: pack.packId, sku: pack.sku as PackSku, target: pack.target },
        {
          licensee: licensee as PackLicensee,
          owned: [{ packId: pack.packId, sku: pack.sku, target: pack.target, pricePaidInr: 0, paidAt: pack.paidAt, orderId: pack.orderId }],
          user: null,
          onDownload: (sku) => trackPackEvent("pack_download", sku),
          // SERVER-PDF-1 PR-C: the server's stamped file when the buyer is signed in; the in-browser build is the silent fallback.
          serverLinks: true,
          // Unknown Board Pass state: the same "left out" the My packs build uses when the entitlement is not resolved.
          bridge: { paidBoardPass: null },
        },
      );
      if (alive.current) setFiles({ phase: "ready", groups: groupPackFiles(built) });
    } catch (err) {
      if (recoverFromChunkError(err)) return;
      if (alive.current) setFiles({ phase: "error" });
    }
  }, [pack, licensee]);
  useEffect(() => {
    if (pack && pack.sku !== "test_series" && licensee && files.phase === "idle") void buildFiles();
  }, [pack, licensee, files.phase, buildFiles]);

  async function download(file: PackFile) {
    if (busyId) return;
    setBusyId(file.id);
    setFailedId(null);
    setProgress(null);
    try {
      await file.build(file.codes && file.codes.length > 1 ? (k, n) => setProgress(`Preparing… set ${k} of ${n}`) : undefined);
      setSavedIds((prev) => new Set(prev).add(file.id));
    } catch (err) {
      if (!recoverFromChunkError(err)) setFailedId(file.id);
    } finally {
      setBusyId(null);
      setProgress(null);
    }
  }

  const payLine = hidePaymentLine ? null : <p className="lt-rcpt__ok" role="status">{RECEIPT_PAYMENT_RECEIVED}</p>;
  async function downloadZip(groups: Array<{ files: PackFile[] }>, groupId?: string) {
    if (zipBusy || busyId || zipGroupBusy) return;
    if (groupId) {
      setZipGroupBusy(groupId);
      setZipGroupFailed(null);
    } else {
      setZipBusy(true);
      setZipFailed(false);
    }
    try {
      const { downloadGuestZipFromServer } = await import("../../lib/packs/serverPdfDownload");
      const expectCodes = [...new Set(groups.flatMap((g) => g.files.flatMap((f) => f.codes ?? (f.code ? [f.code] : []))))];
      const res = await downloadGuestZipFromServer({ proof, expectCodes, ...(groupId ? { groupId } : {}) }, { onProgress: (d, t) => { if (alive.current) setZipProgress(t > 0 ? `Preparing\u2026 (${d} of ${t} files)` : null); } });
      if (!alive.current) return;
      if (res.ok) {
        if (groupId) setZipGroupSaved((prev) => new Set(prev).add(groupId));
        else setZipSaved(true);
      } else if (res.reason === "expired") setZipExpired(true);
      else if (res.reason === "disabled" || res.reason === "unavailable") setZipOff(true);
      else if (groupId) setZipGroupFailed(groupId);
      else setZipFailed(true);
    } catch (err) {
      if (!recoverFromChunkError(err) && alive.current) {
        if (groupId) setZipGroupFailed(groupId);
        else setZipFailed(true);
      }
    } finally {
      if (alive.current) {
        setZipBusy(false);
        setZipGroupBusy(null);
        setZipProgress(null);
      }
    }
  }

  const hide = onHide ? (
    <button type="button" className="lt-rcpt__hide" onClick={onHide} data-testid="receipt-hide">
      {RECEIPT_HIDE}
    </button>
  ) : null;

  if (!receipt) {
    return (
      <section className="lt-rcpt" data-testid="purchase-card" aria-busy="true">
        {payLine}
        <p className="lt-rcpt__line">{RECEIPT_LOADING}</p>
      </section>
    );
  }
  if (receipt.status === "failed") {
    return (
      <section className="lt-rcpt" data-testid="purchase-card">
        {payLine}
        <p className="lt-rcpt__line" data-testid="receipt-failed">{RECEIPT_FAILED}</p>
        <button type="button" className="lt-rcpt__btn" onClick={() => void load()}>{RECEIPT_RETRY}</button>
        {hide}
      </section>
    );
  }
  if (receipt.status === "expired") {
    return (
      <section className="lt-rcpt" data-testid="purchase-card">
        {payLine}
        <p className="lt-rcpt__line" data-testid="receipt-expired">{receiptExpired(receipt.savedTo)}</p>
        {hide}
      </section>
    );
  }
  const fileCount = files.phase === "ready" ? files.groups.reduce((n, g) => n + g.files.length, 0) : 0;
  const saved = ok && ok.savedTo ? (ok.attached ? receiptSavedTo(ok.savedTo) : receiptSavedToPending(ok.savedTo)) : "";
  if (ok && ok.kind === "pass") {
    return (
      <section className="lt-rcpt" data-testid="purchase-card">
        {payLine}
        <p className="lt-rcpt__title" data-testid="receipt-title">{RECEIPT_PASS_TITLE}</p>
        {hide}
      </section>
    );
  }
  // MYPACKS-TS-1: the Test Series Pack is online - no files to prepare or download; the receipt starts the series instead.
  if (ok && pack && pack.sku === "test_series") {
    return (
      <section className="lt-rcpt" data-testid="purchase-card">
        {payLine}
        <p className="lt-rcpt__title" data-testid="receipt-title">{receiptPackTitle(meCardPackTitle(pack))}</p>
        <p className="lt-rcpt__line" data-testid="receipt-series-line">Your Test Series is ready. Sign in with the number or email you paid with to start.</p>
        <p className="lt-rcpt__line"><a href="/test-series" data-testid="receipt-series-start">Start your Test Series &rarr;</a></p>
        {saved && licensee ? <p className="lt-rcpt__fine" data-testid="receipt-saved">{saved}</p> : null}
        {hide}
      </section>
    );
  }
  // PACK-PDF-SIZE-1: more than one chapter -> one ZIP per chapter instead of the all-pack ZIP (kill switch: GUEST_ZIP_PER_GROUP).
  const perGroupZip = GUEST_ZIP_PER_GROUP && files.phase === "ready" && files.groups.length > 1;
  const zipEl = zipExpired ? (
    <p className="lt-rcpt__line" role="status" data-testid="receipt-zip-expired">{ZIP_EXPIRED}</p>
  ) : files.phase === "ready" && !zipOff && fileCount >= 2 && !perGroupZip ? (
      <div className="lt-rcpt__zip" data-testid="receipt-zip-row">
        <button
          type="button"
          className="lt-rcpt__btn lt-rcpt__btn--ghost"
          disabled={zipBusy || busyId !== null}
          aria-label="Download all files of this pack as one ZIP"
          onClick={() => void downloadZip(files.groups)}
          data-testid="receipt-zip"
        >
          {zipBusy ? zipProgress ?? "Preparing ZIP\u2026" : zipFailed ? "Try again" : zipSaved ? "Saved \u2713" : "Download all (ZIP)"}
        </button>
        {zipFailed && <span className="lt-rcpt__bad" role="alert">That didn&rsquo;t work. Try again, or download the files one by one.</span>}
      </div>
    ) : null;
  const groupsEl = (
    <>
      {zipEl}
      {files.phase === "ready" &&
  files.groups.map((g) => {
    const zipGroupId = perGroupZip && !zipOff && !zipExpired && g.files.length >= 2 ? g.files[0]?.groupId : "";
    const list = (
      <ul className="lt-rcpt__files">
        {zipGroupId ? (
          <li className="lt-rcpt__zip" data-testid="receipt-zip-group-row">
            <span>All {g.files.length} files of this chapter (ZIP)</span>
            <button type="button" className="lt-rcpt__btn lt-rcpt__btn--small" disabled={zipBusy || zipGroupBusy !== null || busyId !== null} onClick={() => void downloadZip([g], zipGroupId)} data-testid="receipt-zip-group">
              {zipGroupBusy === zipGroupId ? zipProgress ?? "Preparing ZIP\u2026" : zipGroupFailed === zipGroupId ? "Try again" : zipGroupSaved.has(zipGroupId) ? "Saved \u2713" : "Download"}
            </button>
            {zipGroupFailed === zipGroupId && <span className="lt-rcpt__bad" role="alert">That didn&rsquo;t work. Try again, or download the files one by one.</span>}
          </li>
        ) : null}
        {g.files.map((f) => (
          <li key={f.id}>
            <span>{f.label}</span>
            <button type="button" className="lt-rcpt__btn lt-rcpt__btn--small" disabled={busyId !== null} onClick={() => void download(f)} data-testid="receipt-download">
              {busyId === f.id ? progress ?? "Preparing PDF…" : failedId === f.id ? "Retry" : savedIds.has(f.id) ? "Saved ✓" : "Download"}
            </button>
            {failedId === f.id && <span className="lt-rcpt__bad" role="alert">That didn&rsquo;t work. Try again.</span>}
          </li>
        ))}
      </ul>
    );
    return files.groups.length === 1 ? (
      <div key={g.group}>{list}</div>
    ) : (
      <details key={g.group} className="lt-rcpt__grp">
        <summary>{g.group} <span className="lt-rcpt__meta">{g.files.length} {g.files.length === 1 ? "file" : "files"}</span></summary>
        {list}
      </details>
    );
  })}
    </>
  );
  const savedEl = saved && licensee ? <p className="lt-rcpt__fine" data-testid="receipt-saved">{saved}</p> : null;
  return (
    <section className="lt-rcpt" data-testid="purchase-card">
      {payLine}
      <p className="lt-rcpt__title" data-testid="receipt-title">{pack ? receiptPackTitle(meCardPackTitle(pack)) : "Your pack"}</p>
      {pack && !licensee && (
        <p className="lt-rcpt__line" data-testid="receipt-no-contact">{receiptExpired(ok?.savedTo ?? "")}</p>
      )}
      {licensee && (files.phase === "idle" || files.phase === "loading") ? <p className="lt-rcpt__line">{RECEIPT_PREPARING}</p> : null}
      {files.phase === "error" && (
        <p className="lt-rcpt__line" role="alert">
          {RECEIPT_FILES_FAILED}{" "}
          <button type="button" className="lt-rcpt__link" onClick={() => void buildFiles()}>{RECEIPT_RETRY}</button>
        </p>
      )}
      {filesFolded && files.phase === "ready" ? (
        <details className="lt-rcpt__fold" data-testid="receipt-files-fold">
          <summary className="lt-rcpt__foldsum" data-testid="receipt-files-summary">Your files ({fileCount}) &middot; Show</summary>
          {groupsEl}
          {savedEl}
        </details>
      ) : (
        <>
          {groupsEl}
          {savedEl}
        </>
      )}
      {hide}
    </section>
  );
}
