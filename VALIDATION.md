# Quipdeck validation (P5-3)

All results come from one run on the tree at commit `a2eb838` (branch `claude/epic-volta-ez6fjc`). That run came after the last source change, in a Linux sandbox using headless Chromium from Playwright. Clip behaviour is tested against the stubbed YouTube IFrame API (D-TEST-2). Real playback is a device check and appears in the MAN list below.

## 1. Commands

| Command | Result |
|---|---|
| `npm run lint` | pass: 0 errors, 3 warnings (two unused variables and one unused disable directive, all in `e2e/a11y.test.cjs`) |
| `npx next typegen` | pass ("Types generated successfully") |
| `npx tsc --noEmit` | pass (no output) |
| `npm test` (vitest) | pass: 105 tests in 8 files |
| `npm run build` | pass. Route table: `○ /`, `○ /_not-found`, `○ /saved`, `○ /showcase`, all static (prerendered), with Partial Prefetching enabled |
| `npm run e2e` | pass: 176/176, 0 fail, 0 skipped (the 13 files in `e2e/`, `a11y.test.cjs` included: 147 inventory tests plus 29 accessibility tests) |
| `node --test e2e/a11y.test.cjs` | pass: 29/29. axe finds 0 serious or critical violations and prints no moderate findings. A-9 is now green |
| `node scripts/contrast.cjs` | exit 0, "contrast ok". Lowest enforced ratio: **4.66:1** (`fg-secondary` on `glass-control` on a card face, floor 4.5). `fg-tertiary` on the bubbles (3.93, 3.97) is barred by design: no such pairing is used |
| `npm run shots -- final` | pass: 49 PNGs in `docs/gates/final/`, with a saved-bottom nav gap of 23.8 px |

The QG chain (`lint && typegen && tsc && test && build`) passes.

## 2. Fixes in this pass

- **A-9, "Back to cue" (`flip-back`).** The hit box is now 115 x 44; it was 107 x 36. A 5 px transparent border replaces the 1 px one. The fill and the inset glass shadows stop at the padding box, the box moves up and left by 4 px, and the focus ring is pulled in by 4 px. The painted pill and its ring land on the same pixels as before (checked against a 2x baseline). The button is absolutely placed, so layout does not change. CB-8 passes at 375x667 and 360x640 for all 14 cards, and FL-9 and KB-8 still pass. The change is in `src/components/card/card-back.tsx`.
- **D-SAVED-9.** DESIGN_SYSTEM section 10 now lists Clear search as `quiet pill` (44 px), and it notes the 44 px hit box on "Back to cue".
- **Final-gate note, saved-bottom 390.** I recorded a video of the saved list scrolling under the stuck search, plus 6 mid-scroll frames: `docs/gates/final/saved-scroll-390x844.webm` and `saved-scroll-1..6-390x844.png`. With the 16 px fade, the clipped text of the emerging card stayed legible right against the pill's lower edge, and the card's top edge met the pill. That read as attached. The fade is now stronger: 28 px instead of 16 px, eased to 60% at 14 px, with the same `--surface-base-top` colour. There is no divider and no token change (`src/components/saved/saved-search.tsx`). Trade-off: right after the search sticks, the first group tag is slightly dimmed.

## 3. Final pack

`docs/gates/final/` holds 8 states x 3 viewports (390x844, 375x667, 1440x900) in normal motion and the same 24 under reduced motion. It also holds `saved-bottom-390x844.png` and the scroll video and frames listed above. Gate shots use the clip stub, so a healthy clip appears as a labelled frame.

## 4. Inventory results

Results are "pass (N e2e tests)" when the e2e spec output has N passing tests named with that id. MAN means a manual check on a real device (section 5).

