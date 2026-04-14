import { useState, useRef, useCallback, useEffect } from "react";

interface VisualExplainerProps {
  src: string;
  title: string;
  height?: number;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  topic?: string;
  concept?: string;
  subject?: string;
}

export function VisualExplainer({
  src,
  title,
  height = 400,
  collapsible = true,
  defaultCollapsed = false,
  topic,
  concept,
  subject,
}: VisualExplainerProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [resolvedSrc, setResolvedSrc] = useState(src);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  const handleLoad = useCallback(() => {
    setLoading(false);
    setError(false);
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
    setResolvedSrc(src);
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    let cancelled = false;

    fetch(src, { method: "HEAD" })
      .then((res) => {
        if (cancelled) return;
        if (res.ok && res.headers.get("content-type")?.includes("text/html")) {
          return;
        }
        return tryLiveFallback(cancelled);
      })
      .catch(() => {
        if (!cancelled) return tryLiveFallback(cancelled);
      });

    function tryLiveFallback(isCancelled: boolean) {
      if (isCancelled) return;
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
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (isCancelled) return;
          if (data.ok && data.html) {
            const blob = new Blob([data.html], { type: "text/html" });
            const url = URL.createObjectURL(blob);
            blobUrlRef.current = url;
            setResolvedSrc(url);
          } else {
            setError(true);
            setLoading(false);
          }
        })
        .catch(() => {
          if (!isCancelled) {
            setError(true);
            setLoading(false);
          }
        });
    }

    return () => { cancelled = true; };
  }, [src, topic, concept, subject, title]);

  useEffect(() => {
    if (!fullscreen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
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

  const iframeContent = (
    <iframe
      ref={iframeRef}
      src={resolvedSrc}
      title={title}
      sandbox="allow-scripts"
      style={{
        ...styles.iframe,
        height: fullscreen ? "100%" : height,
      }}
      onLoad={handleLoad}
      onError={handleError}
    />
  );

  if (fullscreen) {
    return (
      <div style={styles.fullscreenOverlay}>
        <div style={styles.fullscreenHeader}>
          <span style={styles.fullscreenTitle}>{"\u{1F4CA}"} {title}</span>
          <button
            onClick={() => setFullscreen(false)}
            style={styles.closeBtn}
          >
            {"\u2715"} Close
          </button>
        </div>
        <div style={styles.fullscreenBody}>
          {iframeContent}
        </div>
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
          <button
            onClick={() => setFullscreen(true)}
            style={styles.actionBtn}
            title="Fullscreen"
          >
            {"\u26F6"}
          </button>
          {collapsible && (
            <button
              onClick={() => setCollapsed(true)}
              style={styles.actionBtn}
              title="Collapse"
            >
              {"\u25B2"}
            </button>
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
              onClick={() => {
                setError(false);
                setLoading(true);
                if (iframeRef.current) {
                  iframeRef.current.src = resolvedSrc;
                }
              }}
              style={styles.retryBtn}
            >
              Retry
            </button>
          </div>
        )}
        {iframeContent}
      </div>
    </div>
  );
}

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
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  icon: {
    fontSize: 18,
  },
  title: {
    fontSize: 14,
    fontWeight: 700,
    color: "#1e293b",
  },
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
  body: {
    position: "relative" as const,
    minHeight: 100,
  },
  iframe: {
    width: "100%",
    border: "none",
    display: "block",
    background: "#ffffff",
  },
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
  loadingText: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: 500,
  },
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
  errorIcon: {
    fontSize: 28,
  },
  errorText: {
    fontSize: 14,
    color: "#991b1b",
    fontWeight: 600,
  },
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
  collapsedIcon: {
    fontSize: 16,
  },
  collapsedTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: "#1e293b",
    flex: 1,
  },
  expandBtn: {
    fontSize: 12,
    color: "#3b82f6",
    fontWeight: 600,
  },
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
  fullscreenTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "#1e293b",
  },
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
  fullscreenBody: {
    flex: 1,
    overflow: "hidden",
  },
};
