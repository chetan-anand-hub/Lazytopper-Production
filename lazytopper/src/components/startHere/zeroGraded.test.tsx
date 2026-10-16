// SHW-2 - the shared zero-graded signal: NO extra cloud read beyond the one the Start-here card
// already makes. One ask per uid per tab (joined while in flight, kept once the server answered);
// a `{ cloud: false }` reader never starts one; "could not tell" is never kept (retries unchanged).

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, waitFor, act } from "@testing-library/react";

const { cloudHas, localRows } = vi.hoisted(() => ({ cloudHas: vi.fn(), localRows: vi.fn() }));
vi.mock("../../services/sessionRecords", () => ({ cloudHasAnySessionRecord: cloudHas, loadLocalSessionRecords: localRows }));
vi.mock("../../services/firebaseClient", () => ({ authClient: null }));

import {
  useZeroGraded,
  askCloudOnce,
  resetZeroGradedCacheForTests,
  typeFirstAnswerMode,
  ZERO_GRADED_NONE_TTL_MS,
  type ZeroGraded,
} from "./zeroGraded";

const seen: Record<string, ZeroGraded> = {};
function Probe({ id, uid, cloud = true, recheck }: { id: string; uid: string | null; cloud?: boolean; recheck?: number }) {
  // eslint-disable-next-line react-hooks/immutability -- test probe records the hook's value
  seen[id] = useZeroGraded(uid, { cloud, recheck });
  return null;
}

beforeEach(() => {
  resetZeroGradedCacheForTests();
  cloudHas.mockReset();
  localRows.mockReset().mockReturnValue([]);
  for (const k of Object.keys(seen)) delete seen[k];
});
afterEach(cleanup);

describe("SHW-2 · useZeroGraded - one cloud read per uid", () => {
  it("★★ two mounts at once (card + answer box) share ONE read", async () => {
    let resolve: (v: boolean) => void = () => {};
    cloudHas.mockReturnValue(new Promise<boolean>((r) => { resolve = r; }));
    render(
      <>
        <Probe id="a" uid="u1" />
        <Probe id="b" uid="u1" />
      </>,
    );
    await act(async () => { resolve(false); });
    await waitFor(() => expect(seen.b).toBe("none"));
    expect(seen.a).toBe("none");
    expect(cloudHas).toHaveBeenCalledTimes(1);
  });

  it("★★ a later mount (another page view) reuses the kept answer: no second read", async () => {
    cloudHas.mockResolvedValue(true);
    const r1 = render(<Probe id="a" uid="u1" />);
    await waitFor(() => expect(seen.a).toBe("some"));
    r1.unmount();
    render(<Probe id="b" uid="u1" />);
    await waitFor(() => expect(seen.b).toBe("some"));
    expect(cloudHas).toHaveBeenCalledTimes(1);
  });

  it("★★ { cloud: false } never starts a read: loading without a kept answer, the kept answer otherwise", async () => {
    render(<Probe id="p" uid="u2" cloud={false} />);
    await act(async () => {});
    expect(seen.p).toBe("loading");
    expect(cloudHas).not.toHaveBeenCalled();
    cleanup();
    cloudHas.mockResolvedValue(false);
    await askCloudOnce("u2"); // e.g. Home asked earlier in this tab
    render(<Probe id="q" uid="u2" cloud={false} />);
    await waitFor(() => expect(seen.q).toBe("none"));
    expect(cloudHas).toHaveBeenCalledTimes(1);
  });

  it("★ local rows answer first with no read at all", async () => {
    localRows.mockReturnValue([{ id: "x" }]);
    render(<Probe id="a" uid="u3" />);
    await waitFor(() => expect(seen.a).toBe("some"));
    expect(cloudHas).not.toHaveBeenCalled();
  });

  it("★ 'could not tell' (null) is not kept: the next ask reads again (retry behaviour unchanged)", async () => {
    cloudHas.mockResolvedValueOnce(null).mockResolvedValueOnce(false);
    expect(await askCloudOnce("u4")).toBeNull();
    expect(await askCloudOnce("u4")).toBe(false);
    expect(await askCloudOnce("u4")).toBe(false);
    expect(cloudHas).toHaveBeenCalledTimes(2);
  });

  it("★★ SHW-3: a kept 'no records' expires after 5 minutes - a later mount asks again (graded elsewhere -> 'some')", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      cloudHas.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
      const r1 = render(<Probe id="a" uid="u7" />);
      await waitFor(() => expect(seen.a).toBe("none"));
      r1.unmount();
      // Within the window: the kept answer is reused, no second read (owner's no-extra-read ruling).
      await vi.advanceTimersByTimeAsync(ZERO_GRADED_NONE_TTL_MS - 1000);
      const r2 = render(<Probe id="b" uid="u7" />);
      await waitFor(() => expect(seen.b).toBe("none"));
      expect(cloudHas).toHaveBeenCalledTimes(1);
      r2.unmount();
      // Past the window: a later mount re-asks and sees the record made on another device.
      await vi.advanceTimersByTimeAsync(2000);
      render(<Probe id="c" uid="u7" />);
      await waitFor(() => expect(seen.c).toBe("some"));
      expect(cloudHas).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("★ SHW-3: a kept 'has records' never expires (no re-read after the window)", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      cloudHas.mockResolvedValue(true);
      expect(await askCloudOnce("u8")).toBe(true);
      await vi.advanceTimersByTimeAsync(ZERO_GRADED_NONE_TTL_MS * 10);
      expect(await askCloudOnce("u8")).toBe(true);
      expect(cloudHas).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("★★ SHW-3: `recheck` looks again on the SAME mount, local rows first, with no cloud read", async () => {
    cloudHas.mockResolvedValue(false);
    await askCloudOnce("u9"); // the hub / Home asked earlier in this tab
    const r = render(<Probe id="p" uid="u9" cloud={false} />);
    await waitFor(() => expect(seen.p).toBe("none"));
    localRows.mockReturnValue([{ id: "graded-here" }]); // the batch just graded wrote a local row
    r.rerender(<Probe id="p" uid="u9" cloud={false} />); // a plain re-render does not look again
    expect(seen.p).toBe("none");
    r.rerender(<Probe id="p" uid="u9" cloud={false} recheck={1} />);
    await waitFor(() => expect(seen.p).toBe("some"));
    expect(cloudHas).toHaveBeenCalledTimes(1);
  });

  it("★ a different uid is its own read", async () => {
    cloudHas.mockResolvedValue(false);
    await askCloudOnce("u5");
    await askCloudOnce("u6");
    expect(cloudHas).toHaveBeenCalledTimes(2);
  });
});

describe("SHW-2 · typeFirstAnswerMode", () => {
  it("★★ Start-here written -> type; zero graded -> type; loading / graded -> undefined (today's default)", () => {
    expect(typeFirstAnswerMode("some", { startHereWritten: true })).toBe("type");
    expect(typeFirstAnswerMode("loading", { startHereWritten: true })).toBe("type");
    expect(typeFirstAnswerMode("none")).toBe("type");
    expect(typeFirstAnswerMode("loading")).toBeUndefined();
    expect(typeFirstAnswerMode("some")).toBeUndefined();
  });
});
