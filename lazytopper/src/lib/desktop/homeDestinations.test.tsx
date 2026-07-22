import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";

import {
  composeTutorEntry,
  PRIMARY_CARDS,
  TutorPickerModal,
  loginUrl,
  tutorGateNote,
} from "./homeDestinations";
import { desktopTopicsBySubject } from "./topics";

afterEach(cleanup);

/**
 * SPEC §3 — the login/return contract.
 *
 * The "Ask your tutor" pop-card must compose an EXISTING url and must NOT route
 * around `RequirePremium featureLabel="Ask the tutor"`, which wraps
 * `/tutor/:grade/:subject/:topicKey` in App.tsx. These tests are the executable
 * proof; without them a refactor could silently drop the `redirect` param and
 * strand a logged-out student on Home after login.
 */

/** Renders the live location so we can assert where the picker actually went. */
function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="loc">{loc.pathname + loc.search}</div>;
}

function renderPicker(isSignedIn: boolean) {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <TutorPickerModal open onClose={() => {}} isSignedIn={isSignedIn} />
      <LocationProbe />
    </MemoryRouter>,
  );
}

function pick(subject: string, chapterSlug: string) {
  fireEvent.change(screen.getByLabelText("Subject"), { target: { value: subject } });
  fireEvent.change(screen.getByLabelText("Chapter"), { target: { value: chapterSlug } });
  fireEvent.click(screen.getByTestId("tutor-picker-open"));
}

describe("composeTutorEntry — SPEC §3 login/return contract", () => {
  const SIGNED_IN_URL = "/tutor/10/Science/electricity?source=home&returnTo=%2F";

  it("signed IN → goes straight to the composed tutor URL", () => {
    expect(
      composeTutorEntry({ subject: "Science", topicKey: "electricity", isSignedIn: true }),
    ).toBe(SIGNED_IN_URL);
  });

  it("builds the byte-identical URL Topic Hub's askTutorHref builds today", () => {
    // askTutorHref = buildTutorPath({ subject, topicKey: topic.slug, ...routeContext }).
    // Same builder, same slug source, same source/returnTo pair.
    expect(
      composeTutorEntry({ subject: "Maths", topicKey: "quadratic-equations", isSignedIn: true }),
    ).toBe("/tutor/10/Maths/quadratic-equations?source=home&returnTo=%2F");
  });

  it("★ signed OUT → /login carrying the chosen chapter inside ?redirect", () => {
    const url = composeTutorEntry({
      subject: "Science",
      topicKey: "electricity",
      isSignedIn: false,
    });

    // It is the LOGIN page…
    expect(url.startsWith("/login?")).toBe(true);
    expect(url).toBe(
      "/login?reason=tutor&redirect=%2Ftutor%2F10%2FScience%2Felectricity%3Fsource%3Dhome%26returnTo%3D%252F",
    );

    // …and the chapter survives the round-trip: decoding ?redirect yields the
    // exact signed-in tutor URL, so login returns the student to THAT chapter.
    const redirect = new URL(url, "http://x").searchParams.get("redirect");
    expect(redirect).toBe(SIGNED_IN_URL);
    expect(redirect).toContain("electricity");
  });

  it("★ signed OUT NEVER lands on /tutor directly — the premium gate still fires", () => {
    // RequirePremium wraps the /tutor route. Routing a logged-out student
    // straight there would bypass the login step the gate depends on. The
    // contract is: the top-level destination is /login, never /tutor.
    for (const subject of ["Maths", "Science"] as const) {
      for (const t of desktopTopicsBySubject(subject)) {
        const url = composeTutorEntry({ subject, topicKey: t.slug, isSignedIn: false });
        expect(url.startsWith("/login?")).toBe(true);
        expect(url.startsWith("/tutor")).toBe(false);
      }
    }
  });

  it("the redirect target is a safe internal path (Login's isSafeInternalPath)", () => {
    const redirect = new URL(
      composeTutorEntry({ subject: "Maths", topicKey: "triangles", isSignedIn: false }),
      "http://x",
    ).searchParams.get("redirect")!;
    // Mirrors Login.tsx:9 — relative, no protocol, no backslash.
    expect(redirect.startsWith("/")).toBe(true);
    expect(redirect.startsWith("//")).toBe(false);
    expect(redirect.includes("\\")).toBe(false);
    expect(/[a-zA-Z][a-zA-Z0-9+.-]*:/.test(redirect)).toBe(false);
  });

  it("reuses the existing loginUrl helper rather than a second encoder", () => {
    const tutorPath = composeTutorEntry({
      subject: "Science",
      topicKey: "electricity",
      isSignedIn: true,
    });
    expect(composeTutorEntry({ subject: "Science", topicKey: "electricity", isSignedIn: false }))
      .toBe(loginUrl("tutor", tutorPath));
  });
});

