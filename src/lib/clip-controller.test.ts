import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildPlayerVars,
  createClipController,
  LOOP_POLL_MS,
  PLAY_MAX_WAIT_MS,
  PLAY_TIMEOUT_MS,
  READY_TIMEOUT_MS,
  UNMUTE_VERIFY_MS,
  type ClipControllerOptions,
  type ClipControllerState,
} from "./clip-controller";
import {
  hasLivePlayer,
  PlayerState,
  YOUTUBE_EMBED_HOST,
  type YT,
  type YTPlayerOptions,
} from "./youtube";

/* ------------------------------------------------------------------------ */
/* Fakes                                                                     */
/* ------------------------------------------------------------------------ */

type FakeBehaviour = {
  /** `unMute()` pauses and stays muted, as a browser blocking sound does. */
  blockUnmute?: boolean;
  /** `playVideo()` buffers forever and never reaches PLAYING. */
  stallPlay?: boolean;
  /**
   * `playVideo()` moves to this state instead of PLAYING, as a browser that
   * blocks autoplay leaves the player UNSTARTED or CUED.
   */
  blockPlayAt?: number;
};

class FakePlayer {
  static instances: FakePlayer[] = [];
  static behaviour: FakeBehaviour = {};

  readonly options: YTPlayerOptions;
  readonly calls: string[] = [];
  ready = false;
  destroyed = false;
  muted = true;
  playerState: number = PlayerState.UNSTARTED;
  time = 0;
  iframe = { attrs: {} as Record<string, string>, setAttribute(k: string, v: string) { this.attrs[k] = v; }, removeAttribute(k: string) { delete this.attrs[k]; } };

  constructor(_el: unknown, options: YTPlayerOptions) {
    this.options = options;
    FakePlayer.instances.push(this);
  }

  /** Real players only expose media methods after `onReady`. */
  private guard(name: string) {
    if (!this.ready) throw new Error(`${name} before ready`);
    if (this.destroyed) throw new Error(`${name} after destroy`);
    this.calls.push(name);
  }

  // Test drivers ----------------------------------------------------------
  fireReady() {
    this.ready = true;
    this.options.events?.onReady?.({ target: this as never });
  }
  fireState(data: number) {
    this.playerState = data;
    this.options.events?.onStateChange?.({ target: this as never, data });
  }
  fireError(data: number) {
    this.options.events?.onError?.({ target: this as never, data });
  }

  // YT.Player API ---------------------------------------------------------
  playVideo() {
    this.guard("playVideo");
    if (FakePlayer.behaviour.stallPlay) {
      this.fireState(PlayerState.BUFFERING);
      return;
    }
    if (FakePlayer.behaviour.blockPlayAt !== undefined) {
      this.fireState(FakePlayer.behaviour.blockPlayAt);
      return;
    }
    this.fireState(PlayerState.PLAYING);
  }
  pauseVideo() {
    this.guard("pauseVideo");
    this.fireState(PlayerState.PAUSED);
  }
  mute() {
    this.guard("mute");
    this.muted = true;
  }
  unMute() {
    this.guard("unMute");
    if (FakePlayer.behaviour.blockUnmute) {
      this.fireState(PlayerState.PAUSED);
      return;
    }
    this.muted = false;
  }
  isMuted() {
    this.guard("isMuted");
    return this.muted;
  }
  seekTo(seconds: number) {
    this.guard(`seekTo(${seconds})`);
    this.time = seconds;
  }
  getCurrentTime() {
    this.guard("getCurrentTime");
    return this.time;
  }
  getPlayerState() {
    this.guard("getPlayerState");
    return this.playerState;
  }
  loadVideoById(args: { videoId: string; startSeconds?: number; endSeconds?: number }) {
    this.guard(`loadVideoById(${args.videoId},${args.startSeconds},${args.endSeconds})`);
    this.time = args.startSeconds ?? 0;
  }
  getIframe() {
    return this.iframe as unknown as HTMLIFrameElement;
  }
  destroy() {
    this.calls.push("destroy");
    this.destroyed = true;
  }
}

