/**
 * NoteMindmapTree — the chapter mind-map as a RESPONSIVE, COLLAPSIBLE tree.
 *
 * v1.2 rewrite. The earlier version laid the tree out with d3-hierarchy at a
 * FIXED absolute width (maxDepth × column-width) inside a horizontal scroller,
 * so branches overlapped on narrow screens and nothing could collapse. This
 * renders the SAME spec tree ({ root, branches:[{label, children}] }) as a
 * vertical, indented node tree that:
 *   - REFLOWS at any width — a plain nested block layout with no fixed canvas,
 *     so it works down to ≤360px with no horizontal scroll and no overlap, and
 *   - COLLAPSES — every parent node toggles its children open/closed. Root and
 *     the top-level branches are open by default; deeper branches start
 *     collapsed (sensible-default per the v1.2 brief).
 *
 * ONE responsive component (no useIsDesktop twin). Every label routes through
 * <NoteRichText> (the #328 entity + KaTeX decode invariant), exactly as before.
 * Styling is class-driven (`.lt-note__mm-*` in Note.tsx's scoped <style>).
 */
import { useState } from "react";
import type { NoteMindmap, NoteMindmapBranch } from "./noteSpec.types";
import { NoteRichText } from "./NoteRichText";

interface MMNode {
  label: string;
  children: MMNode[];
}

// Per-branch accent palette (the spec drops the prototype's `color`; assign by
// top-level branch index, matching the prototype's distinct branch accents).
const BRANCH_COLORS = ["#e0883b", "#3a6ea5", "#16b96a", "#7a5fb0", "#c75c5c", "#2aa9a0", "#b0722f"];
const ROOT_COLOR = "#0f2444";

function toNode(node: string | NoteMindmapBranch): MMNode {
  if (typeof node === "string") return { label: node, children: [] };
  return { label: node.label, children: (node.children ?? []).map(toNode) };
}

function MindmapNode({
  node,
  depth,
  color,
}: {
  node: MMNode;
  depth: number;
  /** Accent colour inherited from the depth-1 branch this node belongs to. */
  color: string;
}) {
  const hasChildren = node.children.length > 0;
  // Root (0) + top-level branches (1) open by default; deeper branches collapse.
  const [open, setOpen] = useState(depth <= 1);

  const roleClass =
    depth === 0
      ? "lt-note__mm-node--root"
      : depth === 1
      ? "lt-note__mm-node--branch"
      : "lt-note__mm-node--leaf";
  // The branch card carries its accent on the left edge.
  const nodeStyle = depth === 1 ? { borderLeftColor: color } : undefined;

  return (
    <li className="lt-note__mm-item">
      {hasChildren ? (
        <button
          type="button"
          className={`lt-note__mm-node ${roleClass} lt-note__mm-node--toggle`}
          style={nodeStyle}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span
            className={`lt-note__mm-caret${open ? " lt-note__mm-caret--open" : ""}`}
            aria-hidden="true"
          >
            ▸
          </span>
          <NoteRichText text={node.label} />
        </button>
      ) : (
        <div className={`lt-note__mm-node ${roleClass}`} style={nodeStyle}>
          <NoteRichText text={node.label} />
        </div>
      )}
      {hasChildren && (
        // Children always render (toggled via CSS, not unmounted) so a printed /
        // PDF'd note shows the FULL tree even when a branch is collapsed on screen.
        <ul
          className={`lt-note__mm-kids${open ? "" : " lt-note__mm-kids--collapsed"}`}
          style={depth >= 1 ? { borderLeftColor: color } : undefined}
        >
          {node.children.map((child, i) => (
            <MindmapNode
              key={i}
              node={child}
              depth={depth + 1}
              // depth-0 hands each branch its own accent; below that it inherits.
              color={depth === 0 ? BRANCH_COLORS[i % BRANCH_COLORS.length] : color}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function NoteMindmapTree({ mindmap }: { mindmap: NoteMindmap }) {
  const root: MMNode = {
    label: mindmap.root ?? "",
    children: (mindmap.branches ?? []).map((b) => ({
      label: b.label,
      children: (b.children ?? []).map(toNode),
    })),
  };
  return (
    <div className="lt-note__mm-scroll">
      <ul className="lt-note__mm-tree">
        <MindmapNode node={root} depth={0} color={ROOT_COLOR} />
      </ul>
    </div>
  );
}

export default NoteMindmapTree;
