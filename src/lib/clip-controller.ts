import {
  claimPlayerSlot,
  PlayerState,
  releasePlayerSlot,
  YOUTUBE_EMBED_HOST,
  type YT,
  type YTPlayer,
} from "./youtube";

/**
 * Clip controller (D-CLIP-4..8, D-STATE-4): one YouTube player for one clip,
 * as a small state machine. Takes a `YT`-shaped object so it is unit-tested
 * with a fake player and fake timers. Every timer and callback is a no-op
 * after `destroy()`.
 */

/**
 * `idle` is emitted only when the single-player guard evicts this controller
 * (another clip claimed the slot), so the box never keeps a stale `playing`.
 */
export type ClipControllerState =
  | "idle"
  | "loading"
  | "playing"
  | "paused"
  | "error";

export type ClipSpec = { youtubeId: string; start: number; end: number };

export type ClipControllerOptions = {
  YT: YT;
  /** Empty element owned by the caller; the player is built inside it. */
  mount: HTMLElement;
  clip: ClipSpec;
  /** Visit preference, read when the player first reaches PLAYING. */
  getMuted: () => boolean;
  onState: (state: ClipControllerState) => void;
  /** Called when the controller had to fall back to muted (D-CLIP-7). */
  onMuted: (muted: boolean) => void;
  /** No `onReady` within this time is an error (D-CLIP-8). Default 8000. */
  readyTimeoutMs?: number;
  /**
   * After a play request (ready, ENDED backup, unmute fallback), the player
   * state is checked this long after it (D-CLIP-12). Default 8000.
   */
  playTimeoutMs?: number;
  /**
   * While the player is still BUFFERING at that check, it is re-checked
   * every `playRecheckMs` until this long after the play request, then it is
   * an error (D-CLIP-12). Default 25000.
   */
  playMaxWaitMs?: number;
  /** Re-check period while buffering past the first check. Default 1000. */
  playRecheckMs?: number;
  /** Accessible title for the iframe, e.g. "Clip: <cue>". */
  title?: string;
};

export type ClipController = {
  setMuted(value: boolean): void;
  destroy(): void;
};

export const READY_TIMEOUT_MS = 8000;
export const PLAY_TIMEOUT_MS = 8000;
export const PLAY_MAX_WAIT_MS = 25000;
export const PLAY_RECHECK_MS = 1000;
export const LOOP_POLL_MS = 250;
/** Seek back this many seconds before `end`, so the end screen never shows. */
export const LOOP_LEAD_S = 0.15;
export const UNMUTE_VERIFY_MS = 400;

/** Player vars per D-CLIP-4. */
export function buildPlayerVars(
  clip: ClipSpec,
  origin: string | undefined,
): Record<string, string | number> {
  const vars: Record<string, string | number> = {
    autoplay: 1,
    mute: 1,
    controls: 0,
    playsinline: 1,
    cc_load_policy: 1,
    cc_lang_pref: "en",
    rel: 0,
    fs: 0,
    disablekb: 1,
    iv_load_policy: 3,
    start: Math.floor(clip.start),
    end: Math.ceil(clip.end),
  };
  if (origin) vars.origin = origin;
  return vars;
}

