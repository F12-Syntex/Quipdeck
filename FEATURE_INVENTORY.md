# Quipdeck feature inventory

Every route, screen, component, interaction, state and feature in `docs/SPEC.md`, each with a concrete check. Phase 1 builds the hooks listed in section 1; Phase 5 automates the checks. Decision IDs (D-...) refer to `DESIGN_DECISIONS.md`; layouts refer to `LAYOUT_PLAN.md`.

Legend for "Verify": **PW** = Playwright-observable (script in `e2e/`), **UT** = vitest unit test, **CMD** = shell command, **MAN** = manual on a real device (cannot be checked in the sandbox).

---

## 0. Test harness assumptions

- Viewports: phone `390x844` (touch, `isMobile`), small phone `375x667` and `360x640`, desktop `1440x900`, small desktop `1024x768`.
- Runner: `node --test e2e/` with CommonJS files using `require("playwright")` (D-TEST-1). App served by `next start` after `npm run build`.
- The YouTube IFrame API is stubbed by route interception (D-TEST-2). The stub records calls in `window.__yt` (`players`, `calls`), plays every id except `BROKEN_CLIP`, and can be told to never become ready or to fail the script load. Real playback is unverifiable in the sandbox (every video returns error 150).
- Hidden routes stay in the DOM (`display: none`) after navigation. All locators are visibility-scoped (D-TEST-4).
- Reduced motion: browser context with `reducedMotion: "reduce"`.
- Saved state is seeded with `localStorage.setItem("quipdeck:saved:v1", JSON.stringify([...]))` in an init script.

---

## 1. Stable hooks (contract)

Roles first, `data-testid` where a role is not enough. Phase 4 must not rename these.

| Hook | Element |
|---|---|
| `nav[aria-label="Primary"]`, links named "Feed" and "Saved", `aria-current="page"` on the current one | App nav |
| `[data-testid="feed"]` with `data-ready="true"` once shuffled | Feed scroller |
| `[data-testid="feed-skeleton"]` | Skeleton card before shuffle |
| `[data-testid="card"]` with `data-card-id`, `data-face="front|back"`, `data-active="true|false"` | One card (`article`, `role="group"`, `aria-label` = cue) |
| `[data-testid="card-front"]`, `[data-testid="card-back"]` | Faces (hidden face is `inert`) |
| `[data-testid="cue"]`, `[data-testid="move"]` | Cue heading and move label / tag |
| `[data-testid="reveal"]` (button, name "Tap to reveal" or "Click to reveal") | Front hint |
| `[data-testid="flip-back"]` (button, name "Back to cue") | Back, hidden until focused |
| `[data-testid="exchange"]` containing `[data-testid="trigger"]` and `[data-testid="response"]`, each with `[data-testid="speaker"]` and `[data-testid="line"]` | Dialogue |
| `[data-testid="breakdown"]`, `[data-testid="source"]` | Breakdown, source |
| `[data-testid="clip"]` with `data-clip-state="idle|loading|playing|paused|error"` | Clip box |
| `[data-testid="clip-fallback"]` | Fallback message inside the clip box |
| `[data-testid="heart"]` (button, name "Save", `aria-pressed`) | Heart |
| `[data-testid="mute"]` (button, name "Unmute" when muted, "Mute" when not, `data-muted="true|false"`) | Mute |
| `[data-testid="feed-prev"]`, `[data-testid="feed-next"]`, `[data-testid="key-hints"]` | Desktop-only feed chrome |
| `[data-testid="live"]` (`aria-live="polite"`) | Announcements |
| `h1` "Saved"; `searchbox` named "Search saved"; `[data-testid="search-clear"]` | Saved header |
| `[data-testid="saved-skeleton"]`, `[data-testid="saved-empty"]`, `[data-testid="saved-no-results"]` | Saved states |
| `[data-testid="move-group"]` with `data-move-id`, containing an `h2` | Group |
| `[data-testid="saved-row"]` with `data-card-id` (button), `aria-current="true"` when selected on desktop | Row |
| `[data-testid="card-detail"]` with `data-card-id`, `data-mode="sheet|pane"`; in sheet mode it is inside `role="dialog"`; close button named "Close" | Detail |
| `[data-testid="detail-placeholder"]` | Desktop pane with nothing selected |

