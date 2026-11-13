# Quipdeck design decisions

Owner: Planner / Layout Architect. Status: Phase 0, before Gate 1.
Sources: `docs/SPEC.md` (authoritative), `docs/research/REFERENCE_BOARD.md` (advisory), `STACK.md`, `src/content/*`.

Rule of precedence: **spec beats board**. Where the reference board suggests something the spec does not ask for, it is rejected here by name (section 9).

Each decision has an ID. Other docs cite these IDs. A decision is changed only by editing this file and telling the lead.

---

## 0. Facts found during planning (they drive the decisions)

| # | Fact | Evidence | Consequence |
|---|---|---|---|
| F1 | `cacheComponents: true` makes `Math.random()`, `Date.now()`, `crypto.randomUUID()` during prerender a build error. | `node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md` | The shuffle seed is created on the client after mount (D-FEED-2). |
| F2 | Navigation hides the previous route with React `<Activity>` (`display: none`) instead of unmounting it. State and DOM stay; effects are cleaned up on hide and re-run on show. Up to 3 routes are kept. | `.../02-guides/preserving-ui-state.md`, `.../cacheComponents.md` | Feed keeps flip state when the user visits Saved. Player teardown must live in effect cleanup. Dialog state comes from the URL. Tests must use visibility-scoped locators. |
| F3 | `eslint-plugin-react-hooks` is 7.1.1 and ships `set-state-in-effect`; `eslint-config-next` applies the recommended set. | `node_modules/eslint-plugin-react-hooks`, `node_modules/eslint-config-next/dist/index.js` | "Read after mount" uses `useSyncExternalStore`, not `useEffect` + `setState` (D-STATE-1). |
| F4 | In the sandbox, the YouTube IFrame API loads, `host: youtube-nocookie.com` works, and `onReady` fires, but **every** video (valid IDs included) ends in `onError` 150 ("Video unavailable"). | Planner probe, headless Chromium, 2026-11-13 | Real playback cannot be verified here. All clip behaviour is tested against a stubbed IFrame API (D-TEST-2). The fallback path is real and fires live. |
| F5 | Only the `playwright` library resolves (from `/opt/node-tools`). There is no `@playwright/test` and no axe. npm registry is reachable. | `require.resolve`, curl | e2e files are CommonJS run by `node --test` (D-TEST-1). axe is an explicit install in P5. |
| F6 | shadcn style is `base-nova` on Base UI, not Radix. No `asChild`. | `STACK.md`, `components.json` | Dialog and sheet use the Base UI primitives already in `src/components/ui`. |
| F7 | YouTube requires an embedded player viewport of at least 200 x 200 px and forbids overlays in front of the player. | YouTube API Services policy text, recalled, **not re-read this session**. P1-4 confirms against the current policy page and reports. | Clip box has `min-height: 200px`. No element of ours sits on top of the iframe (D-CLIP-9). Both rules are kept even if the policy has changed: they also give the simplest tap handling. |

---

## 1. Product framing

**D-PROD-1. One job per screen.** Feed: watch one exchange and see why it worked. Saved: find an exchange again. Nothing on either screen serves a different job.

**D-PROD-2. The front is a prompt, the back is the answer.** The front states the cue and the move. The back shows the real exchange that proves it. The clip belongs to the answer.

**D-PROD-3. Move labels come from data.** UI renders `getMove(card.move).label` from `src/content/moves.ts` (currently "Literal interpretation"). The spec's example wording ("Take it literally") is an example. No move name, count or colour is hardcoded in UI.

---

## 2. Feed mechanics

**D-FEED-1. CSS scroll-snap, no gesture library.**
The feed is one scroll container: `height: 100dvh; overflow-y: auto; scroll-snap-type: y mandatory; overscroll-behavior-y: contain`. Each slide is `height: 100dvh; scroll-snap-align: start; scroll-snap-stop: always`.
Why: native momentum and rubber-banding feel right on every phone, cost no JavaScript, work with a wheel, trackpad, keyboard and assistive tech, and cannot fight the browser. A gesture library would re-implement what the platform does better. `scroll-snap-stop: always` paces exposure to one card per swipe.
framer-motion is used for the flip and for micro-interactions only.
Rejected: framer-motion drag pager (custom physics, breaks wheel and keyboard), virtualised list (14 to low hundreds of cards do not need it; revisit above about 200 cards).

