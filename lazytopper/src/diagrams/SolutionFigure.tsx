/**
 * SolutionFigure — the solution-slot figure drawn from the question's OWN numbers
 * (DIAGRAMS-1 PR-2).
 *
 * Looks the question id up in the computed-figure registry, builds each bound figure
 * and renders it inside a white card with an honest caption. Tap / Enter enlarges it
 * in the shared accessible lightbox (the SVG is serialised to a data URL; its styles
 * are embedded, so it renders the same there).
 *
 * Returns null when the question has no binding or the builder refuses: the honest
 * empty state — no placeholder, never a lookalike.
 */
import { useId, useMemo, useRef, useState } from "react";
import { NoteFigureLightbox } from "../components/notes/NoteFigureLightbox";
import { buildComputedFigure, getComputedFigures } from "./registry";
import type { ComputedFigureBinding, FigureSlot } from "./registry/computedFigureTypes";
import type { FigureSpec } from "./figureSpec";
import { FigureSvg } from "./render/FigureSvg";
import "./SolutionFigure.css";

export const SOLUTION_FIGURE_CAPTION = "Figure drawn from this question's numbers";

interface Props {
  questionId: string;
  slot?: FigureSlot;
}

interface Built {
  binding: ComputedFigureBinding;
  spec: FigureSpec;
}

function OneFigure({ binding, spec, idPrefix }: Built & { idPrefix: string }) {
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
    <figure className="lt-solfig" data-question-id={binding.questionId}>
      <button type="button" className="lt-solfig__btn" aria-label={`Enlarge figure: ${spec.title}`} onClick={open}>
        <span ref={holder} className="lt-solfig__svg">
          <FigureSvg spec={spec} idPrefix={idPrefix} />
        </span>
      </button>
      <figcaption className="lt-solfig__cap">
        {SOLUTION_FIGURE_CAPTION}
        {binding.part ? ` — ${binding.part}` : ""}
        {extra ? <span className="lt-solfig__note">{extra}</span> : null}
      </figcaption>
      {src ? <NoteFigureLightbox src={src} alt={spec.desc} label={spec.title} onClose={() => setSrc(null)} /> : null}
    </figure>
  );
}

export function SolutionFigure({ questionId, slot = "solution" }: Props) {
  const uid = useId().replace(/[^\w-]/g, "");
  const built = useMemo<Built[]>(() => {
    const out: Built[] = [];
    for (const binding of getComputedFigures(questionId, slot)) {
      const res = buildComputedFigure(binding);
      if (res) out.push({ binding, spec: res.spec });
    }
    return out;
  }, [questionId, slot]);
  if (built.length === 0) return null;
  return (
    <div className="lt-solfig-list">
      {built.map((b, i) => (
        <OneFigure key={`${b.binding.questionId}-${b.binding.part ?? i}`} {...b} idPrefix={`ltsf-${uid}-${i}`} />
      ))}
    </div>
  );
}

export default SolutionFigure;
