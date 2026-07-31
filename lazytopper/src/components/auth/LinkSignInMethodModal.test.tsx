import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * LinkSignInMethodModal — the surface, its copy, and the OPTIONALITY guarantee.
 *
 * The refusal path (`credential-already-in-use`) gets the most attention here on
 * purpose: it is not an edge case. It is the path every ALREADY-SPLIT student
 * takes, and it is the moment they learn their work is in two places and we
 * cannot join them yet. It must not read like a validation error.
 */

const sendLinkPhoneOtp = vi.fn(async (_phone: string, _container: string) => {});
const confirmLinkPhoneOtp = vi.fn(async (_code: string) => {});

const H = vi.hoisted(() => ({
  user: null as null | Record<string, unknown>,
}));

vi.mock("../../context/AuthContext", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../context/AuthContext")>();
  return {
    ...actual,
    useAuth: () => ({
      user: H.user,
      sendLinkPhoneOtp,
      confirmLinkPhoneOtp,
    }),
  };
});

import LinkSignInMethodModal from "./LinkSignInMethodModal";

beforeEach(() => {
  H.user = {
    uid: "GOOGLE-UID",
    email: "a@b.com",
    phoneNumber: null,
    displayName: "Ananya",
    providerIds: ["google.com"],
  };
});
afterEach(() => {
  cleanup();
  sendLinkPhoneOtp.mockReset();
  confirmLinkPhoneOtp.mockReset();
});

function open() {
  return render(<LinkSignInMethodModal open onClose={() => {}} />);
}

describe("the modal shows the CREDENTIALS that are linked", () => {
  it("lists the linked providers from providerIds", () => {
    open();
    expect(screen.getByText("Google")).toBeDefined();
    expect(screen.getByLabelText("Mobile number")).toBeDefined();
  });

  it("shows the linked state instead of the form once phone is linked", () => {
    H.user!.providerIds = ["google.com", "phone"];
    open();

    expect(screen.getByText("Phone number")).toBeDefined();
    // No second ask once it is done.
    expect(screen.queryByLabelText("Mobile number")).toBeNull();
  });

  it("renders nothing when closed", () => {
    const { container } = render(<LinkSignInMethodModal open={false} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });
});

describe("the OTP round trip", () => {
  it("sends to the E.164 number through the modal's OWN reCAPTCHA container", async () => {
    open();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Mobile number"), "9876543210");
    await user.click(screen.getByRole("button", { name: /send code/i }));

    await waitFor(() => expect(sendLinkPhoneOtp).toHaveBeenCalled());
    expect(sendLinkPhoneOtp).toHaveBeenCalledWith("+919876543210", "lt-link-recaptcha");
    // Distinct from Login's and /sign-up's containers.
    expect(document.getElementById("lt-link-recaptcha")).not.toBeNull();
    expect(document.getElementById("lt-login-recaptcha")).toBeNull();
    expect(document.getElementById("lt-signup-recaptcha")).toBeNull();
  });

  it("rejects a short number before spending an SMS", async () => {
    open();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Mobile number"), "98765");
    await user.click(screen.getByRole("button", { name: /send code/i }));

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Enter your 10-digit mobile number.",
    );
    expect(sendLinkPhoneOtp).not.toHaveBeenCalled();
  });
});

