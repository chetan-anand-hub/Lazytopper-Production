import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from "react";

export interface VisualExplainerHandle {
  highlight: (keywords: string[]) => void;
}

interface VisualExplainerProps {
  src: string;
  title: string;
  height?: number;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  topic?: string;
  concept?: string;
  subject?: string;
  questionText?: string;
  onInteractiveDetected?: (isInteractive: boolean) => void;
}

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

function toAbsoluteSrc(src: string): string {
  if (src.startsWith("blob:") || src.startsWith("http")) return src;
  if (src.startsWith("/")) return `${BASE}${src}`;
  return src;
}

const HIGHLIGHT_BRIDGE = `<script id="lt-hl-bridge">(function(){function ensureStyle(){if(document.getElementById('lt-hl-style'))return;var s=document.createElement('style');s.id='lt-hl-style';s.textContent='@keyframes lt-hl-glow{0%,100%{box-shadow:0 0 0 3px rgba(251,191,36,0.9),0 0 18px rgba(251,191,36,0.5)}50%{box-shadow:0 0 0 6px rgba(251,191,36,1),0 0 32px rgba(251,191,36,0.8)}}.lt-hl-active{outline:2px solid #fbbf24!important;outline-offset:3px!important;animation:lt-hl-glow 0.9s ease-in-out 4!important;border-radius:6px!important;}';document.head.appendChild(s);}window.addEventListener('message',function(ev){var d=ev.data;if(!d||d.type!=='lt-highlight')return;ensureStyle();var kws=(d.keywords||[]).map(function(k){return(k+'').trim().toLowerCase();}).filter(function(k){return k.length>=1;});if(!kws.length)return;var all=document.querySelectorAll('*');var matched=[];for(var i=0;i<all.length;i++){var el=all[i];if(el===document.body||el===document.documentElement||el===document.head)continue;if(el.children.length>20)continue;var directText='';var cn=el.childNodes;for(var j=0;j<cn.length;j++){if(cn[j].nodeType===3)directText+=cn[j].nodeValue||'';}var txt=[(el.id||''),(el.getAttribute('title')||''),(el.getAttribute('data-label')||''),(el.getAttribute('aria-label')||''),(el.getAttribute('name')||''),(el.getAttribute('class')||''),(directText.trim().substring(0,120)),(el.children.length<=2?(el.textContent||'').substring(0,200):'')].join(' ').toLowerCase();if(kws.some(function(k){return txt.indexOf(k)>=0;})){matched.push(el);}}matched=matched.slice(0,6);matched.forEach(function(el){el.classList.add('lt-hl-active');setTimeout(function(){el.classList.remove('lt-hl-active');},3500);});});})();<\/script>`;

function injectHighlightBridge(html: string): string {
  const match = html.match(/<\/body>/i);
  if (match?.index !== undefined) {
    return html.slice(0, match.index) + "\n" + HIGHLIGHT_BRIDGE + "\n" + html.slice(match.index);
  }
  return html + "\n" + HIGHLIGHT_BRIDGE;
}

