/*
 * Stub of the YouTube IFrame Player API for e2e tests and gate screenshots
 * (D-TEST-2). Served in place of the real script:
 *
 *   await page.route("**\/iframe_api", (r) => r.fulfill({
 *     path: require.resolve("./yt-stub.js"), contentType: "text/javascript" }));
 *
 * The iframe the stub inserts has the same `src` shape as the real embed
 * (`<host>/embed/<id>?autoplay=1&mute=1&...`), so it can be asserted on
 * (CL-2). Its visible content comes from `srcdoc` (a labelled grey frame),
 * so no request is made to YouTube. To be safe anyway, also fulfil
 * `**\/embed/**` with a blank page in the test.
 *
 * Configuration: set `window.__ytStubConfig` before the API loads (an init
 * script) or at any time before a player is created. Read per player.
 *   readyDelayMs  delay before onReady (default 30)
 *   neverReady    never fire onReady (CL-17)
 *   blockUnmute   unMute() pauses and stays muted, like a browser that
 *                 blocks sound without a gesture (CL-13)
 *   errorIds      ids that fire onError after ready (default ["BROKEN_CLIP"])
 *   errorCode     code for those errors (default 150)
 *   rate          seconds of video per second of wall time (default 1)
 * Script load failure (CL-16) is done by the test: route abort.
 *
 * Inspection, `window.__yt`:
 *   players   [{ index, videoId, options, src, state, time, muted,
 *               destroyed, ready }] in creation order (live views)
 *   calls     [{ player: index, name, args }] for every API call
 *   live()    number of players not destroyed
 *   advance(seconds)  move every live player's clock forward. A jump never
 *                     fires ENDED by itself; the page's loop poll should seek.
 *   end(index)        force ENDED on a player (tests the ENDED backup)
 *   setState(index, state)  force a state change (e.g. 2 = PAUSED)
 */