| ID | Item | Result |
|---|---|---|
| R-1 | `/` | pass (3 e2e tests) |
| R-2 | `/saved` | pass (3 e2e tests) |
| R-3 | `/saved?card=<id>` | pass (1 e2e test) |
| R-4 | Not found | pass (1 e2e test) |
| R-5 | Error boundary | MAN, plus code review: `src/app/error.tsx` renders one line and a Reload button. Not scripted (no dev-only throw scenario). |
| R-6 | `/showcase` (Phase 2) | pass (1 e2e test) |
| R-7 | Metadata | pass (1 e2e test) |
| N-1 | Two destinations | pass (1 e2e test) |
| N-2 | Current marker | pass (1 e2e test) |
| N-3 | Phone placement | pass (1 e2e test) |
| N-4 | Desktop placement | pass (1 e2e test) |
| N-5 | Nav never moves | pass (1 e2e test) |
| N-6 | Feed state survives a visit to Saved | pass (1 e2e test) |
| N-7 | Keyboard reachable | pass (1 e2e test) |
| FD-1 | One card per viewport | pass (1 e2e test) |
| FD-2 | Swipe up moves one card | pass (4 e2e tests) |
| FD-3 | Shuffled order | pass (1 e2e test) |
| FD-4 | No hydration mismatch | pass (1 e2e test) |
| FD-5 | Loading state | pass (1 e2e test) |
| FD-6 | Order stable within the visit | pass (1 e2e test) |
| FD-7 | Reload is a new visit | pass (1 e2e test) |
| FD-8 | Finite deck | pass (1 e2e test) |
| FD-9 | Empty deck (defensive) | pass by code review: `src/components/feed/feed.tsx` renders "No cards yet." when the order is empty (seed data is never empty, so no script). |
| FD-10 | No search or discover on the feed | pass (1 e2e test) |
| FD-11 | Scroll position after Activity | pass (1 e2e test) |
| CF-1 | Cue, top and large | pass (1 e2e test) |
| CF-2 | Move below, smaller | pass (1 e2e test) |
| CF-3 | Hint | pass (1 e2e test) |
| CF-4 | No video icon, no heart, no mute, no clip | pass (1 e2e test) |
| CF-5 | Phone layout | pass (1 e2e test) |
| CF-6 | Desktop layout | pass (1 e2e test) |
| FL-1 | Tap flips | pass (2 e2e tests) |
| FL-2 | Tap again flips back | pass (1 e2e test) |
| FL-3 | Heart does not flip | pass (1 e2e test) |
| FL-4 | Mute does not flip | pass (1 e2e test) |
| FL-5 | Clip does not flip | pass (1 e2e test) |
| FL-6 | Flip state persists while scrolling | pass (1 e2e test) |
| FL-7 | Hidden face is inert | pass (1 e2e test) |
| FL-8 | Keyboard flip | pass (2 e2e tests) |
| FL-9 | Buttons for assistive tech | pass (1 e2e test) |
| FL-10 | Motion | pass (1 e2e test) |
| FL-11 | Reduced motion | pass (2 e2e tests) |
| FL-12 | Selecting text does not flip | pass (1 e2e test) |
| CB-1 | Move tag at the top | pass (1 e2e test) |
| CB-2 | Exchange as dialogue | pass (1 e2e test) |
| CB-3 | Response reads as the punchline | pass (1 e2e test) |
| CB-4 | Breakdown | pass (1 e2e test) |
| CB-5 | Clip below, on every card | pass (1 e2e test) |
| CB-6 | Heart and mute | pass (1 e2e test) |
| CB-7 | Source | pass (1 e2e test) |
| CB-8 | Fits one viewport on phone | pass (2 e2e tests) |
| CB-9 | Desktop two columns | pass (2 e2e tests) |
| CB-10 | Clip minimum size | pass (1 e2e test) |
| CL-1 | Plays only on the active, flipped card | pass (1 e2e test) |
| CL-2 | IFrame API with the right parameters | pass (1 e2e test) |
| CL-3 | Autoplays muted | pass (1 e2e test) |
| CL-4 | Captions requested | pass (1 e2e) (`cc_load_policy=1` is requested, against the stub). MAN: captions visible on a real captioned clip. |
| CL-5 | Loop between start and end | pass (1 e2e test) |
| CL-6 | One clip at a time | pass (1 e2e test) |
| CL-7 | Stops when scrolled away | pass (1 e2e test) |
| CL-8 | Stops when flipped back | pass (1 e2e test) |
| CL-9 | Resumes on return | pass (1 e2e test) |
| CL-10 | Stops when leaving the feed | pass (1 e2e test) |
| CL-11 | Mute toggle | pass (1 e2e test) |
| CL-12 | Unmute persists for the visit | pass (1 e2e) against the stub (next card and the Saved detail). MAN on iOS Safari (risk R2). |
| CL-13 | Blocked unmute degrades honestly | pass (1 e2e test) |
| CL-14 | Loading state | pass (2 e2e tests) |
| CL-15 | Fallback on player error | pass (1 e2e test) |
| CL-16 | Fallback when the API cannot load | pass (1 e2e test) |
| CL-17 | Fallback on timeout | pass (1 e2e test) |
| CL-18 | Fallback keeps layout | pass (1 e2e test) |
| CL-19 | Nothing over the player | pass (1 e2e test) |
| CL-20 | Keyboard survives a click in the clip | pass (1 e2e test) |
| CL-21 | Privacy | pass (1 e2e test) |
| CL-22 | Real playback | MAN: real autoplay, loop, captions and unmute on devices (the sandbox returns error 150). |
| SV-1 | Heart toggles save | pass (1 e2e test) |
| SV-2 | Stored on device | pass (1 e2e test) |
| SV-3 | Survives reload | pass (1 e2e test) |
| SV-4 | No accounts, no network | pass (1 e2e test) |
| SV-5 | Hydration-safe | pass (1 e2e test) |
| SV-6 | Storage unavailable | pass (1 e2e test) |
| SV-7 | Cross-tab | pass (1 e2e test) |
| SV-8 | Keyboard | pass (2 e2e tests) |
| SV-9 | Announcement | pass (1 e2e test) |
| SL-1 | Grouped by move, A to Z | pass (1 e2e test) |
| SL-2 | Row content | pass (1 e2e test) |
| SL-3 | No counts | pass (1 e2e test) |
| SL-4 | Search covers all fields | pass (1 e2e test) |
| SL-5 | Search is live and case-insensitive | pass (1 e2e test) |
| SL-6 | Search only searches saved cards | pass (1 e2e test) |
| SL-7 | Empty groups hidden while searching | pass (1 e2e test) |
| SL-8 | Clear search | pass (1 e2e test) |
| SL-9 | Empty state | pass (1 e2e test) |
| SL-10 | No-results state | pass (1 e2e test) |
| SL-11 | Loading state | pass (1 e2e test) |
| SL-12 | Order inside a group | pass (1 e2e test) |
| SL-13 | Phone layout | pass (1 e2e test) |
| SL-14 | Desktop layout | pass (1 e2e test) |
| SL-15 | Keyboard | pass (1 e2e test) |
| SL-16 | Search state survives a visit to the feed | pass (1 e2e test) |
| OV-1 | Tapping a row opens the full card | pass (1 e2e test) |
| OV-2 | URL reflects the detail | pass (1 e2e test) |
| OV-3 | Close paths (phone) | pass (5 e2e tests) |
| OV-4 | Focus trap and scroll lock (phone) | pass (1 e2e test) |
| OV-5 | Dialog name | pass (1 e2e test) |
| OV-6 | Clip plays in the detail | pass (1 e2e test) |
| OV-7 | Unsave from the detail | pass (1 e2e test) |
| OV-8 | Unsaving the last card | pass (1 e2e test) |
| OV-9 | Does not flip | pass (1 e2e test) |
| OV-10 | Desktop pane | pass (2 e2e tests) |
| OV-11 | Desktop Back | pass (1 e2e test) |
| OV-12 | Fallback in the detail | pass (1 e2e test) |
| OV-13 | Sheet height | pass (1 e2e test) |
| KB-1 | Next and previous | pass (1 e2e test) |
| KB-2 | Flip | pass (1 e2e test) |
| KB-3 | Save | pass (1 e2e test) |
| KB-4 | Mute | pass (2 e2e tests) |
| KB-5 | Ignored contexts | pass (1 e2e test) |
| KB-6 | Inactive cards are inert | pass (1 e2e test) |
| KB-7 | Focus follows navigation | pass (1 e2e test) |
| KB-8 | Visible focus | pass (1 e2e test) |
| KB-9 | Desktop previous / next buttons | pass (1 e2e test) |
| KB-10 | Key hints | pass (2 e2e tests) |
| A-1 | Contrast AA | pass (1 e2e test) |
| A-2 | axe clean | pass (14 e2e tests) |
| A-3 | Landmarks and headings | pass (1 e2e test) |
| A-4 | Names | pass (3 e2e tests) |
| A-5 | Reduced motion | pass (2 e2e tests) |
| A-6 | Reduced transparency | pass (1 e2e test) |
| A-7 | Pause mechanism | pass (1 e2e) for flip back (CL-8). MAN: native tap-to-pause on the clip. |
| A-8 | Zoom | pass (1 e2e test) |
| A-9 | Touch targets | pass (3 e2e tests) |
| LF-1 | Dark only | pass (2 e2e tests) |
| LF-2 | Glass | pass (1 e2e test) |
| LF-3 | Ambient layer | pass (1 e2e test) |
| LF-4 | Rounded, minimal, calm | Gate review: Gates 1 to 4 approved; final pack in `docs/gates/final/`. |
| LF-5 | Safe areas | MAN on an iPhone (needs real insets). |
| LF-6 | `dvh` | pass (CMD: the `vh` grep returns 0 non-`dvh`/`svh`/`lvh` matches). |
| CM-1 | Card fields | pass (UT `src/content/content.test.ts`; `npx tsc --noEmit` clean). |
| CM-2 | Moves are data | pass for product screens (no move id or label literal in `src/app` routes or `src/components` outside the showcase). Note: the design-system showcase (`src/components/showcase/showcase.tsx`) passes the ids `escalation` and `callback` to `moveHueStyle` as hue swatches. |
| CM-3 | Seed data | pass (UT: 14 cards, 10 moves, shared moves, one broken clip `c14`). |
| X-1 | Search, discover or filters on the feed | pass (1 e2e test) |
| X-2 | Counts, position, streaks, progress, "seen" marks | pass (1 e2e test) |
| X-3 | Accounts, sign-in, quizzes, recall, ranking, submissions | pass (1 e2e test) |
| X-4 | Toasts | pass (1 e2e test) |
| X-5 | Retry button on the clip fallback | pass (1 e2e test) |
| X-6 | Light theme or theme toggle | pass (1 e2e test) |
| X-7 | Heart on list rows | pass (1 e2e test) |
| Q-1 | Lint | pass (0 errors, 3 warnings in `e2e/a11y.test.cjs`). |
| Q-2 | Types | pass. |
| Q-3 | Unit tests | pass (105 tests, 8 files). |
| Q-4 | Build | pass (4 static routes). |
| Q-5 | e2e | pass (176/176). |
| Q-6 | Screens | pass (`npm run shots -- final`: 49 PNGs). |

