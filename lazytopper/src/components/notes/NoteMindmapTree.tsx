/**
 * NoteMindmapTree — the visual mind-map (replaces the text outline).
 *
 * Lifts the prototype's `d3.hierarchy` + `d3.tree` node-link layout, but renders
 * with React/JSX (HTML node cards over an SVG bezier-connector layer) rather
 * than d3-selection: every node label must route through <NoteRichText> (entity
 * + math decode — the #328 invariant), which an imperative d3-selection text
 * node cannot host. We use d3-hierarchy purely for the Reingold-Tilford layout
 * the prototype used, then draw in React.
 *
 * Horizontal orientation (root on the left, branches → leaves to the right),
 * inside a scroll container so it never overflows/clips on narrow screens.
 */
import { useMemo, type CSSProperties } from "react";
import { hierarchy, tree, type HierarchyPointNode } from "d3-hierarchy";
import type { NoteMindmap, NoteMindmapBranch } from "./noteSpec.types";
import { NoteRichText } from "./NoteRichText";

interface MMDatum {
  label: string;
  branchIndex?: number;
  children?: MMDatum[];
}

// Per-branch accent palette (the spec drops the prototype's `color`; we assign
// by branch index, matching the prototype's distinct branch accents).
const BRANCH_COLORS = ["#e0883b", "#3a6ea5", "#16b96a", "#7a5fb0", "#c75c5c", "#2aa9a0", "#b0722f"];
const NAVY = "#0f2444";

// Layout geometry (px).
const COL_W = 232; // horizontal distance between depth columns
const ROW_H = 44; // vertical separation between adjacent nodes
const CARD_W = 200;
const PAD = 20;

function toDatum(node: string | NoteMindmapBranch): MMDatum {
  if (typeof node === "string") return { label: node };
  return { label: node.label, children: (node.children ?? []).map(toDatum) };
}

function branchColorOf(node: HierarchyPointNode<MMDatum>): string {
  let a: HierarchyPointNode<MMDatum> = node;
  while (a.depth > 1 && a.parent) a = a.parent;
  const bi = a.data.branchIndex ?? 0;
  return BRANCH_COLORS[bi % BRANCH_COLORS.length];
}

export function NoteMindmapTree({ mindmap }: { mindmap: NoteMindmap }) {
  const layout = useMemo(() => {
    const rootDatum: MMDatum = {
      label: mindmap.root ?? "",
      children: (mindmap.branches ?? []).map((b, i) => ({
        label: b.label,
        branchIndex: i,
        children: (b.children ?? []).map(toDatum),
      })),
    };
    const root = tree<MMDatum>().nodeSize([ROW_H, COL_W])(hierarchy<MMDatum>(rootDatum));
    const nodes = root.descendants();
    const links = root.links();
    const xs = nodes.map((n) => n.x);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const maxDepth = Math.max(...nodes.map((n) => n.depth));
    const offY = PAD + ROW_H - minX; // vertical center of the topmost node
    return {
      nodes,
      links,
      offY,
      width: maxDepth * COL_W + CARD_W + PAD * 2,
      height: maxX - minX + ROW_H * 2 + PAD * 2,
    };
  }, [mindmap]);

  const leftOf = (n: HierarchyPointNode<MMDatum>) => n.y + PAD;
  const midOf = (n: HierarchyPointNode<MMDatum>) => n.x + layout.offY;

  const connector = (
    s: HierarchyPointNode<MMDatum>,
    t: HierarchyPointNode<MMDatum>,
  ) => {
    const sx = leftOf(s) + CARD_W;
    const sy = midOf(s);
    const tx = leftOf(t);
    const ty = midOf(t);
    const mx = (sx + tx) / 2;
    return `M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${ty}, ${tx} ${ty}`;
  };

  return (
    <div className="lt-note__mm-scroll">
      <div className="lt-note__mm-canvas" style={{ width: layout.width, height: layout.height }}>
        <svg
          className="lt-note__mm-links"
          width={layout.width}
          height={layout.height}
          aria-hidden="true"
        >
          {layout.links.map((l, i) => (
            <path
              key={i}
              d={connector(l.source, l.target)}
              fill="none"
              stroke={branchColorOf(l.target)}
              strokeWidth={2}
              opacity={0.5}
            />
          ))}
        </svg>
        {layout.nodes.map((n, i) => {
          const isRoot = n.depth === 0;
          const isBranch = n.depth === 1;
          const cls =
            "lt-note__mm-node " +
            (isRoot
              ? "lt-note__mm-node--root"
              : isBranch
              ? "lt-note__mm-node--branch"
              : "lt-note__mm-node--leaf");
          const style: CSSProperties = {
            left: leftOf(n),
            top: midOf(n),
            width: CARD_W,
          };
          if (isBranch) style.borderColor = branchColorOf(n);
          if (!isRoot) style.color = isBranch ? NAVY : undefined;
          return (
            <div key={i} className={cls} style={style}>
              <NoteRichText text={n.data.label} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default NoteMindmapTree;