---

## 2. Routes

| ID | Item | Expected | Verify |
|---|---|---|---|
| R-1 | `/` | Feed. Static shell (not fully dynamic). | CMD: `npm run build` succeeds and lists `/` as static or partially prerendered. PW: `GET /` 200, `[data-testid="feed"]` visible. |
| R-2 | `/saved` | Saved list. Static shell; the `Suspense` fallback (title plus skeleton rows) is what is prerendered. | CMD as R-1. PW: `h1` "Saved" visible; with JavaScript disabled, `h1` and `saved-skeleton` are in the HTML. |
| R-3 | `/saved?card=<id>` | Saved with the detail open for that card. Unknown id: no detail, no error. | PW: load `/saved?card=c01` with c01 saved: `[data-testid="card-detail"][data-card-id="c01"]` visible. Load `/saved?card=nope`: no detail, no console error. |
| R-4 | Not found | One line and a link to the feed; nav present. | PW: `GET /nope` 404; link named "Go to the feed" navigates to `/`. |
| R-5 | Error boundary | One line and a "Reload" button. | Code review plus PW by throwing in a dev-only scenario if practical; otherwise MAN. |
| R-6 | `/showcase` (Phase 2) | Design system showcase; not in the nav; `noindex`. | PW: 200; `meta[name="robots"]` contains `noindex`; nav has exactly two links. |
| R-7 | Metadata | Title "Quipdeck"; description describes clips of unscripted wit (not "jokes"); `viewport-fit=cover`; dark theme colour. | PW: read `document.title`, `meta[name=description]`, `meta[name=viewport]`. |

---

## 3. Navigation

| ID | Item | Expected | Verify |
|---|---|---|---|
| N-1 | Two destinations | Nav has exactly "Feed" and "Saved". No counts or badges. | PW: `nav[aria-label="Primary"] a` count is 2; text content has no digits. |
| N-2 | Current marker | `aria-current="page"` on the link for the current route. | PW on `/` and `/saved`. |
| N-3 | Phone placement | Fixed, bottom centre, inside the safe area; each link at least 44 px high and 88 px wide. | PW at 390x844: nav bounding box centre x is within 2 px of 195; bottom edge within 8 to 44 px of viewport bottom; link boxes >= 88x44. |
| N-4 | Desktop placement | Fixed, top centre. | PW at 1440x900: nav centre x within 2 px of 720; top <= 32 px. |
| N-5 | Nav never moves | Same position before, during and after scroll and flip. | PW: record box, scroll 3 cards, flip, compare. |
| N-6 | Feed state survives a visit to Saved | Same order, same active card, same flips, on return. | PW: flip card 2, go to card 3, click Saved, click Feed: active card id and `data-face` values unchanged; DOM order unchanged. |
| N-7 | Keyboard reachable | Tab reaches both links; Enter activates. | PW: keyboard only. |

---

## 4. Feed

