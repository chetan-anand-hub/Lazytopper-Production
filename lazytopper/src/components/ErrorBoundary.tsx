import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: "global" | "section";
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReload = () => {
    if (this.props.level === "section") {
      this.setState({ hasError: false, error: null });
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const isGlobal = this.props.level === "global";
      return (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          minHeight: isGlobal ? "100vh" : 200, padding: 32, textAlign: "center",
          fontFamily: "'Inter', sans-serif",
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{isGlobal ? "😵" : "⚠️"}</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
            {isGlobal ? "Something went wrong" : "This section ran into an issue"}
          </h2>
          <p style={{ fontSize: 13, opacity: 0.6, marginBottom: 20, maxWidth: 320, lineHeight: 1.6 }}>
            {isGlobal
              ? "The app encountered an unexpected error. Please reload to continue."
              : "Don't worry — the rest of the app still works fine."}
          </p>
          <button
            onClick={this.handleReload}
            style={{
              padding: "10px 24px", borderRadius: 10, border: "none",
              background: "#22c55e", color: "#000", fontWeight: 700,
              fontSize: 14, cursor: "pointer",
            }}
          >
            {isGlobal ? "Reload App" : "Try Again"}
          </button>
          {this.state.error && (
            <pre style={{
              marginTop: 16, fontSize: 10, opacity: 0.3, maxWidth: 400,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export function SectionErrorBoundary({ children }: { children: ReactNode }) {
  return <ErrorBoundary level="section">{children}</ErrorBoundary>;
}

export default ErrorBoundary;
