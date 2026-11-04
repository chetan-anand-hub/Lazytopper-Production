import { useNavigate, useLocation } from "react-router-dom";

type QuickLink = {
  label: string;
  to: string;
};

function isChipActive(chipTo: string, currentPath: string): boolean {
  if (!chipTo) return false;
  const chipBase = chipTo.split("?")[0].replace(/\/$/, "");
  const current = currentPath.replace(/\/$/, "");
  if (chipBase === "" || chipBase === "/") return current === "" || current === "/";
  return current === chipBase || current.startsWith(chipBase + "/");
}

/**
 * NAV-FIX-1: `backTo` / `backLabel` are optional. The NAV-1 header row (RouteNavBar) owns Back on every page, so a page
 * that only wants the quick-link chips passes neither and no second back button is drawn.
 */
export default function ReturnContextBar(props: {
  backTo?: string;
  backLabel?: string;
  quickLinks?: QuickLink[];
  currentLabel?: string;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const quickLinks = Array.isArray(props.quickLinks) ? props.quickLinks : [];

  return (
    <div className="ux-return-bar" data-testid="ux-return-context">
      {props.backTo && props.backLabel ? (
        <button
          type="button"
          className="ux-return-bar__back"
          onClick={() => {
            const to = props.backTo as string;
            if (to === "/") {
              window.location.href = "/";
            } else {
              navigate(to);
            }
          }}
          aria-label={props.backLabel}
        >
          {"<-"} {props.backLabel}
        </button>
      ) : null}
      {(quickLinks.length > 0 || props.currentLabel) ? (
        <div className="ux-return-bar__chips" aria-label="Quick navigation">
          {props.currentLabel && (
            <span
              className="ux-return-bar__chip"
              data-active="true"
              aria-current="page"
            >
              {props.currentLabel}
            </span>
          )}
          {quickLinks.map((chip) => {
            const active = isChipActive(chip.to, location.pathname);
            return (
              <button
                key={`${chip.label}:${chip.to}`}
                type="button"
                className="ux-return-bar__chip"
                data-active={active ? "true" : "false"}
                onClick={() => navigate(chip.to)}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