**D-FEED-2. Shuffle: client-only seed after mount; the static shell paints a skeleton card.**
The seed is `crypto.getRandomValues(new Uint32Array(1))[0]`, created lazily on the client the first time the visit store is read (D-STATE-2). Order is `shuffle(cards, seed)` from `src/content`.
Server render and the first hydration render both output the same skeleton card (no text), so there is no hydration mismatch and no visible reorder. The real first card replaces the skeleton on the next commit.
Rejected: server seed via `connection()` (makes `/` dynamic for no benefit); rendering unshuffled cards first and swapping (visible jump, wrong first impression).
The seed lives in memory for the visit: client navigation to Saved and back keeps the order; a reload is a new visit and a new order.

**D-FEED-3. Finite deck, quiet end.**
The deck is every card once. The last card is the last snap point. No end card, no loop, no "shuffle again", no position indicator. Looping would duplicate card ids on screen and contradict "cards stay as the user left them".
Open for the CEO at Gate 1 (see PLAN, questions).

**D-FEED-4. Active card.**
An `IntersectionObserver` rooted on the scroller with threshold 0.6 sets `activeId` in the visit store when a slide crosses 60% visibility. `activeId` is never cleared by a slide leaving (important while the route is hidden by Activity, F2).
On re-show of the feed (effects re-run), a layout effect checks the scroller offset against the active slide and, if they differ, calls `scrollIntoView({ block: "start", behavior: "instant" })`.

**D-FEED-5. Flip state persists per card for the visit.**
`flipped: Set<cardId>` lives in the visit store, not in component state. It survives scrolling, the Feed to Saved round trip, and an Activity eviction. It resets on reload. It is not written to storage (the spec scopes it to "while scrolling").

**D-FEED-6. Tap to flip, and what must not flip.**
The card root is an `<article>` with a click handler. The handler flips unless the event target is inside an interactive element: `event.target.closest("button, a, input, iframe, [data-no-flip]")`. Heart, mute and the clip frame are therefore safe by construction. Clicks inside the YouTube iframe never reach our document at all.
The card is **not** a `<button>` (it contains buttons). Assistive and keyboard access to the flip is given by real buttons:
- Front: the hint is a real `<button>` whose visible text is its accessible name ("Tap to reveal" on coarse pointers, "Click to reveal" on fine pointers, swapped with a CSS `(pointer: fine)` query so there is no hydration difference).
- Back: a "Back to cue" `<button>`, first in the back face's DOM order, visually hidden until focused.
A text selection in progress (`getSelection().toString()` non-empty) does not flip.

**D-FEED-7. Keyboard map (feed).**
One `keydown` listener on `document`, registered in an effect by the feed (so Activity removes it when the feed is hidden).

| Key | Action | Condition |
|---|---|---|
| Space, Enter | Flip the active card | Focus is not on a button, link or input (native activation wins there) |
| ArrowDown, J | Next card | |
| ArrowUp, K | Previous card | |
| S | Toggle save on the active card | Card is on its back (the heart is visible there) |
| M | Toggle mute | Card is on its back and the clip is not in error |

Ignored when: a modifier key is held, the target is an input, textarea or contenteditable, or a dialog is open. Handled keys call `preventDefault()` (Space and arrows would otherwise scroll).
Rule behind S and M: **a shortcut mirrors a visible control**. It never changes state the user cannot see. PageUp, PageDown, Home, End are left to the browser.
Navigation scrolls the target slide into view with `behavior: "smooth"`, or `"instant"` under reduced motion.

**D-FEED-8. Focus management.**
- Every non-active card is `inert`. The hidden face of every card is `inert`. Tab order is: nav, active card, its visible controls, desktop previous/next.
- After keyboard navigation, focus moves to the new active card root (`tabindex="-1"`, `focus({ preventScroll: true })`).
- The card root has `role="group"`, `aria-roledescription="card"`, `aria-label` = cue.
- A polite live region announces "Saved" / "Removed from saved" and "Sound on" / "Sound off". There is no visual toast (section 9).
- Focus rings are always visible on keyboard focus (`:focus-visible`), 2px, AA against the surface behind.