function detectInteractive(html: string): boolean {
  return (
    /<input[^>]+type=["']?range["']?/i.test(html) ||
    /<select[\s>]/i.test(html) ||
    (html.match(/<button[\s>]/gi) ?? []).length >= 1
  );
}

let keyframesInjected = false;
function ensureKeyframes() {
  if (keyframesInjected) return;
  keyframesInjected = true;
  const style = document.createElement("style");
  style.textContent = `@keyframes visualSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
}

export const VisualExplainer = forwardRef<VisualExplainerHandle, VisualExplainerProps>(
  function VisualExplainer(
    {
      src,
      title,
      height = 400,
      collapsible = true,
      defaultCollapsed = false,
      topic,
      concept,
      subject,
      questionText,
      onInteractiveDetected,
    },
    ref
  ) {
    const [collapsed, setCollapsed] = useState(defaultCollapsed);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
    const [retryKey, setRetryKey] = useState(0);
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const blobUrlRef = useRef<string | null>(null);
    const iframeReadyRef = useRef(false);
    const highlightQueueRef = useRef<string[] | null>(null);
    const onInteractiveDetectedRef = useRef(onInteractiveDetected);
    useEffect(() => { onInteractiveDetectedRef.current = onInteractiveDetected; }, [onInteractiveDetected]);

    useImperativeHandle(ref, () => ({
      highlight: (keywords: string[]) => {
        const iframe = iframeRef.current;
        if (!iframe?.contentWindow) { highlightQueueRef.current = keywords; return; }
        if (!iframeReadyRef.current) { highlightQueueRef.current = keywords; return; }
        iframe.contentWindow.postMessage({ type: "lt-highlight", keywords }, "*");
      },
    }), []);

    useEffect(() => { ensureKeyframes(); }, []);

    const handleLoad = useCallback(() => {
      setLoading(false);
      setError(false);
      iframeReadyRef.current = true;
      const queued = highlightQueueRef.current;
      if (queued && iframeRef.current?.contentWindow) {
        highlightQueueRef.current = null;
        setTimeout(() => {
          iframeRef.current?.contentWindow?.postMessage({ type: "lt-highlight", keywords: queued }, "*");
        }, 150);
      }
    }, []);

    const handleError = useCallback(() => {
      setLoading(false);
      setError(true);
    }, []);

    useEffect(() => {
      return () => {
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      };
    }, []);

    useEffect(() => {
      setLoading(true);
      setError(false);
      setResolvedSrc(null);
      iframeReadyRef.current = false;
      highlightQueueRef.current = null;

      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }

      let cancelled = false;
      const absSrc = toAbsoluteSrc(src);

      fetch(absSrc)
        .then((res) => {
          if (cancelled) return;
          if (!res.ok) throw new Error("not_found");
          return res.text();
        })
        .then((html) => {
          if (cancelled || !html) return;
          onInteractiveDetectedRef.current?.(detectInteractive(html));
          const injected = injectHighlightBridge(html);
          const blob = new Blob([injected], { type: "text/html" });
          const url = URL.createObjectURL(blob);
          if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = url;
          setResolvedSrc(url);
        })
        .catch(() => {
          if (!cancelled) tryLiveFallback();
        });

      function tryLiveFallback() {
        const fallbackTopic = topic || "";
        const fallbackConcept = concept || title || "";
        if (!fallbackTopic && !fallbackConcept) {
          setError(true);
          setLoading(false);
          return;
        }
        fetch("/api/generate-visual", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: fallbackTopic,
            concept: fallbackConcept,
            subject: subject || "Maths",
            grade: 10,
            ...(questionText ? { questionText: questionText.slice(0, 500) } : {}),
          }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (cancelled) return;
            if (data.ok && data.html) {
              onInteractiveDetectedRef.current?.(detectInteractive(data.html));
              const injected = injectHighlightBridge(data.html);
              const blob = new Blob([injected], { type: "text/html" });
              const url = URL.createObjectURL(blob);
              if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
              blobUrlRef.current = url;
              setResolvedSrc(url);
            } else {
              setError(true);
              setLoading(false);
            }
          })
          .catch(() => {
            if (!cancelled) {
              setError(true);
              setLoading(false);
            }
          });
      }

      return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [src, topic, concept, subject, title, retryKey, questionText]);

    useEffect(() => {
      if (!fullscreen) return;
      const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setFullscreen(false); };
      document.addEventListener("keydown", handleEsc);
      return () => document.removeEventListener("keydown", handleEsc);
    }, [fullscreen]);

    if (collapsed && collapsible) {
      return (
        <div style={styles.collapsedBar} onClick={() => setCollapsed(false)}>
          <span style={styles.collapsedIcon}>{"\u{1F4CA}"}</span>
          <span style={styles.collapsedTitle}>Visual: {title}</span>
          <span style={styles.expandBtn}>{"\u25BC"} Expand</span>
        </div>
      );
    }

    const iframeEl = resolvedSrc ? (
      <iframe
        ref={iframeRef}
        src={resolvedSrc}
        title={title}
        sandbox="allow-scripts"
        style={{ ...styles.iframe, height: fullscreen ? "100%" : height }}
        onLoad={handleLoad}
        onError={handleError}
      />
    ) : null;

    if (fullscreen) {
      return (
        <div style={styles.fullscreenOverlay}>
          <div style={styles.fullscreenHeader}>
            <span style={styles.fullscreenTitle}>{"\u{1F4CA}"} {title}</span>
            <button onClick={() => setFullscreen(false)} style={styles.closeBtn}>{"\u2715"} Close</button>
          </div>
          <div style={styles.fullscreenBody}>{iframeEl}</div>
        </div>
      );
    }

    return (
      <div ref={containerRef} style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={styles.icon}>{"\u{1F4CA}"}</span>
            <span style={styles.title}>{title}</span>
          </div>
          <div style={styles.headerRight}>
            <button onClick={() => setFullscreen(true)} style={styles.actionBtn} title="Fullscreen">{"\u26F6"}</button>
            {collapsible && (
              <button onClick={() => setCollapsed(true)} style={styles.actionBtn} title="Collapse">{"\u25B2"}</button>
            )}
          </div>
        </div>

        <div style={styles.body}>
          {loading && (
            <div style={styles.loadingOverlay}>
              <div style={styles.spinner} />
              <span style={styles.loadingText}>Loading visual...</span>
            </div>
          )}
          {error && (
            <div style={styles.errorOverlay}>
              <span style={styles.errorIcon}>{"\u26A0\uFE0F"}</span>
              <span style={styles.errorText}>Visual not available yet</span>
              <button
                onClick={() => { setError(false); setLoading(true); setResolvedSrc(null); setRetryKey((k) => k + 1); }}
                style={styles.retryBtn}
              >
                Retry
              </button>
            </div>
          )}
          {iframeEl}
        </div>
      </div>
    );
  }
);

const styles: Record<string, React.CSSProperties> = {
  container: {
    border: "2px solid #e2e8f0",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    background: "#ffffff",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 16px",
    background: "linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)",
    borderBottom: "1px solid #e2e8f0",
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 8 },
  headerRight: { display: "flex", alignItems: "center", gap: 4 },
  icon: { fontSize: 18 },
  title: { fontSize: 14, fontWeight: 700, color: "#1e293b" },
  actionBtn: {
    background: "transparent",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    padding: "4px 8px",
    fontSize: 14,
    cursor: "pointer",
    color: "#475569",
    lineHeight: 1,
  },
  body: { position: "relative" as const, minHeight: 100 },
  iframe: { width: "100%", border: "none", display: "block", background: "#ffffff" },
  loadingOverlay: {
    position: "absolute" as const,
    inset: 0,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(255,255,255,0.9)",
    zIndex: 2,
    gap: 12,
  },
  spinner: {
    width: 32,
    height: 32,
    border: "3px solid #e2e8f0",
    borderTopColor: "#3b82f6",
    borderRadius: "50%",
    animation: "visualSpin 0.8s linear infinite",
  },
  loadingText: { fontSize: 13, color: "#64748b", fontWeight: 500 },
  errorOverlay: {
    position: "absolute" as const,
    inset: 0,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    background: "#fef2f2",
    zIndex: 2,
    gap: 8,
    minHeight: 200,
  },
  errorIcon: { fontSize: 28 },
  errorText: { fontSize: 14, color: "#991b1b", fontWeight: 600 },
  retryBtn: {
    background: "#3b82f6",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "6px 16px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 4,
  },
  collapsedBar: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 16px",
    background: "linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)",
    border: "2px solid #e2e8f0",
    borderRadius: 12,
    cursor: "pointer",
    marginBottom: 12,
  },
  collapsedIcon: { fontSize: 16 },
  collapsedTitle: { fontSize: 13, fontWeight: 600, color: "#1e293b", flex: 1 },
  expandBtn: { fontSize: 12, color: "#3b82f6", fontWeight: 600 },
  fullscreenOverlay: {
    position: "fixed" as const,
    inset: 0,
    zIndex: 10000,
    background: "#ffffff",
    display: "flex",
    flexDirection: "column" as const,
  },
  fullscreenHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 20px",
    borderBottom: "1px solid #e2e8f0",
    background: "#f8fafc",
  },
  fullscreenTitle: { fontSize: 16, fontWeight: 700, color: "#1e293b" },
  closeBtn: {
    background: "#f1f5f9",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    padding: "6px 16px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    color: "#475569",
  },
  fullscreenBody: { flex: 1, overflow: "hidden" },
};