const fakeYT = { Player: FakePlayer } as unknown as YT;

function fakeMount() {
  const children: unknown[] = [];
  return {
    children,
    ownerDocument: {
      createElement: () => ({ tag: "div" }),
      defaultView: { location: { origin: "http://localhost:3000" } },
    },
    appendChild(child: unknown) {
      children.push(child);
      return child;
    },
    get firstChild() {
      return children[0] ?? null;
    },
    removeChild(child: unknown) {
      children.splice(children.indexOf(child), 1);
      return child;
    },
  };
}

const CLIP = { youtubeId: "abc123", start: 10, end: 22 };

function setup(overrides: Partial<ClipControllerOptions> = {}) {
  let muted = true;
  const states: ClipControllerState[] = [];
  const onMuted = vi.fn((value: boolean) => {
    muted = value;
  });
  const mount = fakeMount();
  const controller = createClipController({
    YT: fakeYT,
    mount: mount as unknown as HTMLElement,
    clip: CLIP,
    getMuted: () => muted,
    onState: (s) => states.push(s),
    onMuted,
    title: "Clip: test cue",
    ...overrides,
  });
  const player = FakePlayer.instances.at(-1)!;
  return {
    controller,
    player,
    states,
    onMuted,
    mount,
    setStoreMuted: (v: boolean) => {
      muted = v;
    },
  };
}

/** Ready, then PLAYING (playVideo on ready triggers it in the fake). */
function startPlaying(player: FakePlayer) {
  player.fireReady();
  expect(player.playerState).toBe(PlayerState.PLAYING);
}

beforeEach(() => {
  vi.useFakeTimers();
  FakePlayer.instances = [];
  FakePlayer.behaviour = {};
});

afterEach(() => {
  vi.useRealTimers();
});

/* ------------------------------------------------------------------------ */
/* Tests                                                                     */
/* ------------------------------------------------------------------------ */

describe("clip controller: creation", () => {
  it("creates one nocookie player with the D-CLIP-4 parameters", () => {
    const { player, states, mount } = setup();
    expect(states).toEqual(["loading"]);
    expect(mount.children).toHaveLength(1);
    expect(player.options.host).toBe(YOUTUBE_EMBED_HOST);
    expect(player.options.videoId).toBe("abc123");
    expect(player.options.playerVars).toMatchObject({
      autoplay: 1,
      mute: 1,
      controls: 0,
      playsinline: 1,
      cc_load_policy: 1,
      rel: 0,
      start: 10,
      end: 22,
      origin: "http://localhost:3000",
    });
    expect(player.iframe.attrs).toEqual({ tabindex: "-1", title: "Clip: test cue" });
  });

  it("omits origin when there is none", () => {
    expect(buildPlayerVars(CLIP, undefined)).not.toHaveProperty("origin");
  });

  it("reaches playing muted after ready", () => {
    const { player, states } = setup();
    startPlaying(player);
    expect(states).toEqual(["loading", "playing"]);
    expect(player.calls.slice(0, 2)).toEqual(["mute", "playVideo"]);
    expect(player.muted).toBe(true);
  });

  it("setMuted before ready is a no-op (player methods do not exist yet)", () => {
    const { controller, player } = setup();
    expect(() => controller.setMuted(false)).not.toThrow();
    expect(player.calls).toEqual([]);
  });
});