| ID | Item | Expected | Verify |
|---|---|---|---|
| FD-1 | One card per viewport | Each slide is exactly one viewport tall; scroller snaps. | PW: slide height equals `innerHeight`; computed `scroll-snap-type` is `y mandatory`; after a wheel or swipe, `scrollTop % innerHeight` is 0 (within 1 px) once settled. |
| FD-2 | Swipe up moves one card | One gesture advances exactly one card. | PW (touch): swipe; `data-active` moves to the next card in DOM order. Wheel on desktop: same. |
| FD-3 | Shuffled order | Every card appears once; order differs between visits. | PW: collect `data-card-id` in DOM order; set equals the 14 seed ids; over 3 fresh loads at least 2 orders differ. UT: `shuffle` (already tested). |
| FD-4 | No hydration mismatch | No hydration warning; no visible reorder. | PW: no console message matching /hydrat/i on load; first non-skeleton paint already has `data-ready="true"`. CMD: `npm run build` passes (no sync-IO prerender error). |
| FD-5 | Loading state | Skeleton card in the static HTML, same box as a real card. | PW: with JavaScript disabled, `[data-testid="feed-skeleton"]` is visible and contains no cue text. |
| FD-6 | Order stable within the visit | Order does not change on client navigation. | Covered by N-6. |
| FD-7 | Reload is a new visit | Flips reset; mute resets to muted. | PW: flip, unmute, reload: all cards `data-face="front"`, mute `data-muted="true"`. |
| FD-8 | Finite deck | Last card is the last snap point. No end card, no counter. | PW: press ArrowDown 20 times; active card is the last in DOM order; `[data-testid="feed"]` text has no "/" counter pattern such as `\d+\s*/\s*\d+`. |
| FD-9 | Empty deck (defensive) | "No cards yet." | UT or code review (seed data is never empty). |
| FD-10 | No search or discover on the feed | No search input on `/`. | PW: `searchbox` count is 0 on `/`. |
| FD-11 | Scroll position after Activity | Returning from Saved shows the same card snapped. | PW: as N-6, plus `scrollTop % innerHeight` is 0. |

---

## 5. Card front

| ID | Item | Expected | Verify |
|---|---|---|---|
| CF-1 | Cue, top and large | Cue text equals `card.cue`; it is the largest text on the face. | PW: text match per `data-card-id`; computed font size of `cue` > font size of `move`. |
| CF-2 | Move below, smaller | Label equals `getMove(card.move).label` (data-driven). | PW: text match against the content module; cue box is above the move box. |
| CF-3 | Hint | A visible button "Tap to reveal" (coarse pointer) or "Click to reveal" (fine pointer). | PW: at 390 touch and 1440 mouse; role button, visible. |
| CF-4 | No video icon, no heart, no mute, no clip | Front has none of them. | PW: inside `card-front`: 0 `iframe`, 0 `heart`, 0 `mute`, 0 `clip`, 0 `svg[data-icon="video"]`. |
| CF-5 | Phone layout | Text block left-aligned, vertically near centre; hint at the bottom inside the card. | PW at 390x844: hint box bottom is within the card box; cue left edge equals move left edge. Screenshot at the gate. |
| CF-6 | Desktop layout | Landscape card (width > height), centred. | PW at 1440x900: card width > height; card centre within 4 px of viewport centre on both axes. |

---

## 6. Flip

| ID | Item | Expected | Verify |
|---|---|---|---|
| FL-1 | Tap flips | Tap or click on the card shows the back. | PW: click card centre; `data-face="back"`; `card-back` visible, `card-front` not. |
| FL-2 | Tap again flips back | | PW: click a non-interactive point on the back (the breakdown text); `data-face="front"`. |
| FL-3 | Heart does not flip | | PW: click `heart`; `data-face` stays `back`; `aria-pressed` toggles. |
| FL-4 | Mute does not flip | | PW: click `mute`; `data-face` stays `back`. |
| FL-5 | Clip does not flip | | PW: click the centre of `clip`; `data-face` stays `back`. |
| FL-6 | Flip state persists while scrolling | A flipped card is still flipped when scrolled back to; an unflipped one is still unflipped. | PW: flip card 1, go to card 3, return to card 1: `back`; card 2: `front`. |
| FL-7 | Hidden face is inert | Hidden face cannot be focused or read. | PW: hidden face has the `inert` attribute; Tab never lands inside it. |
| FL-8 | Keyboard flip | Space or Enter flips the active card when focus is not on a control. | PW: focus body, press Space: `back`; press Enter: `front`. |
| FL-9 | Buttons for assistive tech | Front "reveal" button flips; back "Back to cue" button flips back and is visible when focused. | PW: activate each with the keyboard; `flip-back` has a non-zero box when focused. |
| FL-10 | Motion | Rotation with a face swap at 90 degrees; the visible face has no transform at rest. | PW: after the flip settles, computed `transform` of the visible face is `none`. Visual check at the gate. |
| FL-11 | Reduced motion | Crossfade, no rotation. | PW (`reducedMotion: "reduce"`): during and after the flip no element in the card has a 3D `transform`; back visible within 300 ms. |
| FL-12 | Selecting text does not flip | | PW: drag-select text in the breakdown; `data-face` unchanged. |

