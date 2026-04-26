// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

import { attachSnapshotPlayer } from "../../web/src/lib/players/snapshot-player.js";

describe("attachSnapshotPlayer", () => {
  const fetchMock = vi.fn<typeof fetch>();
  const createObjectUrlMock = vi.fn<(blob: Blob) => string>();
  const revokeObjectUrlMock = vi.fn<(url: string) => void>();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    fetchMock.mockResolvedValue(
      {
        blob: async () => new Blob(["frame"], { type: "image/jpeg" }),
        ok: true,
        status: 200,
      } as Response,
    );
    createObjectUrlMock
      .mockReturnValueOnce("blob:frame-1")
      .mockReturnValueOnce("blob:frame-2");

    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("URL", {
      createObjectURL: createObjectUrlMock,
      revokeObjectURL: revokeObjectUrlMock,
    });
  });

  it("refreshes snapshots through revocable blob URLs instead of unique request URLs", async () => {
    const image = document.createElement("img");

    const attachment = attachSnapshotPlayer(image, "/api/live-view/snapshot/main", 1000);

    await Promise.resolve();
    image.dispatchEvent(new Event("load"));

    await attachment.ready;

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/live-view/snapshot/main",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
    expect(image.src).toContain("blob:frame-1");
    expect(revokeObjectUrlMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1000);
    await Promise.resolve();
    image.dispatchEvent(new Event("load"));

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/live-view/snapshot/main",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
    expect(image.src).toContain("blob:frame-2");
    expect(revokeObjectUrlMock).toHaveBeenCalledWith("blob:frame-1");

    attachment.destroy();

    expect(revokeObjectUrlMock).toHaveBeenCalledWith("blob:frame-2");
    expect(image.getAttribute("src")).toBeNull();
  });

  it("aborts in-flight refreshes during teardown", async () => {
    const abortSignals: AbortSignal[] = [];

    fetchMock.mockImplementation(
      async (_input, init) => {
        abortSignals.push((init as RequestInit).signal as AbortSignal);
        return {
          blob: async () => new Blob(["frame"], { type: "image/jpeg" }),
          ok: true,
          status: 200,
        } as Response;
      },
    );

    const image = document.createElement("img");
    const attachment = attachSnapshotPlayer(image, "/api/live-view/snapshot/main", 1000);

    await Promise.resolve();
    expect(abortSignals).toHaveLength(1);
    expect(abortSignals[0]?.aborted).toBe(false);

    attachment.destroy();

    expect(abortSignals[0]?.aborted).toBe(true);
  });
});