**D-FEED-9. Keyboard focus lost to the iframe.**
A click inside the player moves focus into a cross-origin frame and our shortcuts stop. The feed listens for `window` `blur`; if `document.activeElement` is the clip iframe, it returns focus to the active card root on the next tick. The iframe has `tabindex="-1"` and a `title` ("Clip: " + cue). The native tap-to-pause inside the player still works because the click has already been delivered.

**D-FEED-10. Desktop pointer affordances.** Previous and next glass buttons beside the card (disabled at the ends), and one quiet line of key hints under the stage. Both exist only at the desktop breakpoint and only for `(hover: hover) and (pointer: fine)`. They are affordances for input the phone does not have; they add no feature.

---

## 3. Clip

**D-CLIP-1. The clip lives on the back and plays only when the card is active and flipped.**
Spec: the front lists cue, move and hint only; the back lists "Clip below, required on every card"; behaviour says "autoplays muted". Together: the clip autoplays, muted, the moment the back is showing on the card in view.
Why not on the front: the front asks the user to hold the cue in mind first. A moving clip there competes with the one sentence that matters and gives the answer away.
Consequence: a card left on its back and scrolled back to plays again on arrival. A card on its front never loads a player.

**D-CLIP-2. YouTube IFrame Player API, not a plain iframe.**
Needed for: mute and unmute without reloading, loop inside a start/end window, error events, and guaranteed teardown. Loaded once from `https://www.youtube.com/iframe_api` by `src/lib/youtube.ts` (promise, with timeout). The script is requested at idle after the feed mounts so the first flip is fast; `preconnect` hints for `www.youtube-nocookie.com` and `www.youtube.com` go in the root layout.

**D-CLIP-3. Privacy: `youtube-nocookie.com`.** `new YT.Player(el, { host: "https://www.youtube-nocookie.com", ... })`. No YouTube thumbnail is requested before the user flips a card. No analytics of our own.

**D-CLIP-4. Player parameters.**
`autoplay: 1, mute: 1, controls: 0, playsinline: 1, cc_load_policy: 1, cc_lang_pref: "en", rel: 0, fs: 0, disablekb: 1, iv_load_policy: 3, start, end, origin: location.origin`.
- Captions are **requested, not guaranteed**: `cc_load_policy=1` shows captions only when the video has a caption track. The content pipeline must pick clips that have one. Our own dialogue text is the always-present transcript of the two lines that matter.
- Every player starts muted (`mute: 1`). This is the only start state every browser allows.

**D-CLIP-5. Loop between start and end.**
While state is PLAYING, poll `getCurrentTime()` every 250 ms. If `t >= end - 0.15` or `t < start - 1`, call `seekTo(start, true)`. The poll seeks before the end is reached, so the YouTube end screen never shows.
Backup: on state ENDED, call `loadVideoById({ videoId, startSeconds: start, endSeconds: end })`.
The poll stops on pause, error and teardown.

**D-CLIP-6. One player at a time, by construction.**
- `Clip` creates a player only while its `active` prop is true. In the feed, `active = card is the active card AND card is flipped`. In Saved, `active` is true for the single open detail card.
- `src/lib/youtube.ts` keeps a module-level reference to the current player. Creating a new one destroys the previous one first. So even a logic error elsewhere cannot leave two players.
- Teardown is the cleanup of the effect that created the player: scroll away, flip back, route hidden by Activity (F2), overlay closed and unmount all run it. Teardown calls `destroy()` and removes the iframe.
- Creation is deferred until the flip has settled (D-FLIP-1) and, on scroll arrival, until `activeId` has been stable for 150 ms, so a fast scroll through flipped cards creates no players.

**D-CLIP-7. Mute: one source of truth, in memory, for the visit.**
`muted: boolean` (default `true`) lives in the visit store. It is not written to storage: after a reload there is no user activation, so restoring "sound on" would be blocked by the browser and the button would lie. A reload is a new visit.
- Mute button toggles the store and calls `mute()` / `unMute()` on the current player.
- When a new player reaches PLAYING and the store says `muted === false`, call `unMute()`, then verify 400 ms later. If the player is paused or still muted (autoplay-with-sound blocked, typical on iOS), call `mute()`, `playVideo()`, and set the store back to `muted = true`. The button always shows what the player is actually doing.
- Risk R2 (PLAN): on iOS Safari the persisted unmute may need one tap per card. This needs a real-device check and cannot be verified in the sandbox.