---

## 7. Card back

| ID | Item | Expected | Verify |
|---|---|---|---|
| CB-1 | Move tag at the top | Small tag with the move label, first visible element. | PW: `move` box is above `exchange`; text equals the label. |
| CB-2 | Exchange as dialogue | Trigger (speaker, line) then response (speaker, line), two separate blocks, not a paragraph. | PW: `trigger` above `response`; speakers and lines equal the content; exchange is a list with 2 items. |
| CB-3 | Response reads as the punchline | Trigger aligned left, response aligned right (stacked layout). | PW at 390: trigger left edge < response left edge; response right edge >= trigger right edge. |
| CB-4 | Breakdown | One line under the exchange, equals `card.breakdown`. | PW: text match; in the stacked layout its box is below `response`. |
| CB-5 | Clip below, on every card | Every card back has a clip box; stacked layout puts it under the breakdown. | PW: flip each card; `clip` exists; at 390 its top is below the breakdown's bottom. |
| CB-6 | Heart and mute | Both present on the back, each at least 44x44, in the bottom third on phone. | PW at 390x844: boxes >= 44x44; top > 0.6 * viewport height. |
| CB-7 | Source | Shown when present, absent when not. | PW: `source` text equals `card.source`; UT or PW with a card without source. |
| CB-8 | Fits one viewport on phone | No scrollable overflow inside the card at heights >= 600. | PW at 375x667 and 360x640, for every card: `card-back` and every descendant have `scrollHeight <= clientHeight + 1`; nothing is clipped outside the card box. |
| CB-9 | Desktop two columns | Text left, clip right. | PW at 1440x900 and 1024x768: `exchange` right edge < `clip` left edge; clip width >= 400. |
| CB-10 | Clip minimum size | Clip box is at least 200x200. | PW at 360x640: box >= 200x200. |

---

## 8. Clip

All PW checks run against the stubbed API unless marked MAN.

