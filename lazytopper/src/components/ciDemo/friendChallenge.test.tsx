/**
 * FRIEND-CHALLENGE-1 - the link, the privacy boundary, the image, the channels, the events, and the
 * ladder's arrival from a challenge link (valid id opens THAT question; unknown / odd id -> the normal ladder).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { setMatchMediaMatches } from "../../test/setup";

const H = vi.hoisted(() => ({ track: vi.fn(), one: vi.fn(), friend: vi.fn(), toBlob: vi.fn(async () => new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" })) }));
vi.mock("../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../analytics/analytics")>();
  return {
    ...actual,
    trackNamedEvent: (...a: unknown[]) => H.track(...a),
    trackOneMinute: (...a: unknown[]) => H.one(...a),
    trackFriendChallenge: (...a: unknown[]) => H.friend(...a),
  };
});
vi.mock("html-to-image", () => ({ toBlob: H.toBlob }));

import CiDemoChunk from "./ciDemoChunk";
import ChallengeFriendButton from "./ChallengeFriendButton";
import ChallengeCard from "./ChallengeCard";
import { resolveChallengeQuestion } from "./challengeBank";
import {
  CHALLENGE_COPY,
  buildChallengeCardModel,
  challengeLink,
  challengeText,
  parseChallengeId,
  type ChallengeQuestion,
} from "./challengeModel";
import { makeChallengeImage, runChallengeChannel } from "./runChallengeShare";
import { ONE_MINUTE_STARTERS } from "./oneMinuteStarters";
import { __resetMascotBudgetForTests } from "../guide/mascotBudget";
import { __resetMascotsForTests } from "../guide/mascotsMute";

// jsdom has no object URLs; downloadBlob revokes one on a timer, so these stay stubbed for the whole file.
URL.createObjectURL = vi.fn(() => "blob:lt");
URL.revokeObjectURL = vi.fn();

const Q: ChallengeQuestion = {
  id: "PYQ-S-2024-ACID-003",
  subject: "Science",
  topicKey: "acids-bases-and-salts",
  chapter: "Acids, Bases and Salts",
  question: "Which of these is a strong acid?",
  options: ["Acetic acid", "Hydrochloric acid", "Citric acid", "Carbonic acid"],
  right: 1,
  why: "HCl ionises fully in water.",
};

describe("the link", () => {
  it("is the ladder landing with the question id and the campaign tags only", () => {
    expect(challengeLink(Q.id)).toBe(
      "https://www.lazytopper.com/check-improve?challenge=PYQ-S-2024-ACID-003&utm_source=share&utm_medium=whatsapp&utm_campaign=friend_challenge",
    );
  });
  it("carries no uid, email, name or score - only challenge + utm params", () => {
    const url = new URL(challengeLink(Q.id)!);
    expect([...url.searchParams.keys()].sort()).toEqual(["challenge", "utm_campaign", "utm_medium", "utm_source"]);
    expect(url.href).not.toMatch(/uid|email|@|score|name|marks/i);
  });
  it("is null for an id that is not a bank-id shape", () => {
    expect(challengeLink("")).toBeNull();
    expect(challengeLink("a b")).toBeNull();
    expect(challengeLink("<script>")).toBeNull();
    expect(challengeLink("../../x")).toBeNull();
  });
  it("parseChallengeId reads only a well-shaped id", () => {
    expect(parseChallengeId("?challenge=PYQ-M-QE-002&utm_source=share")).toBe("PYQ-M-QE-002");
    expect(parseChallengeId("?challenge=")).toBeNull();
    expect(parseChallengeId("?challenge=%3Cb%3E")).toBeNull();
    expect(parseChallengeId("")).toBeNull();
    expect(parseChallengeId(null)).toBeNull();
  });
});

describe("the image model (privacy)", () => {
  it("has NO first name by default: 'A friend got this <Chapter> question right.'", () => {
    const m = buildChallengeCardModel(Q, null)!;
    expect(m.firstName).toBeNull();
    expect(m.lead).toBe("A friend got this Acids, Bases and Salts question right.");
    expect(challengeText(null, Q.chapter, m.link)).toBe(`A friend got this Acids, Bases and Salts question right. Can you beat them? ${m.link}`);
  });
  it("uses the first name only when it is given", () => {
    const m = buildChallengeCardModel(Q, "Riya")!;
    expect(m.lead).toBe("Riya got this Acids, Bases and Salts question right.");
  });
  it("does not carry the stored answer, the solution or any id beyond the link", () => {
    const m = buildChallengeCardModel(Q, null)!;
    const json = JSON.stringify(m);
    expect(json).not.toContain(Q.why);
    expect(Object.keys(m).sort()).toEqual(["chapter", "firstName", "headline", "kicker", "lead", "link", "options", "question"]);
  });
  it("is null for a question without four options", () => {
    expect(buildChallengeCardModel({ ...Q, options: ["a", "b"] }, null)).toBeNull();
  });
});

describe("the image (ChallengeCard)", () => {
  it("shows the stem and the four options exactly, and NO answer marker", () => {
    const { container } = render(<ChallengeCard model={buildChallengeCardModel(Q, null)!} />);
    expect(screen.getByTestId("challenge-question")).toHaveTextContent(Q.question);
    const opts = screen.getAllByTestId("challenge-option").map((n) => n.textContent);
    expect(opts).toEqual(["A · Acetic acid", "B · Hydrochloric acid", "C · Citric acid", "D · Carbonic acid"]);
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/correct|right answer|answer:|✓|✔|1\/1/i);
    expect(text).not.toContain(Q.why);
    expect(container.querySelector("[class*='--right'],[class*='--correct']")).toBeNull();
    expect(screen.getByTestId("challenge-lead")).toHaveTextContent("A friend got this Acids, Bases and Salts question right.");
    expect(container.textContent).toContain(CHALLENGE_COPY.beat);
  });
});

describe("channels and the friend_challenge_share event", () => {
  let click: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    H.friend.mockReset();
    click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });
  afterEach(() => {
    click.mockRestore();
  });
  const image = async () => makeChallengeImage(buildChallengeCardModel(Q, null)!);

  it("draws a 1080 x 1920 PNG named for the challenge", async () => {
    const img = await image();
    expect(H.toBlob).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ width: 1080, height: 1920 }));
    expect(img.file.name).toBe("lazytopper-challenge.png");
    expect(img.text).toContain(challengeLink(Q.id)!);
  });
  it("native: the OS sheet with the PNG + text, event channel native", async () => {
    const img = await image();
    const share = vi.fn(async () => undefined);
    const out = await runChallengeChannel("native", { image: img, nav: { canShare: () => true, share } });
    expect(out).toBe("shared");
    expect(share).toHaveBeenCalledWith({ files: [img.file], text: img.text });
    expect(H.friend).toHaveBeenCalledWith("friend_challenge_share", { channel: "native" });
  });
  it("a cancelled sheet is not a share", async () => {
    const img = await image();
    const share = vi.fn(async () => {
      throw Object.assign(new Error("x"), { name: "AbortError" });
    });
    expect(await runChallengeChannel("native", { image: img, nav: { canShare: () => true, share } })).toBe("cancelled");
    expect(H.friend).not.toHaveBeenCalled();
  });
  it("whatsapp with no file sharing: wa.me with the text + link, PNG saved, channel whatsapp", async () => {
    const img = await image();
    const open = vi.fn(() => ({ opener: null }));
    expect(await runChallengeChannel("whatsapp", { image: img, nav: {}, open })).toBe("opened");
    expect((open.mock.calls[0] as unknown as [string])[0]).toContain("https://wa.me/?text=");
    expect(decodeURIComponent((open.mock.calls[0] as unknown as [string])[0])).toContain(challengeLink(Q.id)!);
    expect(click).toHaveBeenCalled();
    expect(H.friend).toHaveBeenCalledWith("friend_challenge_share", { channel: "whatsapp" });
  });
  it("a blocked wa.me window is logged honestly as a download", async () => {
    const img = await image();
    expect(await runChallengeChannel("whatsapp", { image: img, nav: {}, open: () => null })).toBe("downloaded");
    expect(H.friend).toHaveBeenCalledWith("friend_challenge_share", { channel: "download" });
  });
  it("copy puts ONLY the link on the clipboard", async () => {
    const img = await image();
    const write = vi.fn(async () => undefined);
    expect(await runChallengeChannel("copy", { image: img, writeClipboard: write })).toBe("copied");
    expect(write).toHaveBeenCalledWith(challengeLink(Q.id));
    expect(H.friend).toHaveBeenCalledWith("friend_challenge_share", { channel: "copy" });
  });
  it("download saves the PNG", async () => {
    const img = await image();
    expect(await runChallengeChannel("download", { image: img })).toBe("downloaded");
    expect(click).toHaveBeenCalled();
    expect(H.friend).toHaveBeenCalledWith("friend_challenge_share", { channel: "download" });
  });
});

describe("resolveChallengeQuestion (the real bank)", () => {
  it("resolves every one-minute starter to a four-option, single-answer question", async () => {
    for (const s of ONE_MINUTE_STARTERS) {
      const q = await resolveChallengeQuestion(s.bankId);
      expect(q, s.bankId).not.toBeNull();
      expect(q!.options).toHaveLength(4);
      expect(q!.right).toBeGreaterThanOrEqual(0);
      expect(q!.chapter.length).toBeGreaterThan(0);
    }
  }, 120_000);
  it("unknown / malformed ids resolve to null, never throw", async () => {
    expect(await resolveChallengeQuestion("PYQ-M-NOPE-999")).toBeNull();
    expect(await resolveChallengeQuestion("not an id")).toBeNull();
    expect(await resolveChallengeQuestion("")).toBeNull();
  }, 120_000);
});

describe("the ladder, arriving from a challenge link", () => {
  const noop = () => {};
  const setSearch = (s: string) => window.history.replaceState({}, "", `/check-improve${s}`);
  beforeEach(() => {
    window.sessionStorage.clear();
    window.sessionStorage.setItem("lazytopper.guideIntent", JSON.stringify({ landing: "/check-improve" }));
    __resetMascotsForTests();
    __resetMascotBudgetForTests();
    H.track.mockReset();
    H.one.mockReset();
    H.friend.mockReset();
    setMatchMediaMatches(false);
  });
  afterEach(() => {
    cleanup();
    setSearch("");
    __resetMascotBudgetForTests();
    __resetMascotsForTests();
  });
  const card = () => render(<CiDemoChunk onClose={noop} onCheckOwn={noop} onJumpToOwn={noop} signedOut />);

  it("a valid id opens THAT question first, fires friend_challenge_open once, and no uid/score is needed", async () => {
    const want = await resolveChallengeQuestion("PYQ-S-2024-LIGHT-003");
    expect(want).not.toBeNull();
    setSearch("?challenge=PYQ-S-2024-LIGHT-003&utm_source=share&utm_medium=whatsapp&utm_campaign=friend_challenge");
    card();
    await screen.findByTestId("one-min-ladder");
    expect(screen.getByTestId("one-min-question")).toHaveTextContent(want!.question);
    expect(H.friend).toHaveBeenCalledTimes(1);
    expect(H.friend).toHaveBeenCalledWith("friend_challenge_open");
  }, 60_000);

  it("an unknown id falls back to the normal ladder: a question shows, no error, no open event", async () => {
    setSearch("?challenge=PYQ-M-NOPE-999");
    card();
    await screen.findByTestId("one-min-ladder");
    expect(screen.getAllByTestId(/^one-min-opt-/)).toHaveLength(4);
    expect(H.friend).not.toHaveBeenCalled();
  }, 60_000);

  it("an oddly shaped id is ignored entirely", async () => {
    setSearch("?challenge=%3Cscript%3E");
    card();
    expect(H.friend).not.toHaveBeenCalled();
  });

  it("the Challenge a friend button appears on a RIGHT tap only", async () => {
    const want = (await resolveChallengeQuestion("PYQ-S-2024-LIGHT-003"))!;
    setSearch("?challenge=PYQ-S-2024-LIGHT-003");
    card();
    await screen.findByTestId("one-min-ladder");
    expect(screen.queryByTestId("challenge-friend-ladder")).toBeNull();
    const wrong = (want.right + 1) % 4;
    fireEvent.click(screen.getByTestId(`one-min-opt-${wrong}`));
    await screen.findByTestId("one-min-verdict");
    expect(screen.queryByTestId("challenge-friend-ladder")).toBeNull();
  }, 60_000);

  it("on a right tap the button shows and opens the sheet with a preview", async () => {
    const want = (await resolveChallengeQuestion("PYQ-S-2024-LIGHT-003"))!;
    setSearch("?challenge=PYQ-S-2024-LIGHT-003");
    card();
    await screen.findByTestId("one-min-ladder");
    fireEvent.click(screen.getByTestId(`one-min-opt-${want.right}`));
    const btn = await screen.findByTestId("challenge-friend-ladder");
    expect(btn).toHaveTextContent("Challenge a friend");
    fireEvent.click(btn);
    await screen.findByTestId("challenge-sheet");
    await waitFor(() => expect(screen.getByTestId("challenge-preview")).toBeInTheDocument(), { timeout: 20_000 });
    // signed out: no first-name option at all, so a name can never reach the image.
    expect(screen.queryByTestId("challenge-opt-name")).toBeNull();
  }, 90_000);
});

describe("the Quick Practice entry (candidate ids)", () => {
  afterEach(() => cleanup());
  it("uses the first id that resolves to a served board MCQ", async () => {
    render(<ChallengeFriendButton placement="quick-practice" candidateIds={["PYQ-M-NOPE-999", "PYQ-S-2024-LIGHT-003"]} />);
    expect(await screen.findByTestId("challenge-friend-quick-practice", {}, { timeout: 60_000 })).toHaveTextContent("Challenge a friend");
  }, 90_000);
  it("renders nothing when no id resolves (no dead-end button)", async () => {
    const { container } = render(<ChallengeFriendButton placement="quick-practice" candidateIds={["PYQ-M-NOPE-999", "nope nope"]} />);
    await new Promise((r) => setTimeout(r, 1500));
    expect(container.querySelector("[data-testid^='challenge-friend']")).toBeNull();
  }, 60_000);
});
