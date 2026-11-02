import { useState } from "react";
import { cleanStudentName, saveStudentName, skipPackName, STUDENT_NAME_MAX } from "../../services/studentName";
import "./packNamePrompt.css";

/**
 * PackNamePrompt — PAY-PHONE-1: asked ONCE in My packs for an account with no name and no email (a phone sign-in): the
 * name printed on the student's PDFs ("Licensed to <Name> · +91 98•••••948"). Optional; Skip prints the masked phone only.
 */
export const PACK_NAME_LABEL = "Student's name for your PDFs";
export const PACK_NAME_BAD = "Use letters, spaces and . - ' only (up to 40).";

export default function PackNamePrompt({ uid, phoneMasked, onDone, save = saveStudentName }: {
  uid: string;
  phoneMasked: string;
  /** `saved`: re-read My packs (the server prints the new name). */
  onDone: (saved: boolean) => void;
  save?: (name: string) => Promise<string>;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const clean = cleanStudentName(value);

  async function submit() {
    if (busy) return;
    if (!clean) {
      setError(PACK_NAME_BAD);
      return;
    }
    setBusy(true);
    try {
      await save(clean);
      onDone(true);
    } catch {
      setError("We couldn't save the name. Try again, or skip.");
      setBusy(false);
    }
  }

  return (
    <form
      className="lt-packs__name"
      data-testid="pack-name-prompt"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <label className="lt-packs__name-label" htmlFor="lt-pack-name">{PACK_NAME_LABEL}</label>
      <input
        id="lt-pack-name"
        className="lt-packs__name-input"
        type="text"
        autoComplete="name"
        maxLength={STUDENT_NAME_MAX}
        value={value}
        disabled={busy}
        onChange={(e) => {
          setValue(e.target.value);
          setError(null);
        }}
        data-testid="pack-name-input"
      />
      <p className="lt-packs__note">
        Optional. Your PDFs will say &ldquo;Licensed to {clean || "your name"} &middot; {phoneMasked}&rdquo;. Skip to print the number only.
      </p>
      {error && <p className="lt-packs__note lt-packs__note--bad" role="alert">{error}</p>}
      <div className="lt-packs__name-actions">
        <button type="submit" className="lt-packs__btn" disabled={busy || !value.trim()} data-testid="pack-name-save">
          {busy ? "Saving…" : "Save name"}
        </button>
        <button
          type="button"
          className="lt-packs__link"
          disabled={busy}
          onClick={() => {
            skipPackName(uid);
            onDone(false);
          }}
          data-testid="pack-name-skip"
        >
          Skip
        </button>
      </div>
    </form>
  );
}
