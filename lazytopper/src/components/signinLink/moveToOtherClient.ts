/**
 * moveToOtherClient - SIGNED-IN-MOVE-1. POST /api/pay/move-to-other { orderId, phone | email } with the buyer's Firebase token.
 * The raw contact goes to the server in the body only: never to a URL, storage, analytics or a log. The answer carries the target
 * MASKED. Never throws: every failure is a typed result the card can show.
 */
import { authHeaders } from "../../services/checkout";

export const MOVE_TO_OTHER_ENDPOINT = "/api/pay/move-to-other";

export type MoveContact = { phone: string } | { email: string };
export type MoveResult =
  | { ok: true; kind: string; masked: string; contact: "phone" | "email" }
  | { ok: false; reason: string };

export async function moveToOther(orderId: string, contact: MoveContact): Promise<MoveResult> {
  try {
    const res = await fetch(MOVE_TO_OTHER_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ orderId, ...contact }),
    });
    let json: Record<string, unknown> | null = null;
    try {
      json = (await res.json()) as Record<string, unknown>;
    } catch {
      json = null;
    }
    if (res.ok && json && json.ok === true) {
      const to = (json.to ?? {}) as { kind?: unknown; masked?: unknown };
      return {
        ok: true,
        kind: typeof json.kind === "string" ? json.kind : "",
        masked: typeof to.masked === "string" ? to.masked : "",
        contact: to.kind === "email" ? "email" : "phone",
      };
    }
    if (res.status === 404) return { ok: false, reason: "unavailable" };
    if (res.status === 429) return { ok: false, reason: "rate_limited" };
    const reason = json && typeof json.reason === "string" ? json.reason : "error";
    return { ok: false, reason };
  } catch {
    return { ok: false, reason: "error" };
  }
}