describe("clip controller: loop (D-CLIP-5)", () => {
  it("seeks to start at end - 0.15, not before", () => {
    const { player, states } = setup();
    startPlaying(player);

    player.time = 21.8; // below 22 - 0.15
    vi.advanceTimersByTime(LOOP_POLL_MS);
    expect(player.calls).not.toContain("seekTo(10)");

    player.time = 21.85; // exactly end - 0.15
    vi.advanceTimersByTime(LOOP_POLL_MS);
    expect(player.calls).toContain("seekTo(10)");
    expect(player.time).toBe(10);

    // A seek buffers then plays; state stays playing throughout.
    player.fireState(PlayerState.BUFFERING);
    player.fireState(PlayerState.PLAYING);
    expect(states.at(-1)).toBe("playing");
  });

  it("seeks to start when the time is well before start", () => {
    const { player } = setup();
    startPlaying(player);
    player.time = 3;
    vi.advanceTimersByTime(LOOP_POLL_MS);
    expect(player.calls).toContain("seekTo(10)");
  });

  it("does not poll while paused", () => {
    const { player, states } = setup();
    startPlaying(player);
    player.fireState(PlayerState.PAUSED);
    expect(states.at(-1)).toBe("paused");
    player.time = 30;
    vi.advanceTimersByTime(LOOP_POLL_MS * 4);
    expect(player.calls.filter((c) => c === "getCurrentTime")).toHaveLength(0);
  });

  it("restarts the window on ENDED (backup)", () => {
    const { player, states } = setup();
    startPlaying(player);
    player.fireState(PlayerState.ENDED);
    expect(player.calls).toContain("loadVideoById(abc123,10,22)");
    expect(states).not.toContain("error");
  });
});

describe("clip controller: mute (D-CLIP-7)", () => {
  it("unmutes on first PLAYING when the visit is unmuted, and verifies", () => {
    const { player, setStoreMuted, onMuted } = setup();
    setStoreMuted(false);
    startPlaying(player);
    expect(player.calls).toContain("unMute");
    vi.advanceTimersByTime(UNMUTE_VERIFY_MS);
    expect(player.calls).toContain("isMuted");
    expect(player.muted).toBe(false);
    expect(onMuted).not.toHaveBeenCalled();
  });

  it("setMuted(false) unmutes the live player and setMuted(true) mutes it", () => {
    const { controller, player, onMuted } = setup();
    startPlaying(player);
    controller.setMuted(false);
    vi.advanceTimersByTime(UNMUTE_VERIFY_MS);
    expect(player.muted).toBe(false);
    controller.setMuted(true);
    expect(player.muted).toBe(true);
    expect(onMuted).not.toHaveBeenCalled();
  });

  it("blocked unmute falls back to muted playback and reports it", () => {
    FakePlayer.behaviour.blockUnmute = true;
    const { player, setStoreMuted, onMuted, states } = setup();
    setStoreMuted(false);
    player.fireReady();
    expect(states.at(-1)).toBe("paused"); // the browser paused it
    vi.advanceTimersByTime(UNMUTE_VERIFY_MS);
    expect(onMuted).toHaveBeenCalledWith(true);
    expect(player.muted).toBe(true);
    expect(player.playerState).toBe(PlayerState.PLAYING);
    expect(states.at(-1)).toBe("playing");
    // No second attempt loops back into unMute.
    expect(player.calls.filter((c) => c === "unMute")).toHaveLength(1);
  });

  it("buffering at verify time with sound on is not a fallback", () => {
    const { controller, player, onMuted } = setup();
    startPlaying(player);
    controller.setMuted(false);
    player.fireState(PlayerState.BUFFERING);
    vi.advanceTimersByTime(UNMUTE_VERIFY_MS);
    expect(player.muted).toBe(false);
    expect(onMuted).not.toHaveBeenCalled();
  });

  it("the automatic unmute is tried once per player", () => {
    const { controller, player, setStoreMuted } = setup();
    startPlaying(player);
    setStoreMuted(false);
    controller.setMuted(false);
    vi.advanceTimersByTime(UNMUTE_VERIFY_MS);
    player.fireState(PlayerState.PAUSED);
    player.fireState(PlayerState.PLAYING);
    expect(player.calls.filter((c) => c === "unMute")).toHaveLength(1);
  });

  it("a muted-but-playing unmute also falls back", () => {
    const { controller, player, onMuted } = setup();
    startPlaying(player);
    player.unMute = () => {
      player.calls.push("unMute");
    }; // ignored silently
    controller.setMuted(false);
    vi.advanceTimersByTime(UNMUTE_VERIFY_MS);
    expect(onMuted).toHaveBeenCalledWith(true);
  });
});

