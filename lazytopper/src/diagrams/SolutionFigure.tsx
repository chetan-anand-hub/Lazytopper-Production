/**
 * SolutionFigure — the solution-slot figure drawn from the question's OWN numbers
 * (DIAGRAMS-1 PR-2).
 *
 * Looks the question id up in the solution-figure registry. A COMPUTED entry is built
 * and drawn as SVG; a CROP entry (an official raster crop of this question's own
 * figure) is shown as an <img> with its alt text. Each sits in a white card with an
 * honest caption. Tap / Enter enlarges it
 * in the shared accessible lightbox (the SVG is serialised to a data URL; its styles
 * are embedded, so it renders the same there).
 *
 * Returns null when the question has no binding or the builder refuses: the honest
 * empty state — no placeholder, never a lookalike.
 */
import { useId, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { NoteFigureLightbox } from "../components/notes/NoteFigureLightbox";
import { buildComputedFigure, getSolutionFigures } from "./registry";
import type { ComputedFigureBinding, CropFigureBinding, FigureSlot } from "./registry/computedFigureTypes";
import type { FigureSpec } from "./figureSpec";
import { FigureSvg } from "./render/FigureSvg";
import "./SolutionFigure.css";

export const SOLUTION_FIGURE_CAPTION = "Figure drawn from this question's numbers";
export const SOLUTION_CROP_CAPTION = "Figure from the official answer";
/** An optics.case figure: the row states an object POSITION, not numbers (DIAGRAMS-1 PR-2b). */
export const SOLUTION_CASE_CAPTION = "Standard ray diagram for the position this question states";

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

/** A public path ("/figures/...") under the app's base path. */
export function cropSrc(filePath: string): string {
  return filePath.startsWith("/") ? `${BASE}${filePath}` : filePath;
}

interface Props {
  questionId: string;
  slot?: FigureSlot;
}

type Built =
  | { kind: "computed"; binding: ComputedFigureBinding; spec: FigureSpec }
  | { kind: "crop"; binding: CropFigureBinding };

/**
 * The enlarge overlay is position:fixed. Inside a transformed ancestor (the Practice
 * card's animate-float-up) a fixed box is trapped and lands off-screen, so it is
 * portalled to <body> HERE as well — NoteFigureLightbox portals itself today, but
 * this guarantee does not depend on another component's internals.
 */
function ToBody({ children }: { children: ReactNode }) {
  return typeof document === "undefined" ? null : createPortal(children, document.body);
}

function Caption({ main, part, extra }: { main: string; part?: string; extra?: string }) {
  return (
    <figcaption className="lt-solfig__cap">
      {main}
      {part ? ` — ${part}` : ""}
      {extra ? <span className="lt-solfig__note">{extra}</span> : null}
    </figcaption>
  );
}

function ComputedFigure({ binding, spec, idPrefix }: { binding: ComputedFigureBinding; spec: FigureSpec; idPrefix: string }) {
  const holder = useRef<HTMLSpanElement | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const open = () => {
    const svg = holder.current?.querySelector("svg");
    if (!svg) return;
    const markup = new XMLSerializer().serializeToString(svg);
    setSrc(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`);
  };
  const extra = [binding.caption, spec.note].filter(Boolean).join(" ");
  return (
    <figure className="lt-solfig" data-question-id={binding.questionId} data-figure-kind="computed">
      <button type="button" className="lt-solfig__btn" aria-label={`Enlarge figure: ${spec.title}`} onClick={open}>
        <span ref={holder} className="lt-solfig__svg">
          <FigureSvg spec={spec} idPrefix={idPrefix} />
        </span>
      </button>
      <Caption main={binding.builder === "opticsCase" ? SOLUTION_CASE_CAPTION : SOLUTION_FIGURE_CAPTION} part={binding.part} extra={extra} />
      {src ? (
        <ToBody>
          <NoteFigureLightbox src={src} alt={spec.desc} label={spec.title} onClose={() => setSrc(null)} />
        </ToBody>
      ) : null}
    </figure>
  );
}

function CropFigure({ binding }: { binding: CropFigureBinding }) {
  const [open, setOpen] = useState(false);
  const src = cropSrc(binding.filePath);
  return (
    <figure className="lt-solfig" data-question-id={binding.questionId} data-figure-kind="crop">
      <button type="button" className="lt-solfig__btn" aria-label={`Enlarge figure: ${binding.alt}`} onClick={() => setOpen(true)}>
        <img className="lt-solfig__img" src={src} alt={binding.alt} loading="lazy" decoding="async" />
      </button>
      <Caption main={SOLUTION_CROP_CAPTION} part={binding.part} extra={binding.caption} />
      {open ? (
        <ToBody>
          <NoteFigureLightbox src={src} alt={binding.alt} label={binding.alt} onClose={() => setOpen(false)} />
        </ToBody>
      ) : null}
    </figure>
  );
}

export function SolutionFigure({ questionId, slot = "solution" }: Props) {
  const uid = useId().replace(/[^\w-]/g, "");
  const built = useMemo<Built[]>(() => {
    const out: Built[] = [];
    for (const binding of getSolutionFigures(questionId, slot)) {
      if (binding.kind === "crop") {
        out.push({ kind: "crop", binding });
        continue;
      }
      const res = buildComputedFigure(binding);
      if (res) out.push({ kind: "computed", binding, spec: res.spec });
    }
    return out;
  }, [questionId, slot]);
  if (built.length === 0) return null;
  return (
    <div className="lt-solfig-list">
      {built.map((b, i) =>
        b.kind === "crop" ? (
          <CropFigure key={`crop-${b.binding.part ?? i}`} binding={b.binding} />
        ) : (
          <ComputedFigure key={`computed-${b.binding.part ?? i}`} binding={b.binding} spec={b.spec} idPrefix={`ltsf-${uid}-${i}`} />
        ),
      )}
    </div>
  );
}

export default SolutionFigure;
