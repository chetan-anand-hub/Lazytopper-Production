import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/**
 * ACTIVATION-2 B — the compact "Sign up" for a page's own MobileShell header (`rightSlot`), shown
 * to a SIGNED-OUT visitor only (nothing while auth is loading, nothing when signed in). It goes
 * to `/login?redirect=<this page's path + search>` — the same encoding as the free check's
 * sign-in path (freeCheckClient.ts FREE_CHECK_SIGNIN_PATH), so the student comes back to the
 * page they were on. Desktop never renders it: pages pass it only into their MobileShell.
 */
const CSS = `
  .lt-msu { display: inline-flex; align-items: center; justify-content: center; min-height: 44px;
    min-width: 44px; padding: 0 14px; border-radius: 999px; border: 0; background: hsl(152, 55%, 42%);
    color: #fff; font-size: 13.5px; font-weight: 700; cursor: pointer; white-space: nowrap; }
  .lt-msu:hover { background: hsl(152, 57%, 37%); }
  .lt-msu:focus-visible { outline: 2px solid hsl(152, 55%, 30%); outline-offset: 2px; }
`;

export default function MobileSignUpButton({ onBeforeNavigate }: { onBeforeNavigate?: () => void }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  if (user || loading) return null;
  const here = `${location.pathname}${location.search}`;
  return (
    <>
      <style>{CSS}</style>
      <button
        type="button"
        className="lt-msu"
        data-testid="mobile-sign-up"
        onClick={() => {
          onBeforeNavigate?.();
          // freeCheckClient.withSigninRedirect's encoding, inlined so the Practice hub's static
          // graph does not take on the free-check client.
          navigate(`/login?redirect=${encodeURIComponent(here)}`);
        }}
      >
        Sign up
      </button>
    </>
  );
}