**D-CLIP-8. States and fallback.**
`data-clip-state` on the clip box: `idle` (not active, empty box), `loading` (skeleton, no shimmer under reduced motion), `playing`, `paused`, `error`.
Error is entered on any of:
1. `onError` from the player (codes 2, 5, 100, 101, 150, 153),
2. the IFrame API script failing to load,
3. no `onReady` within 8 s of creation (offline, blocked network).
On error the player is destroyed and the box keeps its footprint (no layout jump) showing a quiet message: icon, "Clip unavailable", and "The exchange is all here." The mute button is hidden; the heart stays where it was. The dialogue and breakdown are untouched: this is the spec's text-only fallback.
No "Retry" control (section 9): the common cause is a removed or blocked video, where retry never works. Scrolling away and back creates a fresh player, which is the natural retry.

**D-CLIP-9. Nothing sits on top of the player; controls live beside it.**
The iframe stays interactive (tap inside toggles play/pause natively and shows YouTube's own attribution). Our mute and heart sit in the action row under the clip. This honours YouTube's no-overlay rule (F7), keeps "tap to flip must not trigger from the video" true for free, and gives WCAG 2.2.2 a pause mechanism (tap the clip, or flip the card back).

**D-CLIP-10. Reduced motion does not disable the clip.** The clip is content the user asked for by flipping the card, it starts muted, and it can be paused. Autoplay therefore stays on. Only our own animation changes (D-FLIP-3). Alternative logged for Gate 1: cue the video without autoplay under reduced motion.

**D-CLIP-11. Source line.** `card.source`, when present, is shown as small secondary text at the left of the action row. It is the attribution for the clip.

**D-CLIP-12. Playback-start timeout.** After each play request (ready, the ENDED backup, the unmute fallback) the player must reach PLAYING within 8 s, or the clip goes to `error` and shows the fallback (a player can be ready yet stuck between UNSTARTED and BUFFERING); the timer is cleared on PLAYING, PAUSED, error and teardown.

---

## 4. Saves

**D-SAVE-1. localStorage, one key.** Key `quipdeck:saved:v1`, value: JSON array of card ids in the order they were saved. Unknown ids are ignored on read and kept on write (content may change between releases).

**D-SAVE-2. Read after mount, three states.** The saves store (D-STATE-1) returns `null` on the server and during hydration ("unknown"), then the array. The Saved screen renders skeleton rows for `null`, the empty state for `[]`, the list otherwise. The empty state can never flash before the read.

**D-SAVE-3. Failure is silent.** Every storage call is in try/catch. If storage is unavailable (private mode, quota), saves work in memory for the visit. No error UI.

**D-SAVE-4. Cross-tab sync.** The store subscribes to the `storage` event. Costs three lines with `useSyncExternalStore`.

**D-SAVE-5. Heart.** A `<button>` with `aria-pressed` and the fixed label "Save". 44 px minimum target. Lives on the back of the card and in the detail view. No count, no toast, no haptic.

**D-SAVE-6. Unsave inside the detail view.** The detail card is resolved by id from all cards, not from the saved list. Unsaving turns the heart off and leaves the detail open, so the user can undo with one tap. The row leaves the list immediately (the list is a pure function of the store); on close the user returns to a list without it. If that was the last saved card, the empty state shows.

**D-SAVE-7. Order inside a group.** Save order, oldest first. New saves append; existing rows never move.

**D-SAVE-8. No heart on list rows.** One way to unsave (the detail view), no accidental unsaves while scrolling a list.

---

## 5. Saved screen and detail

**D-SAVED-1. Grouping and search use the tested helpers.** `groupByMove(searchCards(query, savedCards))` from `src/content`. Groups A to Z by move label, empty groups not rendered. Search is live on every keystroke, case-insensitive, over cue, move label, both lines, both speakers, breakdown.

**D-SAVED-2. Search field.** `<input type="search">` with a visible magnifier and the accessible name "Search saved". Hidden when nothing is saved. A clear button appears when the query is non-empty; Escape in the field clears it. The query is component state (Activity preserves it across a round trip to the feed, which is the desired behaviour for a search).

**D-SAVED-3. Group headers are plain labels.** A small `<h2>` above each rounded group. Not sticky, no counts, not collapsible.

**D-SAVED-4. Row.** The whole row is one `<button>`: cue (one line, truncated) and the response line (up to two lines). Nothing else.

**D-SAVED-5. Detail state lives in the URL: `/saved?card=<id>`.**
Next's own guidance for dialogs under Activity (F2). Next syncs `useSearchParams` with the native History API, so there is no server round trip.
- Phone sheet. Open: `window.history.pushState(null, "", "?card=" + id)`. Close: `history.back()` when this page pushed the entry, else `history.replaceState` to `/saved`. Browser Back and the Android back gesture therefore close the sheet.
- Desktop pane. Select and clear use `history.replaceState`, so Back leaves Saved in one step instead of replaying every selection.
An unknown id is ignored. `useSearchParams` requires a `<Suspense>` boundary around the Saved client component. The implementer confirms the History API behaviour in `node_modules/next/dist/docs/` before building.

**D-SAVED-6. The detail view is not a flip card.** It shows the cue as its title, then the same `CardBack` content as the feed (move tag, exchange, breakdown, clip, source, mute, heart). In Saved the user already knows the answer; a second tap to see it would be ceremony. The cue as title also gives the dialog its accessible name. To confirm at Gate 1.

**D-SAVED-7. One content component, two containers.**
- Below the desktop breakpoint: modal bottom sheet (Base UI Dialog): focus trap, Escape, scroll lock, focus returns to the row. Close button first in DOM order. Swipe down on the grabber/header strip dismisses (framer-motion drag on that strip only, so it cannot fight content or the player).
- At the desktop breakpoint: non-modal detail pane beside the list (master-detail). The selected row has `aria-current="true"`. Escape clears the selection. Nothing is auto-selected on arrival (no clip starts unasked).
The container is chosen by a `useMediaQuery("(min-width: 1024px)")` hook built on `useSyncExternalStore`; the detail only renders on the client after an interaction or a `?card=` read, so there is no hydration difference. Exactly one container renders the content, so exactly one clip exists.

---

## 6. State architecture

**D-STATE-1. Stores are plain modules read with `useSyncExternalStore`.**
`getServerSnapshot` returns the "unknown" value; `getSnapshot` returns a cached, referentially stable snapshot that is replaced only on change. No `useEffect` + `setState` for hydration (F3). No context providers, no state library.

**D-STATE-2. Visit store** (`src/lib/visit-store.ts`), memory only: `seed`, `order: string[]`, `flipped: Set<string>`, `activeId`, `muted`. Created lazily on first client read.

**D-STATE-3. Saves store** (`src/lib/saves-store.ts`), localStorage-backed, storage injected for tests.

**D-STATE-4. Clip controller** (`src/lib/clip-controller.ts`) is a small state machine that takes a `YT`-shaped object, so it is unit-tested in vitest with a fake player and fake timers.

**D-STATE-5. Routes are static.** `/` and `/saved` prerender to a static shell. All interactivity is in client components. No server data, no server actions, no cookies.

---

## 7. Glass and the flip

**D-FLIP-1. The flip is one spring-driven rotation with a face swap at 90 degrees; nothing is transformed at rest.**
A single motion value `r` runs 0 to 180 on a spring (about 550 to 650 ms settle; exact values in Phase 2). Front face renders `rotateY(r)` while `r < 90`; back face renders `rotateY(r - 180)` while `r >= 90`. The hidden face is `visibility: hidden` and `inert`. Perspective is on the parent. When `r` settles at 0 or 180 the visible face has `transform: none`.
Why: the classic "two faces, `preserve-3d`, `backface-visibility: hidden`" pattern leaves the back face inside a permanent 3D context. In Safari that breaks `backdrop-filter`, softens text, and can mis-target taps on an iframe. With nothing transformed at rest, the iframe, text and hit-testing are ordinary.
The player is created when the spring settles on the back (D-CLIP-6), never mid-rotation.

**D-FLIP-2. No `backdrop-filter` on the rotating faces.**
The card faces are painted glass: a translucent tinted fill, a hairline gradient border, an inner top highlight, and grain, over the ambient layer. They read as glass without sampling the backdrop, so they look identical in every browser at every angle. Controls inside the card (heart, mute, move tag, bubbles) use translucent fills, also without `backdrop-filter`.
Real `backdrop-filter` blur is used only on chrome that never rotates: the nav pill, the Saved search field, the sheet, the desktop detail pane and the desktop previous/next buttons. Each has a solid-enough fallback fill for `@supports not (backdrop-filter: blur(1px))` and for `prefers-reduced-transparency`.

**D-FLIP-3. Reduced motion.** `prefers-reduced-motion: reduce` replaces the rotation with a 150 ms opacity crossfade, makes keyboard navigation scroll instant, stops the hint pulse, the heart spring, the skeleton shimmer and the ambient drift, and removes the specular sweep. Read with framer-motion's `useReducedMotion()` and a CSS media query; never by user-agent.

---

## 8. Theme and signature layer

**D-THEME-1. Dark only.** `<html class="dark">` and `color-scheme: dark` are set in the root layout. No light theme, no toggle, `next-themes` is not wired. `themeColor` matches the base surface.

**D-THEME-2. Signature layer: "one pane of glass, lit from behind".** Direction only; tokens come in Phase 2.
1. **Base**: near-black with a barely perceptible vertical gradient.
2. **Ambient light**: one large, soft, blurred glow behind the card. Its hue is derived from the active card's move (D-THEME-3) and crossfades when the card changes. It drifts very slowly (a 40 to 60 s cycle). Pure CSS, one fixed layer, no canvas.
3. **Grain**: one static SVG-turbulence layer at a few percent, so gradients never band and the dark has texture.
4. **Glass**: the card and the chrome, as in D-FLIP-2: hairline edge, top rim highlight, soft deep shadow tinted by the ambient hue.
5. **Specular sweep**: a single faint highlight crossing the card during the flip, once.
Restraint rules: one moving thing at a time (the clip, or the flip, or the drift, never a busy screen); no WebGL in the default path; no refraction on content. P3 may evaluate one 21st.dev grain/gradient component and one glass component against this direction; they are adopted only if they are calmer than the CSS version.

**D-THEME-3. Hue is data-driven (revised in P3-2).** Each known move in `moves.ts` is pinned to its own slot on a curated OKLCH ring of ten clearly distinct hues (20, 50, 80, 140, 170, 205, 245, 275, 305, 340; fixed lightness and chroma), so no two starter moves look alike (Gate 2 carry-over). A move that is not pinned, such as a new one from the content pipeline, gets a ring hue from a stable hash of its id with no UI change. It may share a hue until the design system owner pins it. The hue feeds the ambient glow, the move tag tint and the response bubble tint, and nothing else. Screens publish it through one CSS custom property on the root; the design system owner owns the helper.

**D-THEME-4. Type.** Geist (already wired). The cue is the largest thing in the product. Sizes come in Phase 2.

**D-THEME-5. Contrast.** Body and secondary text reach 4.5:1 against the surface they sit on, measured on the painted glass fill at its lightest point. A script checks token pairs in P2.

---

## 9. Scope guard

Nothing below ships. Each was considered and rejected; items marked (board) were suggested by the reference board.

| Rejected | Why |
|---|---|
| Search, discover, filters or move chips on the feed | Spec: the feed is a shuffled stream. Search belongs to Saved. |
| Counts of any kind: position ("3 / 14"), group counts ("Callback · 3") (board), saved badge on the nav | No counts, streaks or progress. A count turns exposure into a task. |
| Streaks, progress, "seen" marks, ranking, popularity | Out of scope in the spec. |
| "Saved" toast and haptic (board) | The heart filling is the confirmation. A live region covers screen readers. |
| Hint that fades after three flips (board) | The spec lists the hint as part of the front. Extra stored state for no gain. |
| "Retry" on the clip error (board) | D-CLIP-8. |
| Nav that auto-hides during playback (board) | A control that moves is not calm. The nav stays put. |
| Burned-in or WebVTT captions (board) | We do not host video. Captions come from YouTube (D-CLIP-4). |
| Sticky group headers, collapsible groups, alphabet rail, sort options (board) | The spec asks for groups A to Z. Nothing more. |
| Heart on list rows | D-SAVE-8. |
| "Back to feed" button in the empty state (board) | The nav is on screen, one thumb away. |
| Share, settings, onboarding, accounts, theme toggle, light theme | Not in the spec. |
| End-of-deck card, infinite loop | D-FEED-3. |
| Shared-element expansion from row to overlay (board) | Fragile across the sheet/pane split. The sheet rises; that is enough. |
| WebGL shader background, SVG refraction on content (board) | D-THEME-2. |
| Our own play/pause, scrubber or fullscreen controls | The clip is a 10 second loop. Tap the clip to pause. |

---

## 10. Testing decisions

**D-TEST-1. e2e runner.** CommonJS files `e2e/*.test.cjs` using `require("playwright")` and `node:test`, run with `node --test e2e/` against `next start`. No `@playwright/test`.

**D-TEST-2. Clip tests use a stubbed IFrame API.** `page.route("**/iframe_api", ...)` serves `e2e/support/yt-stub.js`, which defines `window.YT` with a fake `Player` that: records constructor options and every call in `window.__yt`, inserts an `<iframe>` whose `src` has the same shape as the real embed URL (the embed request itself is fulfilled with a blank page), fires `onReady` then PLAYING, advances a fake clock, and fires `onError(150)` for the id `BROKEN_CLIP`. Gate screenshots use the same stub so a healthy clip is shown as a labelled frame instead of the sandbox's "unavailable" state (F4). No test hook exists in production code.

**D-TEST-3. Stable hooks.** Roles and `data-testid` / `data-*` attributes are defined once in `FEATURE_INVENTORY.md`. Phase 1 builds them; Phase 5 tests them; Phase 4 must not rename them.

**D-TEST-4. Hidden routes.** Because of Activity (F2) the feed's DOM exists while Saved is shown. Every locator is visibility-scoped (`getByRole`, `:visible`). Components use `useId()` for ids so two instances of `CardBack` never collide.

**D-TEST-5. Real playback** is checked by hand outside the sandbox on iOS Safari, Android Chrome and one desktop browser before release (PLAN, risks R1 and R2).


**D-FEED-11. Wheel paging (lead, after P1-6).** CSS `scroll-snap-stop: always` does not stop Chromium skipping cards on a large wheel delta, and a single 100-120 px notch snaps back to the same card. The feed gets a JS wheel handler on pointer-fine devices: accumulate `deltaY` to about 40 px, move one card, then ignore wheel input until scrolling settles. Touch scrolling is untouched. Owned by P4-4.

**D-THEME-6. Hue crossfade under reduced motion (lead, after P2-1).** Keep the 400 ms opacity crossfade of the move hue. It is a colour change with no movement, so it is allowed under reduced motion and is gentler than a hard swap.

**D-SAVED-8. Detail sheet uses the Base UI Drawer (lead, after P3-1).** Adopt the fetched Drawer (21st id 24837) native swipe-to-dismiss in place of the hand-built grabber drag. P3-2 ports it to `src/components/ui/drawer.tsx` on our tokens. P4-5 switches `detail-sheet.tsx` to it and keeps every existing test hook (`sheet-grabber`, roles, focus return).

**D-CLIP-13. Clip radius vs CL-19 (lead, after P4-3).** Keep the frozen `--radius-clip` (20 px). CL-19 probes 4 px inside each corner, which lies outside a 20 px curve. The test is wrong, not the token. P4-6 restores `rounded-clip` in `clip.tsx` (P4-3 used 0.6x as a stopgap) and makes CL-19 probe radius-aware points: edge midpoints plus corner points inset by at least the radius times (1 - 1/sqrt 2) plus 4 px.

**D-FEED-12. Wheel over the clip (lead, after P4-4).** The YouTube iframe consumes wheel events cross-origin, so wheeling while the pointer is over a playing clip does not page. A forwarding overlay would break YouTube policy F7 (no overlays on the player), so this is accepted as a known limit. Keys, prev/next and wheeling anywhere else on the stage still page. Real trackpad momentum is a device check (MAN).