## 5. MAN list (run on real devices before release)

Setup. On a computer on the same Wi-Fi as the phones, run `npm run build && npx next start -H 0.0.0.0 -p 3000`, then open `http://<computer LAN IP>:3000` on each device. A deployed HTTPS URL also works, and some iOS features need HTTPS. Use a fresh private tab for each run, because a reload starts a new visit. The feed order is shuffled on each visit. To find a card, scroll until its cue shows, then tap the card to flip it.

**M-1. iOS Safari playback (CL-22, CL-4, CL-12, R2).** Use an iPhone on current iOS with the ringer on.
1. Open `/` and tap the first card. The back shows, and within about 2 s the clip plays muted inline (not fullscreen), with captions visible when the clip has them.
2. Let the clip reach its end. It loops without user action.
3. Tap the mute button (speaker icon, bottom right). Sound plays and the button now reads "Mute".
4. Tap the dialogue text on the back (not the clip or a button) to flip back, swipe up to the next card, and tap it. Once the next clip plays, it has sound and the button still reads "Mute": unmute persists for the visit. If iOS pauses the clip or forces it muted, the button must say "Unmute" and the clip must keep playing muted. Record which case you see.
5. Tap Saved, open any saved card, and check that its clip is also unmuted.
6. Reload the page. The new visit starts muted.

