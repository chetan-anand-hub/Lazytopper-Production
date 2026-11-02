/**
 * PAY-PHONE-1 — the once-only "Student's name for your PDFs" question for a phone-only account: validation, Save through
 * the profile update, Skip remembered on this device, and the licence preview with the MASKED number only.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import PackNamePrompt, { PACK_NAME_BAD } from "./PackNamePrompt";
import { cleanStudentName, packNameSkipped } from "../../services/studentName";

afterEach(() => {
  cleanup();
  try {
    window.localStorage.clear();
  } catch {
    /* ignore */
  }
});

describe("PAY-PHONE-1 · student name", () => {
  it.each([
    ["  Asha   Rao ", "Asha Rao"],
    ["D'Souza-Pai Jr.", "D'Souza-Pai Jr."],
    ["आरव शर्मा", "आरव शर्मा"],
    ["", null],
    ["...", null],
    ["Asha1", null],
    ["a@b.in", null],
    ["x".repeat(41), null],
  ])("cleanStudentName(%j) -> %j", (raw, want) => {
    expect(cleanStudentName(raw)).toBe(want);
  });

  it("Save sends the cleaned name and re-reads; the preview shows the masked number only", async () => {
    const save = vi.fn(async (n: string) => n);
    const onDone = vi.fn();
    render(<PackNamePrompt uid="u1" phoneMasked="+91 98•••••948" onDone={onDone} save={save} />);
    expect(screen.getByText("Student's name for your PDFs")).toBeTruthy();
    fireEvent.change(screen.getByTestId("pack-name-input"), { target: { value: " Asha  Rao " } });
    expect(screen.getByTestId("pack-name-prompt").textContent).toContain("Licensed to Asha Rao · +91 98•••••948");
    fireEvent.click(screen.getByTestId("pack-name-save"));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(true));
    expect(save).toHaveBeenCalledWith("Asha Rao");
  });

  it("an invalid name is refused with the plain rule, nothing saved", async () => {
    const save = vi.fn(async (n: string) => n);
    render(<PackNamePrompt uid="u1" phoneMasked="+91 98•••••948" onDone={vi.fn()} save={save} />);
    fireEvent.change(screen.getByTestId("pack-name-input"), { target: { value: "Asha99" } });
    fireEvent.click(screen.getByTestId("pack-name-save"));
    expect(screen.getByRole("alert").textContent).toBe(PACK_NAME_BAD);
    expect(save).not.toHaveBeenCalled();
  });

  it("Skip is remembered on this device (never the uid in the key) and prints the number only", () => {
    const onDone = vi.fn();
    render(<PackNamePrompt uid="uid-secret" phoneMasked="+91 98•••••948" onDone={onDone} />);
    fireEvent.click(screen.getByTestId("pack-name-skip"));
    expect(onDone).toHaveBeenCalledWith(false);
    expect(packNameSkipped("uid-secret")).toBe(true);
    expect(packNameSkipped("someone-else")).toBe(false);
    expect(Object.keys(window.localStorage).some((k) => k.includes("uid-secret"))).toBe(false);
  });
});