| ID | Item | Expected | Verify |
|---|---|---|---|
| CL-1 | Plays only on the active, flipped card | No player on the front; a player appears after flipping. | PW: on load `iframe` count is 0 and `__yt.players.length` is 0; after flip, 1 iframe inside the active card and `data-clip-state="playing"`. |
| CL-2 | IFrame API with the right parameters | Player options and iframe `src` carry `autoplay=1`, `mute=1`, `controls=0`, `playsinline=1`, `cc_load_policy=1`, `rel=0`, `start`, `end`; host is `youtube-nocookie.com`. | PW: read `__yt.players[0].options`; iframe `src` starts with `https://www.youtube-nocookie.com/embed/<id>` and contains each parameter with the card's start and end. |
| CL-3 | Autoplays muted | First player of a visit is muted and playing. | PW: `mute` `data-muted="true"`; stub reports muted and PLAYING. |
| CL-4 | Captions requested | `cc_load_policy=1`. | Covered by CL-2. MAN: captions visible on a real captioned clip. |
| CL-5 | Loop between start and end | When time reaches the end the player seeks to start. | UT: clip controller with a fake player and fake timers seeks at `end - 0.15`. PW: advance the stub clock past `end`; `__yt.calls` contains `seekTo(start)`; state stays `playing`. |
| CL-6 | One clip at a time | Never more than one player. | PW: flip cards 1, 2 and 3 while moving through them, then go back; at every step `document.querySelectorAll("iframe").length <= 1` and live (not destroyed) stub players <= 1. |
| CL-7 | Stops when scrolled away | Leaving a flipped card destroys its player. | PW: flip card 1, go to card 2 (front): 0 iframes; `__yt.calls` has `destroy` for player 1. |
| CL-8 | Stops when flipped back | | PW: flip to back then to front: 0 iframes. |
| CL-9 | Resumes on return | A flipped card plays again when it becomes active. | PW: flip card 1, go to 2, return to 1: 1 iframe, state `playing`. |
| CL-10 | Stops when leaving the feed | Navigating to Saved destroys the feed's player. | PW: flip, click Saved: visible iframes 0, total iframes 0. Return: player recreated. |
| CL-11 | Mute toggle | Button toggles sound and its own label. | PW: click `mute`: `data-muted="false"`, name "Mute", `__yt.calls` has `unMute`. Click again: `mute`. |
| CL-12 | Unmute persists for the visit | After unmuting, the next card's clip is unmuted once playing. | PW: unmute on card 1, go to card 2, flip: after playing, `__yt.calls` for player 2 has `unMute`; button `data-muted="false"`. Also persists into the Saved detail. MAN on iOS Safari (risk R2). |
| CL-13 | Blocked unmute degrades honestly | If unmute pauses or fails, the clip plays muted and the button says so. | UT: controller with a fake player that pauses on `unMute`. PW with the stub in "block unmute" mode: state `playing`, `data-muted="true"`. |
| CL-14 | Loading state | Skeleton in the clip box until ready; box size constant. | PW with the stub delaying ready by 1 s: `data-clip-state="loading"` then `playing`; box size identical in both. |
| CL-15 | Fallback on player error | Broken id shows the fallback; exchange text still shows; no iframe remains. | PW: flip card `c14` (`BROKEN_CLIP`): `data-clip-state="error"`, `clip-fallback` visible with "Clip unavailable", `exchange` and `breakdown` visible, 0 iframes, `mute` not visible, `heart` visible. |
| CL-16 | Fallback when the API cannot load | Script blocked: fallback. | PW: `page.route("**/iframe_api", r => r.abort())`, flip: state `error`. |
| CL-17 | Fallback on timeout | Ready never fires: fallback within about 8 s. | UT: controller with fake timers. PW with the stub in "never ready" mode (timeout shortened by fake clock if available, else waited). |
| CL-18 | Fallback keeps layout | Clip box and heart do not move between `loading` and `error`. | PW: compare boxes before and after the error. |
| CL-19 | Nothing over the player | No element of ours overlaps the iframe. | PW: `elementFromPoint` at the iframe centre and four inner corners returns the iframe. |
| CL-20 | Keyboard survives a click in the clip | After clicking inside the clip, shortcuts still work. | PW: click clip, press ArrowDown: active card advances. |
| CL-21 | Privacy | No request to `youtube.com/embed`, `ytimg.com` or any YouTube host before the first flip other than the API script; embeds use nocookie. | PW: record requests from load to just before the first flip. |
| CL-22 | Real playback | Autoplay, loop, captions and unmute work on real devices. | MAN: iOS Safari, Android Chrome, desktop Chrome or Safari, outside the sandbox. |

---

## 9. Saving

| ID | Item | Expected | Verify |
|---|---|---|---|
| SV-1 | Heart toggles save | Press sets `aria-pressed="true"`; press again clears it. | PW. |
| SV-2 | Stored on device | `localStorage["quipdeck:saved:v1"]` is a JSON array of ids in save order. | PW: read storage after saving two cards. UT: saves store. |
| SV-3 | Survives reload | Saved cards are still saved after reload. | PW: save, reload, flip the same card: `aria-pressed="true"`; `/saved` lists it. |
| SV-4 | No accounts, no network | Saving makes no request. | PW: no requests fired on heart press. |
| SV-5 | Hydration-safe | No hydration warning with a pre-seeded storage. | PW: seed storage, load `/` and `/saved`: no console /hydrat/i. |
| SV-6 | Storage unavailable | Saves work for the visit; no error shown. | UT: store with a throwing storage. PW: init script that makes `localStorage.setItem` throw; heart still toggles; no console error. |
| SV-7 | Cross-tab | A save in one tab appears in another. | UT: store reacts to a `storage` event. |
| SV-8 | Keyboard | `S` toggles save on a flipped active card; does nothing on a front. | PW. |
| SV-9 | Announcement | Live region says "Saved" / "Removed from saved". No toast. | PW: `live` text; no `[data-sonner-toast]`. |

