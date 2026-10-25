/**
 * limitsCopy — LIMITS-1: every sentence a student reads about the download limit, as PURE
 * functions of numbers the SERVER sent. Plain, child-appropriate, no countdown, no seat count.
 * A number is never typed here: the limit, what is left and the time all arrive from the server.
 */
import { formatResetIst } from "../usage/fairUseGate";
import type { DownloadCounters } from "../../services/limitsClient";

export const SIGNED_OUT_CHIP = "Sign up — your first download is free";
export const FIRST_FREE_CHIP = "Your first download is free.";

/** The chip beside a download button, or null when there is nothing honest to say. */
export function chipText(tier: string | null, d: DownloadCounters | null, nowMs: number = Date.now()): string | null {
  if (!d || !d.metered || d.limit === null) return null;
  if (d.firstFreeAvailable) return FIRST_FREE_CHIP;
  const left = d.remaining ?? Math.max(0, d.limit - d.used);
  if (left <= 0) {
    const when = d.resetAt ? formatResetIst(d.resetAt, nowMs) : "";
    return when ? `Next free download: ${when}` : "No free downloads left this week";
  }
  if (tier === "trial") return `${left} of ${d.limit} downloads left this week`;
  return `Free download: ${left} left this week`;
}

export interface DownloadWallCopy {
  title: string;
  body: string;
  keep: string;
}

export function blockedWallCopy(resetAt: string | null, nowMs: number = Date.now()): DownloadWallCopy {
  const when = resetAt ? formatResetIst(resetAt, nowMs) : "";
  return {
    title: "You've used this week's free download",
    body:
      (when ? `Your next free download opens ${when}. ` : "") +
      "Premium gives you unlimited downloads, graded practice sets and the full step-by-step breakdown.",
    keep: "Keep using Basic",
  };
}

export const SIGNED_OUT_WALL: DownloadWallCopy = {
  title: "Sign up — your first download is free",
  body: "Make a free account and download your first paper on us. You can keep reading every question and solution here.",
  keep: "Not now",
};

export const OFFLINE_WALL: DownloadWallCopy = {
  title: "Connect to download",
  body: "We need a connection to start your download. Try again once you are back online. Your paper is still here.",
  keep: "OK",
};