describe("clip controller: errors (D-CLIP-8)", () => {
  it.each([2, 5, 100, 101, 150, 153])("player error %i -> error and teardown", (code) => {
    const { player, states, mount } = setup();
    player.fireReady();
    player.fireError(code);
    expect(states.at(-1)).toBe("error");
    expect(player.destroyed).toBe(true);
    expect(mount.children).toHaveLength(0);
    expect(hasLivePlayer()).toBe(false);
  });

  it("ready timeout -> error after 8 s", () => {
    const { player, states } = setup();
    vi.advanceTimersByTime(READY_TIMEOUT_MS - 1);
    expect(states).toEqual(["loading"]);
    vi.advanceTimersByTime(1);
    expect(states).toEqual(["loading", "error"]);
    expect(player.destroyed).toBe(true);
  });

  it("custom ready timeout is honoured, and a late ready is ignored", () => {
    const { player, states } = setup({ readyTimeoutMs: 1000 });
    vi.advanceTimersByTime(1000);
    expect(states.at(-1)).toBe("error");
    player.fireReady();
    expect(states.at(-1)).toBe("error");
    expect(player.calls).not.toContain("playVideo");
  });

  it("ready in time clears the timeout", () => {
    const { player, states } = setup();
    startPlaying(player);
    vi.advanceTimersByTime(READY_TIMEOUT_MS * 2);
    expect(states).not.toContain("error");
  });

  it("a constructor that throws is an error", () => {
    const Throwing = function () {
      throw new Error("boom");
    };
    const states: ClipControllerState[] = [];
    createClipController({
      YT: { Player: Throwing } as unknown as YT,
      mount: fakeMount() as unknown as HTMLElement,
      clip: CLIP,
      getMuted: () => true,
      onState: (s) => states.push(s),
      onMuted: () => {},
    });
    expect(states).toEqual(["loading", "error"]);
  });
});

describe("clip controller: teardown (D-CLIP-6)", () => {
  it("destroy stops the poll and removes the player", () => {
    const { controller, player, mount, states } = setup();
    startPlaying(player);
    controller.destroy();
    expect(player.destroyed).toBe(true);
    expect(mount.children).toHaveLength(0);
    const before = player.calls.length;
    player.time = 30;
    vi.advanceTimersByTime(LOOP_POLL_MS * 10);
    expect(player.calls.length).toBe(before);
    expect(vi.getTimerCount()).toBe(0);
    expect(states).toEqual(["loading", "playing"]);
  });

  it("destroy cancels a pending unmute check and the ready timer", () => {
    const a = setup();
    a.controller.destroy();
    expect(vi.getTimerCount()).toBe(0);

    const b = setup();
    startPlaying(b.player);
    b.controller.setMuted(false);
    b.controller.destroy();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(UNMUTE_VERIFY_MS);
    expect(b.onMuted).not.toHaveBeenCalled();
  });

  it("events after destroy are ignored; destroy is idempotent", () => {
    const { controller, player, states } = setup();
    controller.destroy();
    controller.destroy();
    player.fireError(150);
    controller.setMuted(false);
    expect(states).toEqual(["loading"]);
    expect(player.calls.filter((c) => c === "destroy")).toHaveLength(1);
  });

  it("creating a second controller destroys the first (one player at a time)", () => {
    const a = setup();
    startPlaying(a.player);
    const b = setup();
    expect(a.player.destroyed).toBe(true);
    expect(b.player.destroyed).toBe(false);
    expect(hasLivePlayer()).toBe(true);
    // The evicted controller's poll is stopped too.
    a.player.time = 30;
    const before = a.player.calls.length;
    vi.advanceTimersByTime(LOOP_POLL_MS * 4);
    expect(a.player.calls.length).toBe(before);
    b.controller.destroy();
    expect(hasLivePlayer()).toBe(false);
  });

  it("an evicted controller reports idle, never a stale playing", () => {
    const a = setup();
    startPlaying(a.player);
    expect(a.states).toEqual(["loading", "playing"]);
    const b = setup();
    expect(a.states).toEqual(["loading", "playing", "idle"]);
    expect(a.mount.children).toHaveLength(0);
    expect(b.states).toEqual(["loading"]);
    // Nothing more from the evicted one: later events and destroy are no-ops.
    a.player.fireError(150);
    a.controller.destroy();
    expect(a.states).toEqual(["loading", "playing", "idle"]);
    // The new owner still holds the slot; its own destroy releases it.
    expect(hasLivePlayer()).toBe(true);
    b.controller.destroy();
    expect(hasLivePlayer()).toBe(false);
    expect(b.states).toEqual(["loading"]);
  });
});

