/** PacksFooterLink — PACKS-ENTRY-1 (c): the "PDF packs" footer entry, in its own lazy chunk (see packEntryLazy.ts). */
import { Link, useNavigate } from "react-router-dom";
import { firePackEntryClick, packsHref } from "./packEntry";

export default function PacksFooterLink({
  variant,
  href,
  onDone,
}: {
  variant: "link" | "menu";
  href?: string;
  onDone?: () => void;
}) {
  const navigate = useNavigate();
  if (variant === "link") {
    return (
      <Link
        to={href ?? packsHref()}
        onClick={() => firePackEntryClick("footer")}
      >
        PDF packs
      </Link>
    );
  }
  // The desktop dropdown's legal row: the same quiet button as its neighbours (Privacy · Terms · Cancellation & Refunds).
  return (
    <>
      <button
        type="button"
        className="lt-packs-footer-btn"
        onClick={() => {
          firePackEntryClick("footer");
          onDone?.();
          navigate(packsHref());
        }}
      >
        PDF packs
      </button>
      <style>{MENU_CSS}</style>
    </>
  );
}

const MENU_CSS = `
.lt-packs-footer-btn { background: transparent; border: none; padding: 2px 0; font-size: 11.5px; font-weight: 500; color: hsl(220,12%,58%); cursor: pointer; }
.lt-packs-footer-btn:hover, .lt-packs-footer-btn:focus-visible { text-decoration: underline; }
`;