---

## 10. Saved list

| ID | Item | Expected | Verify |
|---|---|---|---|
| SL-1 | Grouped by move, A to Z | One group per move that has saved cards; headings sorted by label. | PW: seed 5 saves across 3 moves; `move-group h2` texts equal the sorted labels. UT: `groupByMove` (already tested). |
| SL-2 | Row content | Each row shows the cue and the response line. | PW: per row, text contains `card.cue` and `card.response.line`. |
| SL-3 | No counts | No numbers in group headings or the nav. | PW: headings contain no digits. |
| SL-4 | Search covers all fields | Matches on cue, move label, trigger line, response line, breakdown (speakers too). | UT: `searchCards` (already tested). PW: one query per field against seeded saves; expected row ids. |
| SL-5 | Search is live and case-insensitive | List updates per keystroke. | PW: type letter by letter; row count shrinks without submit. |
| SL-6 | Search only searches saved cards | Unsaved cards never appear. | PW: query matching an unsaved card only: no-results state. |
| SL-7 | Empty groups hidden while searching | | PW: query matching one move: 1 group. |
| SL-8 | Clear search | Clear button and Escape empty the field and restore the list. | PW. |
| SL-9 | Empty state | With no saves: "Nothing saved yet" and the helper line; no search field; on desktop no detail pane, message centred. | PW: fresh storage; `saved-empty` visible; `searchbox` count 0; at 1440x900 `detail-placeholder` count 0 and the message centre is within 8 px of the container centre x. |
| SL-10 | No-results state | "No matches", helper, "Clear search" button that restores the list. | PW: query "zzzqqq". |
| SL-11 | Loading state | Skeleton rows until saves are read; the empty state never flashes when saves exist. | PW: seeded storage; from first paint to list, `saved-empty` is never visible (poll or MutationObserver in an init script). With JavaScript disabled: `saved-skeleton` visible. |
| SL-12 | Order inside a group | Save order, oldest first. | PW: save A then B in the same move; rows are A, B. |
| SL-13 | Phone layout | One column; search sticky; last row clears the nav. | PW at 390x844: scroll to the end; last row bottom < nav top. |
| SL-14 | Desktop layout | Two panes: list left (about 400 px), detail right. | PW at 1440x900: `saved-list` width between 380 and 420; `detail-placeholder` or `card-detail` to its right. |
| SL-15 | Keyboard | Tab reaches search, then rows in order; Enter opens. | PW keyboard only. |
| SL-16 | Search state survives a visit to the feed | Query still there on return. | PW: type, go to Feed, return. |

---

## 11. Card detail (overlay on phone, pane on desktop)

