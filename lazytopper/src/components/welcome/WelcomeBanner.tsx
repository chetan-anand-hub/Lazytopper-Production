/**
 * WelcomeBanner — SELFPAY-ATTACH-1 (owner 12 Nov 2026): after a sign-in from the pay-first flow, Home / My packs say the purchase is
 * active. ONLY when the entitlement is really there (the subscription record for a Board Pass; the server's owned packs for a pack):
 * the param alone shows nothing. Dismissible; the param is removed (replace) once the banner has been shown or dismissed, or after
 * a wait with nothing to show (the claim may still be landing for a moment).
 */
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";
import { fetchMyPacks } from "../../services/packs";
import type { WelcomeKind } from "./WelcomeBannerGate";
import "./welcomeBanner.css";

export const WELCOME_PASS_TITLE = "Your Board Pass is active ✓";
export const WELCOME_PASS_LINE = "Valid till 28 Feb 2027. Every feature is open.";
export const WELCOME_PACK_TITLE = "Your pack is ready ✓";
export const WELCOME_PACK_LINE = "Download it below.";
/** MYPACKS-TS-1: the Test Series Pack is online - nothing to download. */
export const WELCOME_SERIES_TITLE = "Your Test Series is ready ✓";
export const WELCOME_SERIES_LINE = "Start it from My packs.";
const GIVE_UP_MS = 20_000;

export default function WelcomeBanner({ kind, packId = "", giveUpMs = GIVE_UP_MS }: { kind: WelcomeKind; /** The pack just bought (`sku:target`); a pack banner needs it. */ packId?: string; /** Test seam. */ giveUpMs?: number }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const subscription = useSubscription();
  const [packOwned, setPackOwned] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const end = subscription.status.passEnd ? Date.parse(subscription.status.passEnd) : NaN;
  const passReal =
    Boolean(user) && subscription.hydrated && subscription.status.tier === "premium" && subscription.status.plan === "pass_till_boards" && Number.isFinite(end) && end > Date.now();
  const real = kind === "board_pass" ? passReal : packOwned;

  useEffect(() => {
    if (kind !== "pack" || !user || !packId) return undefined;
    let cancelled = false;
    let tries = 0;
    const read = () => {
      fetchMyPacks()
        .then((mine) => {
          if (cancelled) return;
          if (mine.packs.some((p) => p.packId === packId)) setPackOwned(true);
          else if (++tries < 4) window.setTimeout(read, 2500);
        })
        .catch(() => undefined);
    };
    read();
    return () => {
      cancelled = true;
    };
  }, [kind, user, packId]);

  const clearParam = () => {
    const rest = new URLSearchParams(location.search);
    rest.delete("welcome");
    rest.delete("pack");
    const search = rest.toString();
    navigate({ pathname: location.pathname, search: search ? `?${search}` : "", hash: location.hash }, { replace: true });
  };
  useEffect(() => {
    if (real) return undefined;
    const id = window.setTimeout(clearParam, giveUpMs);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real]);
  useEffect(() => {
    if (real) clearParam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real]);

  if (!real || dismissed) return null;
  const series = kind === "pack" && packId.startsWith("test_series");
  return (
    <div className="lt-welcome" role="status" data-testid="welcome-banner">
      <p className="lt-welcome__text">
        <strong>{kind === "pack" ? (series ? WELCOME_SERIES_TITLE : WELCOME_PACK_TITLE) : WELCOME_PASS_TITLE}</strong>
        <span>{kind === "pack" ? (series ? WELCOME_SERIES_LINE : WELCOME_PACK_LINE) : WELCOME_PASS_LINE}</span>
      </p>
      <button type="button" className="lt-welcome__close" aria-label="Dismiss" onClick={() => setDismissed(true)}>
        {"×"}
      </button>
    </div>
  );
}