describe("clip controller: playback-start timeout (D-CLIP-12)", () => {
  it("still BUFFERING at the deadline -> extends, then error at the cap", () => {
    FakePlayer.behaviour.stallPlay = true;
    const { player, states, mount } = setup();
    player.fireReady();
    player.fireState(PlayerState.UNSTARTED);
    player.fireState(PlayerState.BUFFERING);
    vi.advanceTimersByTime(PLAY_TIMEOUT_MS);
    // Buffering is a slow network, not a dead player: keep waiting.
    expect(states).toEqual(["loading"]);
    expect(player.destroyed).toBe(false);
    vi.advanceTimersByTime(PLAY_MAX_WAIT_MS - PLAY_TIMEOUT_MS - 1);
    expect(states).toEqual(["loading"]);
    vi.advanceTimersByTime(1);
    expect(states).toEqual(["loading", "error"]);
    expect(player.destroyed).toBe(true);
    expect(mount.children).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("buffering past the deadline, then PLAYING -> playing, no error", () => {
    FakePlayer.behaviour.stallPlay = true;
    const { player, states } = setup();
    player.fireReady();
    vi.advanceTimersByTime(20000);
    expect(states).toEqual(["loading"]);
    player.fireState(PlayerState.PLAYING);
    expect(vi.getTimerCount()).toBe(1); // only the loop poll is left
    vi.advanceTimersByTime(PLAY_MAX_WAIT_MS * 2);
    expect(states).toEqual(["loading", "playing"]);
    expect(player.destroyed).toBe(false);
  });

  it.each([
    ["CUED", PlayerState.CUED],
    ["UNSTARTED", PlayerState.UNSTARTED],
  ])(
    "autoplay blocked (%s at the deadline) -> paused with the player kept, no error",
    (_name, blockedState) => {
      FakePlayer.behaviour.blockPlayAt = blockedState;
      const { player, states, mount } = setup();
      player.fireReady();
      vi.advanceTimersByTime(PLAY_TIMEOUT_MS - 1);
      expect(states).toEqual(["loading"]);
      vi.advanceTimersByTime(1);
      expect(states).toEqual(["loading", "paused"]);
      // The player stays, so YouTube's own play button is there to tap.
      expect(player.destroyed).toBe(false);
      expect(mount.children).toHaveLength(1);
      expect(hasLivePlayer()).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
      vi.advanceTimersByTime(PLAY_MAX_WAIT_MS * 2);
      expect(states).toEqual(["loading", "paused"]);
    },
  );

  it("blocked autoplay makes the iframe tabbable; playing restores tabindex -1", () => {
    FakePlayer.behaviour.blockPlayAt = PlayerState.CUED;
    const { player } = setup();
    player.fireReady();
    expect(player.iframe.attrs.tabindex).toBe("-1");
    vi.advanceTimersByTime(PLAY_TIMEOUT_MS);
    expect(player.iframe.attrs).not.toHaveProperty("tabindex");
    expect(player.iframe.attrs.title).toBe("Clip: test cue");
    player.fireState(PlayerState.PLAYING);
    expect(player.iframe.attrs.tabindex).toBe("-1");
  });

  it("a playRecheckMs of 0 still advances (no zero-delay loop)", () => {
    FakePlayer.behaviour.blockPlayAt = PlayerState.BUFFERING;
    const { player, states } = setup({ playRecheckMs: 0 });
    player.fireReady();
    vi.advanceTimersByTime(PLAY_TIMEOUT_MS);
    vi.advanceTimersByTime(PLAY_MAX_WAIT_MS);
    expect(states.at(-1)).toBe("error");
  });

  it("a tap after a blocked autoplay resumes the normal flow", () => {
    FakePlayer.behaviour.blockPlayAt = PlayerState.CUED;
    const { player, states, setStoreMuted } = setup();
    setStoreMuted(false);
    player.fireReady();
    vi.advanceTimersByTime(PLAY_TIMEOUT_MS);
    expect(states.at(-1)).toBe("paused");
    // The user taps YouTube's play button.
    player.fireState(PlayerState.BUFFERING);
    player.fireState(PlayerState.PLAYING);
    expect(states).toEqual(["loading", "paused", "playing"]);
    // Loop poll runs and the visit's unmute preference is applied.
    expect(player.calls).toContain("unMute");
    player.time = 30;
    vi.advanceTimersByTime(LOOP_POLL_MS);
    expect(player.calls).toContain("seekTo(10)");
  });

  it("buffering that turns into CUED during the extension -> paused", () => {
    FakePlayer.behaviour.stallPlay = true;
    const { player, states } = setup();
    player.fireReady();
    vi.advanceTimersByTime(PLAY_TIMEOUT_MS + 2000);
    expect(states).toEqual(["loading"]);
    player.fireState(PlayerState.CUED);
    vi.advanceTimersByTime(1000);
    expect(states).toEqual(["loading", "paused"]);
    expect(player.destroyed).toBe(false);
  });

  it("any other state at the deadline -> error and fallback", () => {
    const { player, states, mount } = setup();
    // Ready, but the player sits in a state that is neither playing,
    // buffering nor blocked, without reporting it.
    FakePlayer.behaviour.blockPlayAt = PlayerState.UNSTARTED;
    player.fireReady();
    player.playerState = 99;
    vi.advanceTimersByTime(PLAY_TIMEOUT_MS);
    expect(states).toEqual(["loading", "error"]);
    expect(player.destroyed).toBe(true);
    expect(mount.children).toHaveLength(0);
  });

  it("an unreadable player state at the deadline -> error", () => {
    FakePlayer.behaviour.stallPlay = true;
    const { player, states } = setup();
    player.fireReady();
    player.getPlayerState = () => {
      throw new Error("gone");
    };
    vi.advanceTimersByTime(PLAY_TIMEOUT_MS);
    expect(states).toEqual(["loading", "error"]);
  });

  it("PLAYING before the deadline -> no error", () => {
    FakePlayer.behaviour.stallPlay = true;
    const { player, states } = setup();
    player.fireReady();
    vi.advanceTimersByTime(PLAY_TIMEOUT_MS - 100);
    player.fireState(PlayerState.PLAYING);
    vi.advanceTimersByTime(PLAY_TIMEOUT_MS * 2);
    expect(states).toEqual(["loading", "playing"]);
    expect(player.destroyed).toBe(false);
  });

  it("re-arms on each play request (ENDED backup that stalls)", () => {
    const { player, states } = setup();
    startPlaying(player);
    vi.advanceTimersByTime(PLAY_TIMEOUT_MS * 2);
    expect(states).toEqual(["loading", "playing"]);
    // ENDED -> loadVideoById; the fake does not report PLAYING after it.
    player.fireState(PlayerState.ENDED);
    player.fireState(PlayerState.BUFFERING);
    vi.advanceTimersByTime(PLAY_TIMEOUT_MS);
    expect(states.at(-1)).toBe("playing"); // still buffering: extended
    vi.advanceTimersByTime(PLAY_MAX_WAIT_MS - PLAY_TIMEOUT_MS);
    expect(states.at(-1)).toBe("error");
  });

  it("ENDED backup blocked (CUED) -> paused, not error", () => {
    const { player, states } = setup();
    startPlaying(player);
    player.fireState(PlayerState.ENDED);
    player.fireState(PlayerState.CUED);
    vi.advanceTimersByTime(PLAY_TIMEOUT_MS);
    expect(states).toEqual(["loading", "playing", "paused"]);
    expect(player.destroyed).toBe(false);
  });

  it("custom playTimeoutMs and playMaxWaitMs are honoured", () => {
    FakePlayer.behaviour.stallPlay = true;
    const { player, states } = setup({ playTimeoutMs: 1000, playMaxWaitMs: 3000 });
    player.fireReady();
    vi.advanceTimersByTime(1000);
    expect(states.at(-1)).toBe("loading");
    vi.advanceTimersByTime(1999);
    expect(states.at(-1)).toBe("loading");
    vi.advanceTimersByTime(1);
    expect(states.at(-1)).toBe("error");
  });

  it("a pause before PLAYING clears the deadline", () => {
    FakePlayer.behaviour.stallPlay = true;
    const { player, states } = setup();
    player.fireReady();
    player.fireState(PlayerState.PAUSED);
    vi.advanceTimersByTime(PLAY_TIMEOUT_MS * 2);
    expect(states).toEqual(["loading", "paused"]);
  });

  it("destroy clears the deadline", () => {
    FakePlayer.behaviour.stallPlay = true;
    const { controller, player, states } = setup();
    player.fireReady();
    expect(vi.getTimerCount()).toBe(1);
    controller.destroy();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(PLAY_TIMEOUT_MS * 2);
    expect(states).toEqual(["loading"]);
  });
});

describe("IFrame API preload at idle (D-CLIP-2)", () => {
  type Idle = { cb: () => void; opts?: { timeout?: number } };

  /** A fresh `youtube` module against a fake window and document. */
  async function freshModule(withIdle: boolean) {
    vi.resetModules();
    const scripts: { src?: string; onerror?: () => void; remove(): void }[] = [];
    const idle: Idle[] = [];
    const win: Record<string, unknown> = {};
    if (withIdle) {
      win.requestIdleCallback = (cb: () => void, opts?: { timeout?: number }) =>
        idle.push({ cb, opts });
      win.cancelIdleCallback = (handle: number) => {
        idle[handle - 1].cb = () => {};
      };
    }
    vi.stubGlobal("window", win);
    vi.stubGlobal("document", {
      createElement: () => ({ remove() {} }),
      head: { appendChild: (s: (typeof scripts)[number]) => scripts.push(s) },
    });
    const mod = await import("./youtube");
    return { mod, scripts, idle };
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests the script once, at idle, and never again", async () => {
    const { mod, scripts, idle } = await freshModule(true);
    const cancel = mod.preloadYouTubeApi();
    expect(scripts).toHaveLength(0); // nothing before idle
    expect(idle).toHaveLength(1);
    expect(idle[0].opts?.timeout).toBe(mod.PRELOAD_IDLE_TIMEOUT_MS);
    idle[0].cb();
    expect(scripts).toHaveLength(1);
    expect(scripts[0].src).toBe(mod.YOUTUBE_API_SRC);
    cancel(); // too late to cancel; harmless
    // A remount does not schedule a second preload.
    mod.preloadYouTubeApi();
    expect(idle).toHaveLength(1);
    // An activation shares the pending request.
    void mod.loadYouTubeApi().catch(() => {});
    expect(scripts).toHaveLength(1);
    // A failed preload is swallowed (no unhandled rejection).
    scripts[0].onerror?.();
    await Promise.resolve();
  });

  it("a cancelled preload (effect cleanup) can be scheduled again", async () => {
    const { mod, scripts, idle } = await freshModule(true);
    mod.preloadYouTubeApi()();
    idle[0].cb();
    expect(scripts).toHaveLength(0);
    mod.preloadYouTubeApi();
    idle[1].cb();
    expect(scripts).toHaveLength(1);
  });

  it("falls back to a timeout without requestIdleCallback", async () => {
    const { mod, scripts } = await freshModule(false);
    mod.preloadYouTubeApi();
    vi.advanceTimersByTime(mod.PRELOAD_FALLBACK_MS - 1);
    expect(scripts).toHaveLength(0);
    vi.advanceTimersByTime(1);
    expect(scripts).toHaveLength(1);
  });
});