| ID | Item | Expected | Verify |
|---|---|---|---|
| OV-1 | Tapping a row opens the full card | Phone: modal sheet. Shows cue (title), move tag, both lines with speakers, breakdown, clip, heart, mute. | PW at 390: click row; `role="dialog"` visible, `data-mode="sheet"`; all hooks present with the card's content. |
| OV-2 | URL reflects the detail | `?card=<id>` while open; removed when closed. | PW: `page.url()`. |
| OV-3 | Close paths (phone) | Close button, Escape, backdrop tap, drag down on the grabber, browser Back. Each closes and returns focus to the row. | PW: one test per path; `document.activeElement` is the row afterwards. |
| OV-4 | Focus trap and scroll lock (phone) | Tab cycles inside the dialog; the list behind does not scroll. | PW: Tab 10 times, focus stays inside; background `scrollTop` unchanged after a wheel. |
| OV-5 | Dialog name | Accessible name is the cue. | PW: `getByRole("dialog", { name: cue })`. |
| OV-6 | Clip plays in the detail | Same rules: muted autoplay (or visit preference), loop, one player. | PW: 1 iframe, state `playing`; closing destroys it. |
| OV-7 | Unsave from the detail | Heart turns off, detail stays open, row disappears from the list; re-pressing re-saves. | PW: press heart: `aria-pressed="false"`, detail still visible; close: row gone. Repeat with press twice: row present. |
| OV-8 | Unsaving the last card | After close, the empty state shows. | PW. |
| OV-9 | Does not flip | Tapping the detail body does nothing. | PW: click breakdown text; detail unchanged. |
| OV-10 | Desktop pane | Clicking a row shows the card in the right pane, non-modal, stacked layout (clip under the text, card at most 560 px wide); the row gets `aria-current="true"`; another row swaps the card; Escape clears. | PW at 1440x900 and 1024x768: `data-mode="pane"`, no `role="dialog"`; `clip` top is below `breakdown` bottom; detail card width <= 560; iframe count stays <= 1 while switching rows. |
| OV-11 | Desktop Back | Back leaves Saved in one step. | PW: from `/`, go to Saved, select two rows, press Back: URL is `/`. |
| OV-12 | Fallback in the detail | Broken clip shows the fallback; text intact. | PW with `c14` saved. |
| OV-13 | Sheet height | At most 92% of the viewport height; bottom safe area respected. | PW at 390x844: sheet height <= 0.92 * 844. |

---

## 12. Keyboard and focus

| ID | Item | Expected | Verify |
|---|---|---|---|
| KB-1 | Next and previous | ArrowDown or J next; ArrowUp or K previous. | PW: active id sequence follows DOM order. |
| KB-2 | Flip | Space, Enter. | FL-8. |
| KB-3 | Save | S on the back only. | SV-8. |
| KB-4 | Mute | M on the back only; no effect in the error state. | PW. |
| KB-5 | Ignored contexts | Shortcuts do nothing while typing in the Saved search, with Ctrl/Cmd/Alt held, or while a dialog is open. | PW: type "s" and "m" in search: text entered, nothing else changes. |
| KB-6 | Inactive cards are inert | Tab from the active card never enters another card. | PW: Tab until focus leaves the card; next stop is not inside a `card` with `data-active="false"`. |
| KB-7 | Focus follows navigation | After J, focus is on the new active card. | PW: `document.activeElement` is the active card root. |
| KB-8 | Visible focus | Every focusable control shows a focus indicator on keyboard focus. | PW: for each control, focused screenshot differs from unfocused; outline or ring computed style non-zero. Visual check at Gate 4. |
| KB-9 | Desktop previous / next buttons | Work with click; disabled at the ends; absent on phone. | PW at 1440 and 390. |
| KB-10 | Key hints | One line under the stage on desktop; absent on phone and on coarse pointers. | PW. |

---

## 13. Accessibility