describe("credential-already-in-use — refuse, and explain like a human", () => {
  async function triggerRefusal() {
    sendLinkPhoneOtp.mockRejectedValueOnce(
      Object.assign(new Error("nope"), { code: "auth/credential-already-in-use" }),
    );
    open();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Mobile number"), "9876543210");
    await user.click(screen.getByRole("button", { name: /send code/i }));
    return screen.findByRole("alert");
  }

  it("explains what happened and what the student can do about it", async () => {
    const alert = await triggerRefusal();
    const text = alert.textContent ?? "";

    // States the cause...
    expect(text).toContain("already registered to another account");
    // ...offers BOTH ways forward...
    expect(text).toContain("sign in with it instead");
    expect(text).toContain("different number");
    // ...and is honest that we cannot join them yet, without pretending the
    // work is lost. This is the sentence that keeps it from reading like a
    // validation error.
    expect(text).toContain("stays where it is");
  });

  /**
   * TONE, not just wording. The screenshots at 390px showed the refusal as a
   * four-line block of error-red, which reads as a shouted validation error
   * however careful the words are. It renders as a NOTICE instead — same
   * prominence, no blame — and that is pinned here because no wording assertion
   * can see a colour.
   */
  it("renders as a NOTICE, not an error — the student did nothing wrong", async () => {
    const alert = await triggerRefusal();
    expect(alert.getAttribute("data-tone")).toBe("notice");
  });

  it("still renders a genuine input mistake as an ERROR", async () => {
    // A short number IS the student's to fix, so it keeps the red treatment.
    open();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Mobile number"), "98765");
    await user.click(screen.getByRole("button", { name: /send code/i }));

    const alert = await screen.findByRole("alert");
    expect(alert.getAttribute("data-tone")).toBe("error");
  });

  it("does not blame the student or read like a field validation", async () => {
    const alert = await triggerRefusal();
    const text = (alert.textContent ?? "").toLowerCase();

    for (const bad of ["invalid", "error", "failed", "not allowed", "denied"]) {
      expect(text, `refusal copy should not say "${bad}"`).not.toContain(bad);
    }
  });

  it("falls through to a NEUTRAL message for an unrecognised code (allowlist, fails safe)", async () => {
    sendLinkPhoneOtp.mockRejectedValueOnce(
      Object.assign(new Error("x"), { code: "auth/some-future-code" }),
    );
    open();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Mobile number"), "9876543210");
    await user.click(screen.getByRole("button", { name: /send code/i }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("Couldn't add that number just now. Please try again.");
    // The raw code must never reach a student.
    expect(alert.textContent).not.toContain("auth/");
  });
});

/**
 * ★ OPTIONALITY — the owner's absolute ruling.
 *
 * A student with no phone number must be able to use the product forever with
 * email only. This is a repo-wide scan rather than a component assertion,
 * because the way this ruling gets broken is somebody adding a link-status
 * check to a gate or a route in a file this modal never touches.
 */
describe("linking is OPTIONAL — nothing gates on it", () => {
  const SRC = resolve(process.cwd(), "src");

  function walk(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full, out);
      else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
    }
    return out;
  }

  it("no gate, route or feature consults phone-link status", () => {
    const offenders: string[] = [];
    for (const abs of walk(SRC)) {
      const rel = abs.slice(resolve(process.cwd()).length + 1).split("\\").join("/");
      // The modal and its own tests legitimately read link status.
      if (rel.includes("LinkSignInMethodModal")) continue;
      if (rel.includes("LinkPhoneNudge")) continue;
      if (rel === "src/context/AuthContext.tsx") continue;
      // The helper module IS the definition of link status; exempting it is not
      // a hole, because a gate elsewhere would still have to call it and would
      // be caught by the hasPhoneLinked( pattern below.
      if (rel === "src/lib/signInMethods.ts") continue;
      if (/\.test\.tsx?$/.test(rel)) continue;

      const src = readFileSync(abs, "utf8");
      const lines = src.split(/\r?\n/);
      lines.forEach((line, i) => {
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
        // A gate would read link status and branch on it.
        if (/hasPhoneLinked\s*\(/.test(line) || /providerIds/.test(line)) {
          offenders.push(`${rel}:${i + 1}  ${line.trim()}`);
        }
      });
    }
    expect(
      offenders,
      `linking must never gate anything — found link-status reads outside the linking surfaces:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("the modal never tells a student their account is incomplete", () => {
    // Asserted against RENDERED text, not the source: the source contains
    // explanatory comments that legitimately use these words, and what matters
    // is only what a student actually reads.
    const { container } = open();
    const shown = (container.textContent ?? "").toLowerCase();

    for (const bad of ["required", "incomplete", "must add", "you need to add", "finish setting up"]) {
      expect(shown, `copy implies the account is incomplete: "${bad}"`).not.toContain(bad);
    }
    // ...and says the opposite, explicitly.
    expect(shown).toContain("optional");
  });

  // ── AUTH-2-FU §5 · the sentence that argued against itself ──────────────
  //
  // ★ "This is optional — your account works exactly the same without it"
  // DISCOURAGED the exact action it was asking for. It is the "works exactly
  // the same without it" clause that goes, NEVER the optionality: Lane F's
  // ruling stands, and linking must never imply an account is incomplete
  // without it. Both halves are asserted, because dropping the word "optional"
  // while removing the clause would trade one defect for a worse one.
  it("★ states the BENEFIT of linking, and still says it is optional", () => {
    const { container } = open();
    const shown = container.textContent ?? "";

    expect(shown).not.toContain("works exactly the same without it");
    expect(shown.toLowerCase()).toContain("optional");
    expect(shown).toContain("both bring you to this account");
    expect(shown).toContain("you can add it any time");
  });
});
