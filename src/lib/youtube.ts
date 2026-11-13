/**
 * YouTube IFrame Player API: loader, minimal types and the single-player guard
 * (D-CLIP-2, D-CLIP-6). No `@types/youtube`; only what the clip engine uses.
 *
 * Imports are relative and nothing here touches `window` at import time, so
 * the module is safe in prerender and in vitest (node environment).
 */

/** `YT.PlayerState` values used by the clip engine. */
export const PlayerState = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const;

export type YTPlayerVars = Record<string, string | number | undefined>;

export type YTPlayerEvent = { target: YTPlayer; data?: number };

export type YTPlayerOptions = {
  host?: string;
  videoId: string;
  width?: number | string;
  height?: number | string;
  playerVars?: YTPlayerVars;
  events?: {
    onReady?: (event: YTPlayerEvent) => void;
    onStateChange?: (event: YTPlayerEvent & { data: number }) => void;
    onError?: (event: YTPlayerEvent & { data: number }) => void;
  };
};

/** The subset of `YT.Player` methods the clip engine calls. */
export type YTPlayer = {
  playVideo(): void;
  pauseVideo(): void;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getPlayerState(): number;
  loadVideoById(args: {
    videoId: string;
    startSeconds?: number;
    endSeconds?: number;
  }): void;
  getIframe(): HTMLIFrameElement;
  destroy(): void;
};

/** The `window.YT` namespace, as far as the clip engine needs it. */
export type YT = {
  Player: new (element: HTMLElement | string, options: YTPlayerOptions) => YTPlayer;
  PlayerState?: Partial<typeof PlayerState>;
};

export const YOUTUBE_API_SRC = "https://www.youtube.com/iframe_api";
export const YOUTUBE_EMBED_HOST = "https://www.youtube-nocookie.com";
export const DEFAULT_API_TIMEOUT_MS = 8000;

type YTWindow = Window & {
  YT?: YT;
  onYouTubeIframeAPIReady?: () => void;
};

let apiPromise: Promise<YT> | null = null;

/**
 * Loads the IFrame API script once and resolves with `window.YT`.
 * Rejects on script error or after `timeoutMs`; a failed load is forgotten so
 * a later call (the next activation) tries again.
 */
export function loadYouTubeApi(
  timeoutMs: number = DEFAULT_API_TIMEOUT_MS,
): Promise<YT> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("YouTube API needs a browser"));
  }
  const win = window as YTWindow;
  if (win.YT?.Player) return Promise.resolve(win.YT);
  if (apiPromise) return apiPromise;

  const promise = new Promise<YT>((resolve, reject) => {
    let settled = false;
    const script = document.createElement("script");

    const fail = (reason: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      script.remove();
      if (apiPromise === promise) apiPromise = null;
      reject(new Error(reason));
    };

    const previous = win.onYouTubeIframeAPIReady;
    win.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (settled) return;
      if (!win.YT?.Player) {
        fail("YouTube API loaded without YT.Player");
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve(win.YT);
    };

    const timer = setTimeout(
      () => fail("YouTube API load timed out"),
      timeoutMs,
    );
    script.src = YOUTUBE_API_SRC;
    script.async = true;
    script.onerror = () => fail("YouTube API script failed to load");
    document.head.appendChild(script);
  });

  apiPromise = promise;
  return promise;
}

/** Longest wait for an idle period before the preload runs anyway. */
export const PRELOAD_IDLE_TIMEOUT_MS = 4000;
/** Delay used where `requestIdleCallback` does not exist (Safari). */
export const PRELOAD_FALLBACK_MS = 1500;

let preloadStarted = false;

/**
 * Requests the IFrame API script at idle, so the first flip is fast
 * (D-CLIP-2). Runs at most once per page load, through `loadYouTubeApi`, so
 * it shares the one script request with any later activation. A failed
 * preload is swallowed here; the next activation retries and reports it.
 * Returns a cancel function for an effect cleanup (it only cancels a
 * preload that has not started yet).
 */
export function preloadYouTubeApi(): () => void {
  if (typeof window === "undefined" || preloadStarted) return () => {};
  const run = () => {
    if (preloadStarted) return;
    preloadStarted = true;
    loadYouTubeApi().catch(() => {});
  };
  if (typeof window.requestIdleCallback === "function") {
    const handle = window.requestIdleCallback(run, {
      timeout: PRELOAD_IDLE_TIMEOUT_MS,
    });
    return () => window.cancelIdleCallback(handle);
  }
  const timer = setTimeout(run, PRELOAD_FALLBACK_MS);
  return () => clearTimeout(timer);
}

/* ------------------------------------------------------------------------ */
/* Single-player guard (D-CLIP-6)                                            */
/* ------------------------------------------------------------------------ */

/** Teardown of whoever owns the live player (a clip controller). */
type Owner = () => void;

let currentOwner: Owner | null = null;

/**
 * Registers a new player owner. The previous owner is torn down first, so at
 * most one player is ever live, even if a caller elsewhere leaks one.
 */
export function claimPlayerSlot(owner: Owner): void {
  const previous = currentOwner;
  currentOwner = owner;
  if (previous && previous !== owner) previous();
}

/** Releases the slot if `owner` still holds it. */
export function releasePlayerSlot(owner: Owner): void {
  if (currentOwner === owner) currentOwner = null;
}

/** True while some controller holds the slot. For tests and diagnostics. */
export function hasLivePlayer(): boolean {
  return currentOwner !== null;
}