describe("TutorPickerModal — the rendered pop-card", () => {
  it("★ logged-out student picking Science → Electricity lands on /login with that chapter", () => {
    renderPicker(false);
    pick("Science", "electricity");

    expect(screen.getByTestId("loc")).toHaveTextContent(
      "/login?reason=tutor&redirect=%2Ftutor%2F10%2FScience%2Felectricity%3Fsource%3Dhome%26returnTo%3D%252F",
    );
  });

  it("logged-in student picking Science → Electricity opens the tutor directly", () => {
    renderPicker(true);
    pick("Science", "electricity");

    expect(screen.getByTestId("loc")).toHaveTextContent(
      "/tutor/10/Science/electricity?source=home&returnTo=%2F",
    );
  });

  it("the chapter list changes with the subject", () => {
    renderPicker(true);
    const chapter = screen.getByLabelText("Chapter") as HTMLSelectElement;

    const mathsOptions = Array.from(chapter.options).map((o) => o.value);
    expect(mathsOptions).toContain("quadratic-equations");
    expect(mathsOptions).not.toContain("electricity");

    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "Science" } });
    const scienceOptions = Array.from(chapter.options).map((o) => o.value);
    expect(scienceOptions).toContain("electricity");
    expect(scienceOptions).not.toContain("quadratic-equations");
  });

  it("every chapter option value is a real topics.ts SLUG — never a display name", () => {
    renderPicker(true);
    const chapter = screen.getByLabelText("Chapter") as HTMLSelectElement;
    const slugs = new Set(desktopTopicsBySubject("Maths").map((t) => t.slug));
    for (const opt of Array.from(chapter.options)) {
      expect(slugs.has(opt.value)).toBe(true);
      // A display name would carry spaces / capitals; a slug never does.
      expect(opt.value).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("switching subject cannot strand a stale chapter from the other subject", () => {
    renderPicker(true);
    // Maths chapter chosen, then subject flips to Science.
    fireEvent.change(screen.getByLabelText("Chapter"), { target: { value: "triangles" } });
    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "Science" } });
    fireEvent.click(screen.getByTestId("tutor-picker-open"));

    // It must open a SCIENCE chapter, never /tutor/10/Science/triangles.
    const loc = screen.getByTestId("loc").textContent ?? "";
    expect(loc).not.toContain("triangles");
    expect(loc.startsWith("/tutor/10/Science/")).toBe(true);
  });

  it("shows the state-dependent gate note with frozen trial framing", () => {
    renderPicker(false);
    expect(screen.getByTestId("tutor-picker-gate-note")).toHaveTextContent(
      /Log in to open your tutor\..*straight back to this chapter/i,
    );
    cleanup();

    renderPicker(true);
    const note = screen.getByTestId("tutor-picker-gate-note");
    expect(note).toHaveTextContent(/7-day trial — then free Basic/i);
    // Trial framing is frozen — never "then paid".
    expect(note.textContent).not.toMatch(/then paid/i);
  });

  it("tutorGateNote never promises anything but the frozen framing", () => {
    expect(tutorGateNote(true)).not.toMatch(/then paid/i);
    expect(tutorGateNote(false)).toMatch(/Log in to open your tutor/);
  });

  it("renders nothing when closed", () => {
    render(
      <MemoryRouter>
        <TutorPickerModal open={false} onClose={() => {}} isSignedIn />
      </MemoryRouter>,
    );
    expect(screen.queryByTestId("tutor-picker")).toBeNull();
  });
});

describe("PRIMARY_CARDS — SPEC §2 inventory", () => {
  it("is four cards in journey order", () => {
    expect(PRIMARY_CARDS.map((c) => c.label)).toEqual([
      "See what's likely",
      "Ask your tutor",
      "Practise it",
      "Check my answer",
    ]);
  });

  it("★ has no duplicate destination — the retired Worksheets hero's bug", () => {
    // The Worksheets card and the Practice card both pointed at
    // `/practice-hub?source=home&returnTo=%2F`. Home shipped a literally
    // duplicated slot; this asserts it cannot come back.
    const destinations = PRIMARY_CARDS.filter((c) => c.kind === "link").map((c) => c.to);
    expect(new Set(destinations).size).toBe(destinations.length);
    expect(PRIMARY_CARDS.some((c) => c.label === "Worksheets")).toBe(false);
  });

  it("keeps every destination on an existing route (nothing invented)", () => {
    const links = PRIMARY_CARDS.filter((c) => c.kind === "link").map((c) => c.to);
    expect(links).toEqual([
      "/exam-trends?source=home&returnTo=%2F",
      "/practice-hub?source=home&returnTo=%2F",
      "/check-improve?source=home&returnTo=%2F",
    ]);
  });

  it("the tutor card has NO destination — it opens the picker", () => {
    const tutor = PRIMARY_CARDS.find((c) => c.label === "Ask your tutor");
    expect(tutor?.kind).toBe("tutor");
    // A `to` here would mean the card navigates somewhere without a chapter.
    expect(tutor && "to" in tutor).toBe(false);
  });
});
