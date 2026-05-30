import type { ReactNode } from "react";
import { MUTED } from "./tokens";

/**
 * SectionHeader — small uppercase, letter-spaced, muted label that introduces a
 * section. Renders an <h3> by default (override via `as`). Stable class hook
 * `lt-grammar-section-header`.
 */
export function SectionHeader({
  children,
  as: Tag = "h3",
  className,
}: {
  children: ReactNode;
  /** Heading element to render. Default "h3". */
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  className?: string;
}) {
  return (
    <Tag
      className={
        className
          ? `lt-grammar-section-header ${className}`
          : "lt-grammar-section-header"
      }
      style={{
        margin: 0,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: MUTED,
      }}
    >
      {children}
    </Tag>
  );
}