**M-2. Android Chrome playback.** Repeat M-1 steps 1 to 6 on a current Android phone in Chrome.

**M-3. Tap-to-pause with reduced motion on (Gate 1 ruling 3, A-7).**
1. iOS: Settings > Accessibility > Motion > Reduce Motion on. Android: Settings > Accessibility > Remove animations on.
2. Open `/` and flip a card. The card crossfades without rotating, and the clip still autoplays muted.
3. Tap inside the clip. It pauses. Tap again and it resumes. Flip back, and the clip stops (its frame is removed).
4. If the tap does not pause the clip on iOS, report it to the lead. The ruling then requires that, under reduced motion, the clip is cued without autoplay.

**M-4. Trackpad momentum paging (D-FEED-12).** Use a MacBook in Safari and in Chrome at 1440 wide or larger.
1. With the pointer over the card, but not over a playing clip, make one firm two-finger swipe. The feed moves exactly one card and snaps, and momentum does not skip a card.
2. Make a slow swipe. It still snaps to one card.
3. With the pointer over a playing clip, swipe. The feed does not page (known limit, section 6). Keys, the previous and next buttons, and wheeling elsewhere still page.

**M-5. Safe areas (LF-5).** Use an iPhone with a notch or Dynamic Island, in portrait, with Safari and also with the page added to the Home Screen.
1. On `/`, no card content sits under the status bar or the home indicator, and the nav pill sits clear of the home indicator.
2. On `/saved`, scroll down. The stuck search sits below the status bar, and the band behind it covers the status-bar strip. The last row clears the nav.
3. Open a saved card. The detail sheet's bottom content clears the home indicator.

