// SYLLABUS-FIX-CODE F5 — the tutor rejects a topic key outside CBSE's 26 board chapters.
//
// The route is mounted through the same path shape App.tsx uses, inside a router; the
// session hook is mocked so the test proves the rejection happens BEFORE any tutor
// session (and so before any call to the tutor) starts.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { BOARD_CHAPTER_KEYS } from "../../config/syllabus2026-27";

const H = vi.hoisted(() => ({ sessions: [] as Array<Record<string, unknown>> }));

vi.mock("./useTutorSession", () => ({
  useTutorSession: (args: Record<string, unknown>) => {
    H.sessions.push(args);
    throw new Error("TUTOR SESSION STARTED");
  },
}));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: null }) }));

import TutorPage, { isTutorTopicKeyAllowed } from "./TutorPage";

const mount = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/tutor/:grade/:subject/:topicKey" element={<TutorPage />} />
        <Route path="/tutor/:grade/:subject" element={<TutorPage />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  H.sessions.length = 0;
});

describe("F5 — tutor topic keys outside the 26 board chapters are rejected", () => {
  it("every one of the 26 board chapter keys (and legacy aliases of them) is allowed", () => {
    for (const k of BOARD_CHAPTER_KEYS) expect(isTutorTopicKeyAllowed(k), k).toBe(true);
    expect(isTutorTopicKeyAllowed("heredity-and-evolution")).toBe(true); // legacy alias -> heredity
    expect(isTutorTopicKeyAllowed("human-eye")).toBe(true);
    expect(isTutorTopicKeyAllowed("")).toBe(true); // cold entry /tutor/:grade/:subject
  });

  it.each(["sources-of-energy", "management-of-natural-resources", "periodic-classification-of-elements", "constructions", "not-a-chapter"])(
    "planted key %s is rejected",
    (k) => {
      expect(isTutorTopicKeyAllowed(k)).toBe(false);
    },
  );

  it("a planted OUT key renders the honest screen and never starts a tutor session", () => {
    mount("/tutor/10/science/sources-of-energy");
    expect(screen.getByRole("alert").textContent).toMatch(/isn.t in your 2027 board exam/);
    expect(screen.getByRole("alert").textContent).toMatch(/26 chapters/);
    expect(screen.getByRole("link", { name: "Pick a chapter" }).getAttribute("href")).toBe("/topic-hub");
    expect(H.sessions).toEqual([]);
  });

  it("a formative-only whole chapter is named as school-assessed, not in the 2027 exam", () => {
    mount("/tutor/10/science/periodic-classification-of-elements");
    expect(screen.getByRole("alert").textContent).toMatch(
      /Periodic Classification of Elements is assessed only in school.*not in your 2027 board exam/,
    );
    expect(H.sessions).toEqual([]);
  });

  it("CONTROL: a board chapter key DOES start the tutor session", () => {
    expect(() => mount("/tutor/10/science/human-eye-and-colourful-world")).toThrow("TUTOR SESSION STARTED");
    expect(H.sessions.length).toBeGreaterThan(0);
    expect(H.sessions[0].topicKey).toBe("human-eye-and-colourful-world");
  });
});