| ID | Item | Expected | Verify |
|---|---|---|---|
| A-1 | Contrast AA | Text and essential icons >= 4.5:1 (large text 3:1) on their surface. | CMD: `node scripts/contrast.cjs` over token pairs (P2). PW + axe `color-contrast` on each screen (P5). |
| A-2 | axe clean | No serious or critical violations on feed front, feed back, saved, saved empty, detail. | PW + `axe-core` (installed in P5). |
| A-3 | Landmarks and headings | One `main` per route; `nav` labelled; `h1` on Saved; cue is a heading in the card and the detail. | PW role queries. |
| A-4 | Names | Every button has an accessible name; the iframe has a title. | axe; PW. |
| A-5 | Reduced motion | No rotation, no drift, no pulse, no shimmer, instant keyboard scroll. | PW with `reducedMotion: "reduce"`: no running CSS animations (`document.getAnimations()` empty or all finished) on feed front; FL-11. |
| A-6 | Reduced transparency | Glass chrome falls back to a solid-enough fill. | PW: emulate `prefers-reduced-transparency: reduce` if the browser supports it and check the nav's computed `backdrop-filter` is `none`; otherwise code review of the media query. |
| A-7 | Pause mechanism | The clip can be stopped: tap the clip, or flip back. | CL-8; MAN for native tap. |
| A-8 | Zoom | Usable at 200% zoom on desktop; text not clipped. | PW: viewport 720x450 as a proxy for 1440x900 at 200%; no horizontal scroll on `/` and `/saved`; cue fully inside the card. |
| A-9 | Touch targets | All targets >= 44x44 on phone. | PW: every `button, a` box at 390. |

---

## 14. Look and feel (checked at gates, not by script alone)

| ID | Item | Expected | Verify |
|---|---|---|---|
| LF-1 | Dark only | `html.dark`, `color-scheme: dark`; no toggle; same in a light-preferring browser. | PW with `colorScheme: "light"`: background luminance stays dark. |
| LF-2 | Glass | Card and chrome read as glass; `backdrop-filter` only on non-rotating chrome. | PW: computed `backdrop-filter` is `none` on `card-front`, `card-back` and their descendants; not `none` on the nav. Gate review. |
| LF-3 | Ambient layer | One soft glow whose hue follows the active card's move; grain; no banding. | PW: the root hue custom property changes when the active card's move changes. Gate review. |
| LF-4 | Rounded, minimal, calm | Large radii, pill controls, nothing extra on screen. | Gate review against `LAYOUT_PLAN.md` wireframes and the Brink references. |
| LF-5 | Safe areas | No content under the notch or home indicator. | PW with emulated insets where possible; MAN on an iPhone. |
| LF-6 | `dvh` | No `vh` units in layout. | CMD: `grep -rn "[0-9]vh" src --include=*.tsx --include=*.css` returns only `dvh`/`svh`/`lvh` matches. |

---

## 15. Content model

| ID | Item | Expected | Verify |
|---|---|---|---|
| CM-1 | Card fields | id, move, cue, trigger, response, breakdown, clip, optional source. | UT (exists): `src/content/content.test.ts`. CMD: `npx tsc --noEmit`. |
| CM-2 | Moves are data | No move label or id string literal in `src/components` or `src/app`. | CMD: grep for each move label and id under `src/components` and `src/app` returns nothing. |
| CM-3 | Seed data | 10 to 15 cards, >= 4 moves, a shared move, exactly one broken clip. | UT (exists). |

---

## 16. Explicitly absent (scope guard)

| ID | Must not exist | Verify |
|---|---|---|
| X-1 | Search, discover or filters on the feed | FD-10. |
| X-2 | Counts, position, streaks, progress, "seen" marks | FD-8, SL-3, N-1. |
| X-3 | Accounts, sign-in, quizzes, recall, ranking, submissions | PW: no `input[type=password]`, no form on `/`; code review. |
| X-4 | Toasts | SV-9. |
| X-5 | Retry button on the clip fallback | PW: `clip-fallback` contains no button. |
| X-6 | Light theme or theme toggle | LF-1. |
| X-7 | Heart on list rows | PW: `saved-row [data-testid="heart"]` count 0. |

---

## 17. Quality gates (commands)

| ID | Check | Command |
|---|---|---|
| Q-1 | Lint | `npm run lint` |
| Q-2 | Types | `npx tsc --noEmit` |
| Q-3 | Unit tests | `npm test` |
| Q-4 | Build | `npm run build` |
| Q-5 | e2e | `npm run e2e` (added in P1-6: builds, starts, runs `node --test e2e/`) |
| Q-6 | Screens | `npm run shots -- <phase>` writes PNGs to `docs/gates/<phase>/` |