**M-6. Hues side by side (Gate 3 carry-over).** Use the iPhone and the Android phone at full brightness, then again at about 50%.
1. In a fresh tab, save these four cards in this order, using the heart on each card's back: "Someone mentions a small inconvenience" (Escalation, hue 170), "Someone describes a disaster" (Understatement, 205), "A trivial matter comes up" (Mock seriousness, 245; its clip shows the fallback, which is expected), and "Someone uses a figure of speech" (Literal interpretation, 275).
2. Open Saved. The Escalation and Understatement groups sit next to each other, and so do Mock seriousness and Literal interpretation. Within each pair, the tags must read as clearly different colours (jade against lagoon, cobalt against iris), not as the same colour twice.
3. Optional: flip each card in the feed. The glow behind the card must also tell the hues apart.

**M-7. Error boundary (R-5).** This is not scripted. To check it in development, throw from a page component temporarily. The screen must show one line, "Something went wrong.", and a "Reload" button that recovers. Revert the throw afterwards.

## 6. Known limits

- **Sandbox YouTube error 150.** In this sandbox every video, valid ids included, ends in `onError` 150 (F4). All clip behaviour is therefore verified against the stubbed IFrame API (D-TEST-2), and real playback is MAN (M-1, M-2). The fallback path is real and fires live.
- **Wheel over a playing clip (D-FEED-12).** The cross-origin YouTube iframe consumes wheel events, so wheeling over a playing clip does not page. A forwarding overlay would break the no-overlay rule on the player (F7), so this is accepted as a limit. Keys, the previous and next buttons, and wheeling elsewhere on the stage still page.
- **Placeholder content.** `src/content/cards.ts` is placeholder seed data (14 cards and 10 moves, with generic speakers and original lines). Clips reuse 5 public videos that are not matched to the dialogue, and card `c14` is the deliberately broken clip. Real content comes from the content pipeline, which must verify that each clip is embeddable and captioned (R7).
- **Single engine.** All automated checks run in Chromium. Safari rendering of the flip and of an iframe near 3D transforms (R4) is covered only by M-1 and M-5.
- **Lint warnings.** There are 3 warnings in `e2e/a11y.test.cjs`, a file owned by the accessibility suite. None are errors.
- **CM-2 note.** The design-system showcase (`/showcase`) passes two move ids to `moveHueStyle` as hue swatches. The product screens contain no move literals.
