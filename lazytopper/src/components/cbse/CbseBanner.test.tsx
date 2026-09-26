// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import CbseBanner, { CBSE_BANNER_DISMISSED_KEY } from "./CbseBanner";

/**
 * GUARD — the Home CBSE banner (CBSE-AUTO-1 C12): none / one / dismissed / a newer
 * one reappears.
 *
 * ★ "RENDERS NOTHING" IS ONLY MEANINGFUL NEXT TO "RENDERS SOMETHING". Every null case
 * below waits until the manifest request has actually been made (or proves why none
 * was), and the "one" case uses the same harness — so a banner that never rendered at
 * all could not pass the null cases by accident.
 */

const BUCKET = "test-bucket.firebasestorage.app";

type Circular = {
  id: string;
  date: string;
  title: string;
  href: string;
  source: "document" | "index";
  important: boolean;
  headline: string;
};

function manifest(circulars: Circular[]) {
  return { v: 1, generatedAt: "2026-09-26T00:31:00.000Z", papers: [], circulars, circularsCheckedAt: "2026-09-26T00:31:00.000Z" };
}

const SQP: Circular = {
  id: "sqp-2627",
  date: "2026-09",
  title: "Sample Question Papers for Classes X & XII 2026-27",
  href: "https://cbseacademic.nic.in/web_material/Notifications/2026/132_Notification_2026.pdf",
  source: "document",
  important: true,
  headline: "New CBSE sample papers are out",
};
const DATESHEET: Circular = {
  id: "datesheet-2027",
  date: "2026-10-20",
  title: "Date sheet for Class X 2027",
  href: "https://www.cbse.gov.in/cbsenew/documents/DateSheet_X_2027.pdf",
  source: "document",
  important: true,
  headline: "The 2027 board exam date sheet is out",
};
const QUIET: Circular = { ...SQP, id: "quiet", title: "Observance of Swachhata", important: false, headline: "" };

let fetchMock: ReturnType<typeof vi.fn>;

function serve(body: unknown, status = 200) {
  fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fetchMock);
}

/**
 * Let the manifest request, its JSON parse and the resulting state update all land.
 * The "settle is enough" CONTROL below proves a banner that SHOULD render has
 * rendered by the time this returns — so an empty container after it is a real
 * "renders nothing", not a render that had not happened yet.
 */
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 30));
  });
}

function renderBanner() {
  return render(
    <MemoryRouter>
      <CbseBanner />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.stubEnv("VITE_FIREBASE_STORAGE_BUCKET", BUCKET);
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("one — the newest important circular's headline", () => {
  it("★ DEFAULT PATH (no localStorage entry): shows the headline, linking to /cbse/class-10", async () => {
    serve(manifest([QUIET, SQP]));
    renderBanner();
    const link = await screen.findByRole("link", { name: /New CBSE sample papers are out/ });
    // No /app/ prefix: the router's basename supplies it.
    expect(link.getAttribute("href")).toBe("/cbse/class-10");
    expect(screen.getByRole("button", { name: /Dismiss/ })).toBeTruthy();
    expect(window.localStorage.getItem(CBSE_BANNER_DISMISSED_KEY)).toBeNull();
  });

  it("CONTROL — settle() is long enough for a banner that should render to have rendered", async () => {
    serve(manifest([SQP]));
    renderBanner();
    await settle();
    expect(screen.getByText("New CBSE sample papers are out")).toBeTruthy();
  });

  it("shows only the NEWEST important row", async () => {
    serve(manifest([SQP, DATESHEET]));
    renderBanner();
    expect(await screen.findByText("The 2027 board exam date sheet is out")).toBeTruthy();
    expect(screen.queryByText("New CBSE sample papers are out")).toBeNull();
  });
});

describe("none", () => {
  it("renders nothing when the manifest fails (network error)", async () => {
    fetchMock = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    vi.stubGlobal("fetch", fetchMock);
    const { container } = renderBanner();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await settle();
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when the manifest is a 404", async () => {
    serve({}, 404);
    const { container } = renderBanner();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await settle();
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing, and makes no request, when no bucket is configured", async () => {
    vi.stubEnv("VITE_FIREBASE_STORAGE_BUCKET", "");
    serve(manifest([SQP]));
    const { container } = renderBanner();
    await settle();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when no row is important", async () => {
    serve(manifest([QUIET]));
    const { container } = renderBanner();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await settle();
    expect(container.innerHTML).toBe("");
  });
});

describe("dismissed", () => {
  it("dismiss hides it, records the id, and it stays hidden on the next mount", async () => {
    const user = userEvent.setup();
    serve(manifest([SQP]));
    const first = renderBanner();
    await user.click(await screen.findByRole("button", { name: /Dismiss/ }));
    expect(first.container.innerHTML).toBe("");
    expect(JSON.parse(window.localStorage.getItem(CBSE_BANNER_DISMISSED_KEY) ?? "[]")).toEqual(["sqp-2627"]);
    cleanup();

    // A reload: same manifest, stored dismissal.
    serve(manifest([SQP]));
    const second = renderBanner();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await settle();
    expect(second.container.innerHTML).toBe("");
  });

  it("dismissing the newest never surfaces an older important row", async () => {
    window.localStorage.setItem(CBSE_BANNER_DISMISSED_KEY, JSON.stringify(["datesheet-2027"]));
    serve(manifest([SQP, DATESHEET]));
    const { container } = renderBanner();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await settle();
    expect(container.innerHTML).toBe("");
  });

  it("a corrupt stored value is treated as nothing dismissed", async () => {
    window.localStorage.setItem(CBSE_BANNER_DISMISSED_KEY, "{not json");
    serve(manifest([SQP]));
    renderBanner();
    expect(await screen.findByText("New CBSE sample papers are out")).toBeTruthy();
  });
});

describe("newer reappears", () => {
  it("★ an old dismissal does not hide a NEWER important circular", async () => {
    window.localStorage.setItem(CBSE_BANNER_DISMISSED_KEY, JSON.stringify(["sqp-2627"]));
    serve(manifest([SQP, DATESHEET]));
    renderBanner();
    expect(await screen.findByText("The 2027 board exam date sheet is out")).toBeTruthy();
  });
});
