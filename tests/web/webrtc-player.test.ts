import { describe, expect, it, vi, beforeEach } from "vitest";

const readerState = vi.hoisted(() => ({
  configs: [] as Array<{
    onError?: (reason: string) => void;
    onTrack?: (event: RTCTrackEvent) => void;
    url: string;
  }>,
  close: vi.fn(),
}));

vi.mock("../../web/src/lib/players/mediamtx-webrtc-reader.js", () => ({
  MediaMTXWebRTCReader: class MockMediaMTXWebRTCReader {
    constructor(config: {
      onError?: (reason: string) => void;
      onTrack?: (event: RTCTrackEvent) => void;
      url: string;
    }) {
      readerState.configs.push(config);
    }

    close() {
      readerState.close();
    }
  },
}));

import { attachWebRtcPlayer } from "../../web/src/lib/players/webrtc-player.js";

describe("attachWebRtcPlayer", () => {
  beforeEach(() => {
    readerState.configs.length = 0;
    readerState.close.mockReset();
  });

  it("keeps the current mute state and accumulates separate video/audio tracks", async () => {
    class FakeMediaStream {
      private readonly tracks: Array<{ id: string }> = [];

      constructor(initialTracks: Array<{ id: string }> = []) {
        for (const track of initialTracks) {
          this.addTrack(track);
        }
      }

      addTrack(track: { id: string }) {
        this.tracks.push(track);
      }

      getTracks() {
        return [...this.tracks];
      }
    }

    vi.stubGlobal("MediaStream", FakeMediaStream);

    const playMock = vi.fn().mockResolvedValue(undefined);
    const pauseMock = vi.fn();
    const loadMock = vi.fn();
    const removeAttributeMock = vi.fn();

    const video = {
      autoplay: false,
      load: loadMock,
      muted: false,
      pause: pauseMock,
      play: playMock,
      playsInline: false,
      removeAttribute: removeAttributeMock,
      srcObject: null,
    } as unknown as HTMLVideoElement;

    const attachment = attachWebRtcPlayer(video, "/stream/whep/main");
    const config = readerState.configs[0];
    expect(config?.url).toBe("/stream/whep/main");

    const videoTrack = { id: "video-track" };

    config?.onTrack?.({
      streams: [],
      track: videoTrack,
    } as unknown as RTCTrackEvent);

    await attachment.ready;

    expect(video.muted).toBe(false);
    expect(playMock).toHaveBeenCalled();
    expect(video.srcObject).toBeInstanceOf(FakeMediaStream);
    expect(((video.srcObject as unknown) as FakeMediaStream).getTracks()).toHaveLength(1);

    const audioTrack = { id: "audio-track" };

    config?.onTrack?.({
      streams: [],
      track: audioTrack,
    } as unknown as RTCTrackEvent);

    expect(video.srcObject).toBeInstanceOf(FakeMediaStream);
    expect(((video.srcObject as unknown) as FakeMediaStream).getTracks()).toHaveLength(2);

    attachment.destroy();

    expect(readerState.close).toHaveBeenCalledOnce();
    expect(pauseMock).toHaveBeenCalledOnce();
    expect(loadMock).toHaveBeenCalledOnce();
    expect(removeAttributeMock).toHaveBeenCalledWith("src");
    expect(video.srcObject).toBeNull();

    vi.unstubAllGlobals();
  });
});