export function createClipController(
  options: ClipControllerOptions,
): ClipController {
  const {
    YT,
    mount,
    clip,
    getMuted,
    onState,
    onMuted,
    readyTimeoutMs = READY_TIMEOUT_MS,
    playTimeoutMs = PLAY_TIMEOUT_MS,
    playMaxWaitMs = PLAY_MAX_WAIT_MS,
    playRecheckMs = PLAY_RECHECK_MS,
    title,
  } = options;

  let destroyed = false;
  let ready = false;
  let state: ClipControllerState = "loading";
  let player: YTPlayer | null = null;
  let autoUnmuteTried = false;
  let readyTimer: ReturnType<typeof setTimeout> | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let verifyTimer: ReturnType<typeof setTimeout> | null = null;
  let playTimer: ReturnType<typeof setTimeout> | null = null;

  const setState = (next: ClipControllerState) => {
    if (destroyed || state === next) return;
    state = next;
    onState(next);
  };

  const stopPoll = () => {
    if (pollTimer !== null) clearInterval(pollTimer);
    pollTimer = null;
  };

  const cancelVerify = () => {
    if (verifyTimer !== null) clearTimeout(verifyTimer);
    verifyTimer = null;
  };

  const clearReadyTimer = () => {
    if (readyTimer !== null) clearTimeout(readyTimer);
    readyTimer = null;
  };

  const clearPlayTimer = () => {
    if (playTimer !== null) clearTimeout(playTimer);
    playTimer = null;
  };

  /** Calls a player method, swallowing errors from a half-torn-down player. */
  const call = (fn: (p: YTPlayer) => void) => {
    if (destroyed || !player) return;
    try {
      fn(player);
    } catch {
      // The real player throws if its iframe is already gone; nothing to do.
    }
  };

  const tick = () => {
    if (destroyed || !player || state !== "playing") return;
    let t: number;
    try {
      t = player.getCurrentTime();
    } catch {
      return;
    }
    if (t >= clip.end - LOOP_LEAD_S || t < clip.start - 1) {
      call((p) => p.seekTo(clip.start, true));
    }
  };

  const startPoll = () => {
    if (pollTimer !== null) return;
    pollTimer = setInterval(tick, LOOP_POLL_MS);
  };

  /**
   * Playback-start check (D-CLIP-12), `waited` ms after the play request.
   * Still BUFFERING: wait longer, up to `playMaxWaitMs`. UNSTARTED or CUED:
   * autoplay was blocked (e.g. iOS Low Power Mode), so show the player
   * paused with YouTube's own play button; a tap there reaches PLAYING and
   * the normal flow resumes. Anything else that never reached PLAYING is an
   * error.
   */
  const checkPlayStart = (waited: number) => {
    if (destroyed || !player) return;
    let current: number;
    try {
      current = player.getPlayerState();
    } catch {
      fail();
      return;
    }
    if (current === PlayerState.BUFFERING && waited < playMaxWaitMs) {
      const step = Math.min(playRecheckMs, playMaxWaitMs - waited);
      playTimer = setTimeout(() => {
        playTimer = null;
        checkPlayStart(waited + step);
      }, step);
      return;
    }
    if (current === PlayerState.UNSTARTED || current === PlayerState.CUED) {
      stopPoll();
      setState("paused");
      return;
    }
    fail();
  };

  /**
   * Requests playback and arms the start deadline (D-CLIP-12). Armed before
   * the call, because a player may report PLAYING synchronously.
   */
  const requestPlay = (fn: (p: YTPlayer) => void) => {
    if (destroyed || !player) return;
    clearPlayTimer();
    const first = Math.min(playTimeoutMs, playMaxWaitMs);
    playTimer = setTimeout(() => {
      playTimer = null;
      checkPlayStart(first);
    }, first);
    call(fn);
  };

  /** Unmute, then check it took; if not, play muted and say so (D-CLIP-7). */
  const attemptUnmute = () => {
    if (destroyed || !player || !ready) return;
    cancelVerify();
    const wasPlaying = state === "playing";
    call((p) => p.unMute());
    verifyTimer = setTimeout(() => {
      verifyTimer = null;
      if (destroyed || !player) return;
      let stillMuted = true;
      let paused = true;
      try {
        stillMuted = player.isMuted();
        // Only PAUSED counts as blocked; BUFFERING (a stall or a loop seek)
        // is normal playback (D-CLIP-7: "paused or still muted").
        paused = player.getPlayerState() === PlayerState.PAUSED;
      } catch {
        // Treat an unreadable player as blocked.
      }
      if (stillMuted || (wasPlaying && paused)) {
        onMuted(true);
        call((p) => p.mute());
        if (wasPlaying) requestPlay((p) => p.playVideo());
      }
    }, UNMUTE_VERIFY_MS);
  };

  const fail = () => {
    if (destroyed) return;
    setState("error");
    teardown();
  };

  function teardown() {
    if (destroyed) return;
    destroyed = true;
    clearReadyTimer();
    clearPlayTimer();
    stopPoll();
    cancelVerify();
    releasePlayerSlot(evict);
    const p = player;
    player = null;
    if (p) {
      try {
        p.destroy();
      } catch {
        // Already gone.
      }
    }
    // Remove whatever the API left behind (iframe or placeholder).
    while (mount.firstChild) mount.removeChild(mount.firstChild);
  }

  /**
   * Called by the single-player guard when another controller claims the
   * slot: tear down and report `idle`, so the evicted box never keeps showing
   * `playing` (D-CLIP-6). `destroy()` stays silent: its caller already knows.
   * `setState` is a no-op once destroyed, so `onState` is called directly.
   */
  function evict() {
    if (destroyed) return;
    teardown();
    state = "idle";
    onState("idle");
  }

  // One live player at a time: evict any previous owner before creating.
  claimPlayerSlot(evict);

  const host = mount.ownerDocument.createElement("div");
  mount.appendChild(host);
  const origin = mount.ownerDocument.defaultView?.location?.origin;

  onState("loading");
  readyTimer = setTimeout(() => {
    readyTimer = null;
    if (!ready) fail();
  }, readyTimeoutMs);

  try {
    player = new YT.Player(host, {
      host: YOUTUBE_EMBED_HOST,
      videoId: clip.youtubeId,
      width: "100%",
      height: "100%",
      playerVars: buildPlayerVars(clip, origin),
      events: {
        onReady: () => {
          if (destroyed) return;
          ready = true;
          clearReadyTimer();
          call((p) => p.mute());
          requestPlay((p) => p.playVideo());
        },
        onStateChange: (event) => {
          if (destroyed) return;
          switch (event.data) {
            case PlayerState.PLAYING:
              clearPlayTimer();
              setState("playing");
              startPoll();
              if (!autoUnmuteTried) {
                autoUnmuteTried = true;
                if (!getMuted()) attemptUnmute();
              }
              break;
            case PlayerState.PAUSED:
              // The player answered (a user tap or a blocked unmute); a
              // paused clip is not a stalled one.
              clearPlayTimer();
              stopPoll();
              setState("paused");
              break;
            case PlayerState.ENDED:
              // Backup for a missed poll: restart the window (D-CLIP-5).
              stopPoll();
              requestPlay((p) =>
                p.loadVideoById({
                  videoId: clip.youtubeId,
                  startSeconds: clip.start,
                  endSeconds: clip.end,
                }),
              );
              break;
            default:
              // BUFFERING, CUED, UNSTARTED: keep the current state, so a
              // seek inside the loop does not flash back to loading. A start
              // that stays here is judged by `checkPlayStart`.
              break;
          }
        },
        onError: () => fail(),
      },
    });
  } catch {
    fail();
  }

  if (player && !destroyed) {
    try {
      const iframe = player.getIframe();
      if (iframe) {
        iframe.setAttribute("tabindex", "-1");
        if (title) iframe.setAttribute("title", title);
      }
    } catch {
      // The iframe is created asynchronously by some builds; not critical.
    }
  }

  return {
    setMuted(value: boolean) {
      if (destroyed || !player || !ready) return;
      if (value) {
        cancelVerify();
        call((p) => p.mute());
      } else {
        attemptUnmute();
      }
    },
    destroy: teardown,
  };
}
