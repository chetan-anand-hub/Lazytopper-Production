// SHW-2 - the shared zero-graded signal: NO extra cloud read beyond the one the Start-here card
// already makes. One ask per uid per tab (joined while in flight, kept once the server answered);
// a `{ cloud: false }` reader never starts one; "could not tell" is never kept (retries unchanged).

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, waitFor, act } from "@testing-library/react";

const { cloudHas, localRows } = vi.hoisted(() => ({ cloudHas: vi.fn(), localRows: vi.fn() }));
vi.mock("../../services/sessionRecords", () => ({ cloudHasAnySessionRecord: cloudHas, loadLocalSessionRecords: localRows }));
vi.mock("../../services/firebaseClient", () => ({ authClient: null }));

import { useZeroGraded, askCloudOnce, resetZeroGradedCacheForTests, typeFirstAnswerMode, type ZeroGraded } from "./zeroGraded";

const seen: Record<string, ZeroGraded> = {};
function Probe({ id, uid, cloud = true }: { id: string; uid: string | null; cloud?: boolean }) {
  // eslint-disable-next-line react-hooks/globals -- test probe records the hook's value
  seen[id] = useZeroGraded(uid, { cloud });
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
