/**
 * TrialStartButton - ASK-COPY-1. "Start your free 7-day trial": the lead action on the tutor card
 * and the upgrade sheet for a student who can still start the free week. The PARENT decides
 * eligibility (it already holds the subscription record); this only acts on an explicit tap -
 * signed in: start the trial (server-pinned) then `onStarted`; signed out: to sign-in, which
 * returns here. Never on mount.
 */
import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { START_TRIAL_LABEL, startTrialFromTap, trialLoginHref } from "./trialCta";

export default function TrialStartButton({
  uid,
  returnTo,
  className,
  onStarted,
}: {
  uid: string;
  returnTo: string;
  className: string;
  onStarted: () => void;
}) {
  const navigate = useNavigate();
  const fired = useRef(false);
  const onClick = () => {
    if (!uid) {
      navigate(trialLoginHref(returnTo));
      return;
    }
    if (fired.current) return;
    fired.current = true;
    startTrialFromTap(uid);
    onStarted();
  };
  return (
    <button type="button" className={className} data-testid="start-trial-cta" onClick={onClick}>
      {START_TRIAL_LABEL}
    </button>
  );
}