(function () {
  "use strict";

  var STATE = {
    UNSTARTED: -1,
    ENDED: 0,
    PLAYING: 1,
    PAUSED: 2,
    BUFFERING: 3,
    CUED: 5,
  };
  var TICK_MS = 100;

  function config() {
    var c = window.__ytStubConfig || {};
    return {
      readyDelayMs: typeof c.readyDelayMs === "number" ? c.readyDelayMs : 30,
      neverReady: !!c.neverReady,
      blockUnmute: !!c.blockUnmute,
      errorIds: Array.isArray(c.errorIds) ? c.errorIds : ["BROKEN_CLIP"],
      errorCode: typeof c.errorCode === "number" ? c.errorCode : 150,
      rate: typeof c.rate === "number" ? c.rate : 1,
    };
  }

  var registry = (window.__yt = window.__yt || {
    players: [],
    calls: [],
  });
  var instances = [];

  registry.live = function () {
    return registry.players.filter(function (p) {
      return !p.destroyed;
    }).length;
  };
  registry.advance = function (seconds) {
    instances.forEach(function (inst) {
      if (!inst.record.destroyed) inst.record.time += seconds;
    });
  };
  registry.end = function (index) {
    var inst = instances[index];
    if (inst && !inst.record.destroyed) inst._setState(STATE.ENDED);
  };
  registry.setState = function (index, state) {
    var inst = instances[index];
    if (inst && !inst.record.destroyed) inst._setState(state);
  };

  function embedSrc(host, videoId, vars) {
    var base = (host || "https://www.youtube.com").replace(/\/$/, "");
    var params = [];
    Object.keys(vars).forEach(function (k) {
      if (vars[k] !== undefined && vars[k] !== null) {
        params.push(
          encodeURIComponent(k) + "=" + encodeURIComponent(String(vars[k])),
        );
      }
    });
    params.push("enablejsapi=1");
    params.push("widgetid=" + (registry.players.length + 1));
    return base + "/embed/" + encodeURIComponent(videoId) + "?" + params.join("&");
  }

  function frameDoc(record) {
    return (
      "<!doctype html><html><body style=\"margin:0;height:100vh;display:flex;" +
      "align-items:center;justify-content:center;background:#262626;color:#d4d4d4;" +
      "font:14px system-ui,sans-serif;text-align:center\"><div>Stub clip<br>" +
      record.videoId.replace(/[<>&"]/g, "") +
      "</div></body></html>"
    );
  }

  function Player(target, options) {
    var cfg = config();
    options = options || {};
    var vars = options.playerVars || {};
    var el =
      typeof target === "string" ? document.getElementById(target) : target;
    var index = registry.players.length;
    var src = embedSrc(options.host, options.videoId, vars);

    var record = {
      index: index,
      videoId: options.videoId,
      options: JSON.parse(JSON.stringify(options, function (k, v) {
        return typeof v === "function" ? undefined : v;
      })),
      src: src,
      state: STATE.UNSTARTED,
      time: Number(vars.start) || 0,
      muted: Number(vars.mute) === 1,
      destroyed: false,
      ready: false,
    };
    registry.players.push(record);
    instances.push(this);

    this.record = record;
    this._events = options.events || {};
    this._cfg = cfg;
    this._start = Number(vars.start) || 0;
    this._end = vars.end !== undefined ? Number(vars.end) : Infinity;
    this._autoplay = Number(vars.autoplay) === 1;

    // Replace the target element with an iframe, as the real API does.
    var iframe = document.createElement("iframe");
    iframe.id = (el && el.id) || "yt-stub-" + index;
    iframe.setAttribute("src", src);
    iframe.setAttribute("srcdoc", frameDoc(record));
    iframe.setAttribute("frameborder", "0");
    iframe.setAttribute(
      "allow",
      "autoplay; encrypted-media; picture-in-picture",
    );
    if (options.width !== undefined) iframe.setAttribute("width", options.width);
    if (options.height !== undefined) iframe.setAttribute("height", options.height);
    iframe.setAttribute("data-yt-stub", String(index));
    if (el && el.parentNode) el.parentNode.replaceChild(iframe, el);
    this._iframe = iframe;

    this._tick = setInterval(this._advanceClock.bind(this), TICK_MS);
    this._last = Date.now();

    if (!cfg.neverReady) {
      this._readyTimer = setTimeout(this._ready.bind(this), cfg.readyDelayMs);
    }
  }

  Player.prototype._log = function (name, args) {
    registry.calls.push({
      player: this.record.index,
      name: name,
      args: Array.prototype.slice.call(args || []),
    });
  };

  Player.prototype._emit = function (name, data) {
    var fn = this._events[name];
    if (typeof fn === "function") fn({ target: this, data: data });
  };

  Player.prototype._setState = function (state) {
    if (this.record.destroyed || this.record.state === state) return;
    this.record.state = state;
    this._emit("onStateChange", state);
  };

  Player.prototype._ready = function () {
    if (this.record.destroyed) return;
    this.record.ready = true;
    this._emit("onReady");
    if (this.record.destroyed) return;
    if (this._cfg.errorIds.indexOf(this.record.videoId) !== -1) {
      this._emit("onError", this._cfg.errorCode);
      return;
    }
    if (this._autoplay && this.record.state === STATE.UNSTARTED) {
      this._setState(STATE.BUFFERING);
      this._setState(STATE.PLAYING);
    }
  };

  Player.prototype._advanceClock = function () {
    var now = Date.now();
    var dt = (now - this._last) / 1000;
    this._last = now;
    if (this.record.destroyed || this.record.state !== STATE.PLAYING) return;
    var before = this.record.time;
    this.record.time += dt * this._cfg.rate;
    // Natural playback past `end` stops, as the real `end` param does.
    if (before < this._end && this.record.time >= this._end) {
      this.record.time = this._end;
      this._setState(STATE.ENDED);
    }
  };

  // ---- YT.Player API -----------------------------------------------------
  Player.prototype.playVideo = function () {
    this._log("playVideo", arguments);
    if (!this.record.ready) return;
    this._setState(STATE.PLAYING);
  };
  Player.prototype.pauseVideo = function () {
    this._log("pauseVideo", arguments);
    this._setState(STATE.PAUSED);
  };
  Player.prototype.stopVideo = function () {
    this._log("stopVideo", arguments);
    this._setState(STATE.CUED);
  };
  Player.prototype.mute = function () {
    this._log("mute", arguments);
    this.record.muted = true;
  };
  Player.prototype.unMute = function () {
    this._log("unMute", arguments);
    if (this._cfg.blockUnmute) {
      this.record.muted = true;
      this._setState(STATE.PAUSED);
      return;
    }
    this.record.muted = false;
  };
  Player.prototype.isMuted = function () {
    return this.record.muted;
  };
  Player.prototype.seekTo = function (seconds) {
    this._log("seekTo", arguments);
    this.record.time = Number(seconds) || 0;
    if (this.record.state === STATE.PLAYING) {
      this._setState(STATE.BUFFERING);
      this._setState(STATE.PLAYING);
    }
  };
  Player.prototype.getCurrentTime = function () {
    return this.record.time;
  };
  Player.prototype.getDuration = function () {
    return isFinite(this._end) ? this._end : 0;
  };
  Player.prototype.getPlayerState = function () {
    return this.record.state;
  };
  Player.prototype.loadVideoById = function (arg) {
    this._log("loadVideoById", arguments);
    var a = typeof arg === "object" && arg ? arg : { videoId: arg };
    this.record.videoId = a.videoId || this.record.videoId;
    this._start = Number(a.startSeconds) || 0;
    if (a.endSeconds !== undefined) this._end = Number(a.endSeconds);
    this.record.time = this._start;
    this._setState(STATE.BUFFERING);
    this._setState(STATE.PLAYING);
  };
  Player.prototype.getIframe = function () {
    return this._iframe;
  };
  Player.prototype.getVideoData = function () {
    return { video_id: this.record.videoId };
  };
  Player.prototype.addEventListener = function (name, fn) {
    this._events[name] = fn;
  };
  Player.prototype.destroy = function () {
    this._log("destroy", arguments);
    if (this.record.destroyed) return;
    this.record.destroyed = true;
    clearInterval(this._tick);
    clearTimeout(this._readyTimer);
    if (this._iframe && this._iframe.parentNode) {
      this._iframe.parentNode.removeChild(this._iframe);
    }
  };

  window.YT = {
    Player: Player,
    PlayerState: STATE,
    loaded: 1,
    ready: function (fn) {
      fn();
    },
  };

  if (typeof window.onYouTubeIframeAPIReady === "function") {
    setTimeout(function () {
      window.onYouTubeIframeAPIReady();
    }, 0);
  }
})();
