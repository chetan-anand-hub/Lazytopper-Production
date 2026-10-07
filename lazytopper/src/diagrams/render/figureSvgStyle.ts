/**
 * The stylesheet EMBEDDED inside every computed figure's <svg> (DIAGRAMS-1 PR-2).
 *
 * Why embedded and not in a page .css file: the figure leaves the page DOM in two
 * places — the enlarge lightbox (the SVG is serialised to a data:image/svg+xml URL,
 * and an <img> never sees page CSS) and, later, PDF export (html2canvas rasterises
 * the SVG's own markup). Only rules inside the SVG survive both. Every rule is
 * scoped under `.lt-fig`, so it cannot leak into the page.
 *
 * Literal colours on purpose: CSS custom properties from the page do not reach a
 * data-URL image. The figure is a white card in both themes (like the raster
 * question figures), so no dark-mode flip happens inside the SVG.
 */
export const FIGURE_SVG_CSS = `
.lt-fig { font-family: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif; }
.lt-fig .lt-fig__bg { fill: #ffffff; }
.lt-fig .lt-fig__seg { stroke: #1e2a4a; stroke-width: 1.6; stroke-linecap: round; fill: none; }
.lt-fig .lt-fig__seg--structure { stroke-width: 3; }
.lt-fig .lt-fig__seg--ground { stroke: #475569; stroke-width: 1.6; }
.lt-fig .lt-fig__seg--sight { stroke: #1e2a4a; stroke-width: 1.4; }
.lt-fig .lt-fig__seg--horizontal-ref { stroke: #64748b; stroke-width: 1.2; stroke-dasharray: 5 4; }
.lt-fig .lt-fig__seg--construction { stroke: #64748b; stroke-width: 1.1; stroke-dasharray: 4 4; }
.lt-fig .lt-fig__seg--path { stroke: #1e2a4a; stroke-width: 1.4; stroke-dasharray: 6 4; }
.lt-fig .lt-fig__seg--measure { stroke: #94a3b8; stroke-width: 1; stroke-dasharray: 2 3; }
.lt-fig .lt-fig__arc { stroke: #2b8a3e; stroke-width: 1.5; fill: none; }
.lt-fig .lt-fig__right { stroke: #1e2a4a; stroke-width: 1.1; fill: none; }
.lt-fig .lt-fig__dot { fill: #1e2a4a; }
.lt-fig text { font-size: 15px; fill: #1e2a4a; paint-order: stroke; stroke: #ffffff; stroke-width: 3.5px; stroke-linejoin: round; }
.lt-fig .lt-fig__angle-label { fill: #2b8a3e; font-weight: 600; }
.lt-fig .lt-fig__len-label { font-weight: 600; }
.lt-fig .lt-fig__pt { font-weight: 700; font-style: italic; }
.lt-fig .lt-fig__seg--tangent { stroke: #1e2a4a; stroke-width: 1.6; }
.lt-fig .lt-fig__seg--radius { stroke: #1e2a4a; stroke-width: 1.3; }
.lt-fig .lt-fig__seg--chord { stroke: #1e2a4a; stroke-width: 1.3; }
.lt-fig .lt-fig__seg--edge { stroke: #1e2a4a; stroke-width: 1.7; }
.lt-fig .lt-fig__seg--axis { stroke: #64748b; stroke-width: 1.1; }
.lt-fig .lt-fig__circle { stroke: #1e2a4a; stroke-width: 1.7; fill: none; }
.lt-fig .lt-fig__circle--construction { stroke: #64748b; stroke-width: 1.1; stroke-dasharray: 4 4; }
.lt-fig .lt-fig__region { fill: #cfe9d6; stroke: none; }
.lt-fig .lt-fig__tick { font-size: 12px; fill: #475569; }
.lt-fig .lt-fig__coord { font-size: 14px; font-weight: 600; }
`;
