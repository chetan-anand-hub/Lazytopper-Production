import { useState } from "react";
import { CC27_NAME, cc27FileLabel, groupCc27, isCc27ClientEnabled } from "../../config/crashCourse";
import { recoverFromChunkError } from "../../lib/chunkReload";
import "./crashCourse.css";

function Row({ fileKey }: { fileKey: string }) {
  const [phase, setPhase] = useState<"idle" | "busy" | "saved" | "failed" | "off">("idle");
  async function get() {
    if (phase === "busy") return;
    setPhase("busy");
    try {
      const { downloadCc27FromServer } = await import("../../lib/packs/serverPdfDownload");
      const res = await downloadCc27FromServer({ fileKey });
      if (res.ok) setPhase("saved");
      else setPhase(res.reason === "disabled" || res.reason === "unavailable" ? "off" : "failed");
    } catch (err) {
      if (!recoverFromChunkError(err)) setPhase("failed");
    }
  }
  if (phase === "off") return null;
  const label = cc27FileLabel(fileKey);
  return (
    <li className="lt-cc27-row" data-testid={`cc27-row-${fileKey}`}>
      <span>{label}</span>
      <button type="button" className="lt-cc27-btn" disabled={phase === "busy"} aria-label={`Download ${label}`} data-testid={`cc27-download-${fileKey}`} onClick={() => void get()}>
        {phase === "busy" ? "Preparing PDF…" : phase === "failed" ? "Retry" : phase === "saved" ? "Saved ✓" : "Download"}
      </button>
      {phase === "failed" && <span className="lt-cc27-note--bad" role="alert">That didn&rsquo;t work. Try again.</span>}
    </li>
  );
}

/** CC27-SITE-1 - the download rows for the keys the SERVER said this student may have and that are uploaded. Nothing for an empty list. */
export default function Cc27Rows({ keys, headingLevel = 2 }: { keys: readonly string[] | undefined; headingLevel?: 2 | 3 }) {
  if (!isCc27ClientEnabled() || !keys || keys.length === 0) return null;
  const g = groupCc27(keys);
  if (g.books.length + g.maths.length + g.science.length === 0) return null;
  const H = `h${headingLevel}` as "h2" | "h3";
  return (
    <section className="lt-cc27-block" aria-labelledby="cc27-rows-h" data-testid="cc27-section">
      <H id="cc27-rows-h" className="lt-cc27-block__title">{`Bonus: ${CC27_NAME}`}</H>
      {g.books.length > 0 && (
        <ul className="lt-cc27-rows">
          {g.books.map((k) => (
            <Row key={k} fileKey={k} />
          ))}
        </ul>
      )}
      {([["maths", "Maths chapter sheets"], ["science", "Science chapter sheets"]] as const).map(([s, title]) =>
        g[s].length > 0 ? (
          <details key={s}>
            <summary className="lt-cc27-sum">{`${title} (${g[s].length})`}</summary>
            <ul className="lt-cc27-rows">
              {g[s].map((k) => (
                <Row key={k} fileKey={k} />
              ))}
            </ul>
          </details>
        ) : null,
      )}
    </section>
  );
}
