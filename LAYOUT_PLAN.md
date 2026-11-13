# Quipdeck layout plan

Greenfield: there is no baseline to audit. This document fixes structure, order, sizing and behaviour for every screen on phone and desktop. It contains no colour, type or effect values; those come in Phase 2. Decision IDs (D-...) refer to `DESIGN_DECISIONS.md`. Mobbin references are from `docs/research/REFERENCE_BOARD.md`.

Phase 1 builds exactly this in grey boxes. If a wireframe and a decision disagree, the decision wins and this file is corrected.

---

## 1. Screens at a glance

| Screen | The user's job | Primary action | What the eye hits first |
|---|---|---|---|
| Feed, card front | Take in one situation and the move that answers it | Tap the card to reveal | The cue, the largest text in the product |
| Feed, card back | See the real exchange and why it worked | Watch; then swipe on (save if it is a keeper) | The response line (the witty one), then the clip |
| Saved list | Find an exchange again | Tap a row (search when the list is long) | The first group label and its first cue |
| Saved, empty | Understand how things get here | Go and save something (nav is one thumb away) | One line: "Nothing saved yet" |
| Saved, no results | Recover from a search that missed | Clear the search | "No matches" and the clear control |
| Card detail (overlay or pane) | Relive one saved exchange | Watch; unsave if no longer wanted | The cue as title, then the response line |
| Clip fallback | Still get the exchange without the video | None (read on) | The dialogue, unchanged; the clip box is quiet |

---

## 2. Navigation model

Two destinations, **Feed** and **Saved**. Feed is home.

- One component, `AppNav`: a floating glass pill with two segments, each an icon plus label, the current one marked with a capsule and `aria-current="page"`. It is a `<nav aria-label="Primary">` with two links. It never hides, never shows a count.
- **Phone**: fixed, bottom centre, `bottom: calc(env(safe-area-inset-bottom) + 8px)`, height 52 px, about 200 px wide, each segment at least 88 x 44 px. It sits in the natural thumb zone. Ref: Brink floating tab bar ([home](https://mobbin.com/screens/ad3cf0b5-a9b6-4366-a31e-79c35d2a7234)), Blinkist [bar over a card feed](https://mobbin.com/screens/1f6f9b84-3a31-46d7-8af7-3ab7c5914b2a), narrowed to two items.
- **Desktop**: the same pill, fixed, **top centre**, 20 px from the top. Why top: a pointer has no thumb zone and the web convention is top; the bottom edge is reserved for the key hints; and with nav above and hints below, the card sits at the true optical centre. Why not a left rail (board suggestion, after [Threads web](https://mobbin.com/screens/c590c987-4b98-4f8f-b26a-55f34c7a21ac)): a full-height rail for two links is furniture; it pushes the card off centre and spends the calm on chrome.
- Feed to Saved and back keeps the feed exactly as it was: same order, same card, same flips (D-FEED-4, D-FEED-5).
- The detail overlay is part of Saved: `/saved?card=<id>`. Browser Back closes it (D-SAVED-5).

### Route map

| Route | Screen | Render |
|---|---|---|
| `/` | Feed | Static shell (skeleton card), client feed |
| `/saved` | Saved list | Static shell (skeleton rows), client list |
| `/saved?card=<id>` | Saved list + card detail | Same route; detail is client state derived from the URL |
| `/showcase` | Design system showcase (Phase 2) | Static; not linked from the nav; `noindex` |
| anything else | Not found | One line and a link to the feed |
| (error boundary) | Error | One line and a reload button |

### Breakpoints

Two layouts only.

| Name | Condition | Layout |
|---|---|---|
| Phone | viewport width < 1024 px | Bottom nav, full-height portrait card, detail as bottom sheet |
| Desktop | viewport width >= 1024 px | Top nav, landscape card stage, detail as side pane |

Inside the card, layout follows the **card's own width** (container query), not the viewport: `CardBack` is stacked below 720 px of container width and two-column from 720 px. The same component therefore lays itself out correctly everywhere: stacked in the phone feed, the sheet and the desktop pane (capped at 560 px); two-column in the desktop feed and on a phone held in landscape.

Tablets (640 to 1023 px wide) get the phone layout with the card capped at 480 px wide and centred, and the sheet capped at 560 px wide.

---

## 3. Shared sizing rules (phone)

- Heights use `dvh`. Nothing uses `vh`.
- Feed scroller: `position: fixed; inset: 0; height: 100dvh` (D-FEED-1). The body does not scroll on the feed.
- Slide padding: top `calc(env(safe-area-inset-top) + 8px)`; sides `max(8px, env(safe-area-inset-left / right))`; bottom `calc(env(safe-area-inset-bottom) + 68px)` (8 gap + 52 nav + 8 gap).
- The card fills the slide's content box. Max width 480 px (portrait), max height 780 px, centred.
- Minimum touch target 44 x 44 px, 8 px between targets.
- Thumb zone: the nav and the action row (mute, heart) are in the bottom third. The reveal needs no aim at all: the whole card is the target.

### Height budget for the card back (the tightest screen)

Order top to bottom: move tag, trigger (speaker + bubble), response (speaker + bubble), breakdown, clip, action row. The text block (trigger, response, breakdown) is the flexible region: it is `flex: 1; min-height: 0` with its content vertically centred; the tag is pinned to the top and the clip plus action row to the bottom.

Clamp rules (also content rules for the pipeline): trigger line 3 lines max, response line 3 lines max, breakdown 2 lines max. Lines should stay under about 90 characters.

| Element | Normal tier (viewport height > 700 px) | Compact tier (<= 700 px) |
|---|---|---|
| Card padding top / bottom | 16 / 12 | 12 / 8 |
| Move tag | 26 | 24 |
| Gap | 12 | 8 |
| Trigger: speaker label + bubble padding | 16 + 16 | 14 + 12 |
| Gap | 8 | 6 |
| Response: speaker label + bubble padding | 16 + 16 | 14 + 12 |
| Gap | 10 | 8 |
| Gap under breakdown | 12 | 8 |
| Clip (16:9, `min-height: 200px`, F7) | 200 | 200 |
| Gap | 8 | 6 |
| Action row | 44 | 44 |
| **Fixed total** | **412** | **376** |
| Text line height | 20 | 18 |
| Worst case text (3 + 3 + 2 lines) | 160 | 144 |
| **Worst case card height needed** | **572** | **520** |

| Viewport (w x dvh) | Tier | Card height available | Fits worst case |
|---|---|---|---|
| 390 x 844 (standalone, insets 47 / 34) | Normal | 687 | Yes |
| 390 x 664 (iPhone Safari, toolbars showing) | Compact | 588 | Yes |
| 375 x 667 | Compact | 591 | Yes |
| 360 x 640 | Compact | 564 | Yes |
| 375 x 553 (iPhone SE Safari, toolbars showing) | Compact | 477 | Typical content (5 lines, 466) yes; worst case no |

**Guarantee: no inner scrolling at any viewport height of 600 px or more.** Below 600 px in portrait, the text block alone becomes scrollable (`overflow-y: auto`, scroll chaining left on so the feed still advances at its ends). In short landscape (`orientation: landscape` and height < 600 px) the 480 px cap is lifted, the card goes full width, and the container query switches it to the two-column layout, which needs only about 300 px of height.

---

## 4. Feed: card front

Job: take in the cue and the move. Primary action: tap anywhere on the card. Eye: the cue.

Refs: Brink [now playing](https://mobbin.com/screens/e39701ce-59d7-4e7d-890c-ff065f52f620) (one dominant card on an ambient field), TIDE [full-screen quote](https://mobbin.com/screens/33b9e68f-fe96-4f49-bb79-e166ea0809b1) (large text, left-aligned, calm), Tolan [quote card](https://mobbin.com/screens/5369d396-8ca8-43dd-ae76-a63e23c5660a) (small label under the text), Deepstash [tap to reveal](https://mobbin.com/screens/3daab469-5284-4e39-986a-03fe55e8b846) (hint inside the card).

Content order (DOM and visual): cue (`h2`), move label, reveal hint (button). No heart, no mute, no clip, no video icon.

Regions:
1. **Text block**: cue then move label, left-aligned, the pair centred vertically at the optical centre (slightly above the middle). Cue: up to 4 lines, balanced wrap. Move label: directly under the cue, clearly smaller.
2. **Hint**: bottom of the card, centred, inside the card.

### Phone

```
+----------------------------------+  <- top safe area + 8
| +------------------------------+ |
| |                              | |
| |                              | |
| |                              | |
| |  Someone uses a              | |  cue (h2), largest text
| |  figure of speech            | |
| |                              | |
| |  Literal interpretation      | |  move label, smaller
| |                              | |
| |                              | |
| |                              | |
| |                              | |
| |        Tap to reveal         | |  hint (real button)
| +------------------------------+ |
|                                  |  8
|        ( Feed |  Saved )         |  nav pill, 52 high
+----------------------------------+  <- bottom safe area + 8
```

- The whole card is the tap target; the hint button exists for keyboard and screen readers (D-FEED-6).
- Swipe up or down anywhere moves one card (native scroll-snap).

### Desktop

A landscape stage, not a phone column. Why: the back holds a 16:9 clip; desktop has width to give it. A 440 px phone column would keep the clip at phone size in an ocean of empty screen. A landscape card lets the cue be set large on the front and lets the back put words and clip side by side at a size worth watching. The front and back share one card size so the flip is a single object turning over.

Card: width `min(1040px, 100vw - 192px)`, height `min(620px, 100dvh - 176px)`, centred in the viewport (88 px reserved above for the nav, 88 px below for the hints).

```
+----------------------------------------------------------------------------+
|                            ( Feed |  Saved )                               |
|                                                                            |
|     +--------------------------------------------------------------+       |
|     |                                                              |       |
|     |                                                              |  (^)  |
|     |    Someone uses a                                            |       |
|     |    figure of speech                                          |  (v)  |
|     |                                                              |       |
|     |    Literal interpretation                                    |       |
|     |                                                              |       |
|     |    Click to reveal                                           |       |
|     +--------------------------------------------------------------+       |
|                                                                            |
|               Space flip  ·  Up / Down move  ·  S save  ·  M mute          |
+----------------------------------------------------------------------------+
```

- Grid: three columns `1fr auto 1fr`; the card is the middle column; previous / next buttons sit at the start of the right column, 16 px from the card, vertically centred, stacked.
- Cue: left-aligned, generous padding (about 56 px), max measure about 18 characters per line so it breaks into a strong shape. Hint: bottom left, under the same left edge as the cue.
- Key hints: one line, centred, 28 px from the bottom, only for fine pointers (D-FEED-10).
- Wheel and trackpad scroll one card per gesture; keys per D-FEED-7.

---

## 5. Feed: card back

Job: see the exchange and why it worked. Primary action: watch (nothing to press); secondary: heart. Eye: the response bubble, then the clip.

Refs: chat bubbles (Locket [chat](https://mobbin.com/screens/1144d7a0-69bb-467b-aaea-ba803b5a3640), BeReal [chat](https://mobbin.com/screens/2816e84d-5160-4a6e-a655-716055c41da9)): other speaker left and neutral, punchline right and tinted, speaker name above. Video with a single mute control (Me+ [video](https://mobbin.com/screens/b1fe6829-92cc-4ddf-a9fd-b06b1649622f), Liven [player](https://mobbin.com/screens/ea028f4f-9e81-4d6d-b3e6-052d28a36b60)); we move the control off the player (D-CLIP-9). Brink action chips for the row of small glass controls ([now playing](https://mobbin.com/screens/e39701ce-59d7-4e7d-890c-ff065f52f620)).

Content order (DOM): "Back to cue" button (visually hidden until focused), move tag, trigger (speaker, line), response (speaker, line), breakdown, clip, action row (source, mute, heart).

Regions:
1. **Move tag**: top left, small pill.
2. **Exchange**: two lines as a conversation. Trigger: speaker label above, bubble aligned left, max 85% width. Response: speaker label above, bubble aligned right, max 85% width, visually the stronger of the two. Semantics: a list of two items, each "speaker: line".
3. **Breakdown**: one line (two at most) under the exchange, left-aligned, secondary.
4. **Clip**: full inner width, 16:9, `min-height: 200px`, rounded. Nothing on top of it.
5. **Action row**: source (left, secondary, optional); mute then heart (right). The heart is the outermost control, under the right thumb.

### Phone

```
+----------------------------------+
| +------------------------------+ |
| | [Literal interpretation]     | |  move tag
| |                              | |
| | HOST                         | |
| | (I'm so hungry I could   )   | |  trigger, left
| | (eat a horse.            )   | |
| |                        GUEST | |
| |   (I'll call the stables.  ) | |  response, right, stronger
| |   (Do you want it with     ) | |
| |   (fries?                  ) | |
| |                              | |
| | Took 'I could eat a horse'   | |  breakdown
| | at face value                | |
| |                              | |
| | +--------------------------+ | |
| | |                          | | |
| | |        clip 16:9         | | |  autoplays muted, captions, loops
| | |                          | | |
| | +--------------------------+ | |
| | Placeholder      (mute) (<3) | |  action row: source · mute · heart
| +------------------------------+ |
|        ( Feed |  Saved )         |
+----------------------------------+
```

- Tap anywhere on the card except buttons and the clip flips back. A tap inside the clip pauses or resumes it (native player behaviour).
- Sizes per the height budget in section 3.
- The swipe to the next card works from anywhere, including over the clip.

### Desktop

Two columns (card container >= 720 px): words left, clip right. The eye reads the exchange, then moves right to see it happen.

```
+----------------------------------------------------------------------------+
|                            ( Feed |  Saved )                               |
|                                                                            |
|     +--------------------------------------------------------------+       |
|     |  [Literal interpretation]                                    |       |
|     |                              +----------------------------+  |  (^)  |
|     |  HOST                        |                            |  |       |
|     |  (I'm so hungry I could )    |                            |  |  (v)  |
|     |  (eat a horse.          )    |         clip 16:9          |  |       |
|     |                     GUEST    |                            |  |       |
|     |    (I'll call the stables.)  |                            |  |       |
|     |    (Do you want it with  )   +----------------------------+  |       |
|     |    (fries?               )   Placeholder       (mute) (<3)   |       |
|     |                                                              |       |
|     |  Took 'I could eat a horse' at face value                    |       |
|     +--------------------------------------------------------------+       |
|                                                                            |
|               Space flip  ·  Up / Down move  ·  S save  ·  M mute          |
+----------------------------------------------------------------------------+
```

- Grid inside the card: `minmax(0, 5fr) minmax(0, 7fr)`, gap 40 px, padding 40 px. Left column: tag pinned top, exchange centred, breakdown pinned bottom. Right column: clip and action row as one block, vertically centred.
- At 1024 x 768 the card is 832 x 592 and the clip about 415 x 233. At 1440 x 900 the card is 1040 x 620 and the clip about 537 x 302.
- Click anywhere on the card except buttons and the clip flips back.

---

## 6. Clip states (inside the card back and the detail view)

The clip box never changes size between states, so nothing around it moves.

```
 idle / loading            playing                   error (fallback)
+----------------------+  +----------------------+  +----------------------+
|                      |  |                      |  |                      |
|   (quiet skeleton)   |  |    YouTube player    |  |         (!)          |
|                      |  |    captions on       |  |   Clip unavailable   |
|                      |  |                      |  | The exchange is all  |
|                      |  |                      |  |        here.         |
+----------------------+  +----------------------+  +----------------------+
 source   (mute) (<3)      source   (mute) (<3)      source          (<3)
```

The fallback in place, phone and desktop. Everything except the inside of the clip box and the missing mute button is identical to the playing state.

```
 phone, card back, clip failed          desktop, card back, clip failed
+----------------------------------+   +--------------------------------------------------+
| +------------------------------+ |   | [Mock seriousness]                               |
| | [Mock seriousness]           | |   |                       +------------------------+ |
| |                              | |   | HOST                  |                        | |
| | HOST                         | |   | (trigger line      )  |          (!)           | |
| | (trigger line             )  | |   |               GUEST   |    Clip unavailable    | |
| |                        GUEST | |   |   (response line   )  |  The exchange is all   | |
| |   (response line           ) | |   |                       |         here.          | |
| |                              | |   |                       +------------------------+ |
| | breakdown line               | |   |                       Placeholder         (<3)   |
| |                              | |   | breakdown line                                   |
| | +--------------------------+ | |   +--------------------------------------------------+
| | |           (!)            | | |
| | |     Clip unavailable     | | |
| | | The exchange is all here.| | |
| | +--------------------------+ | |
| | Placeholder             (<3) | |
| +------------------------------+ |
|        ( Feed |  Saved )         |
+----------------------------------+
```

- Loading: the box is a skeleton until the player reports ready; the player then fades in (no fade under reduced motion).
- Error: reached by player error, script failure or an 8 s ready timeout (D-CLIP-8). The message is centred in the box. The mute button is removed; the heart does not move (it is right-anchored). The move tag, both lines and the breakdown are exactly as before. Ref: Grok [video error pill](https://mobbin.com/screens/fe248bef-19ec-4f49-b83b-0096463a9c65): keep the frame, say it plainly, leave the rest of the screen working.
- Phone and desktop differ only in the size of the box.

---

## 7. Saved list

Job: find an exchange again. Primary action: tap a row. Eye: first group label and first cue.

Refs: Brink [grouped inset list with small section label](https://mobbin.com/screens/9129b7d7-485d-4e8e-bf7a-d8aa158f9f28), X [bookmarks, full-width search pill](https://mobbin.com/screens/917d38af-a1b1-4875-81eb-b554f18b183c), Brink [library header](https://mobbin.com/screens/1f1b08f2-c1d0-4c0d-a512-ff245eb6bfdd). Alexa and LinkedIn group counts are noted and rejected (scope guard).

Content order (DOM): `h1` "Saved", search field, then per group: `h2` move label, list of rows. Each row: cue (one line), response line (up to two lines).

### Phone, populated

```
+----------------------------------+
|                                  |  top safe area + 16
|  Saved                           |  h1
|                                  |
|  ( Q  Search saved            )  |  search, 48 high, sticky at top
|                                  |
|  Escalation                      |  group label (h2), A to Z
|  +----------------------------+  |
|  | Someone mentions a small.. |  |  row: cue, one line
|  | Five minutes? Call the     |  |       response, up to two lines
|  | historians. Wars have st.. |  |
|  |----------------------------|  |
|  | Someone proudly states a.. |  |
|  | Bold. Then the hallway,    |  |
|  | then the nation.           |  |
|  +----------------------------+  |
|                                  |
|  Literal interpretation          |
|  +----------------------------+  |
|  | Someone uses a figure of.. |  |
|  | I'll call the stables. Do  |  |
|  | you want it with fries?    |  |
|  +----------------------------+  |
|                                  |
|        ( Feed |  Saved )         |  nav floats over the list
+----------------------------------+
```

- One column, 16 px side padding, max width 560 px centred on tablets.
- The page scrolls normally. The search field is sticky under the top safe area; the title scrolls away.
- Bottom padding `calc(env(safe-area-inset-bottom) + 84px)` so the last row clears the nav.
- Row height is content-driven, minimum 64 px; the whole row is the target.
- While searching, groups with no match disappear; the remaining groups keep their A to Z order.

### Phone, empty and no results

```
 empty (nothing saved)               no results (search missed)
+----------------------------------+ +----------------------------------+
|  Saved                           | |  Saved                           |
|                                  | |  ( Q  zzz                    x ) |
|                                  | |                                  |
|                                  | |                                  |
|              (heart)             | |                                  |
|        Nothing saved yet         | |           No matches             |
|   Tap the heart on a card to     | |      Try a different word.       |
|          keep it here.           | |        [ Clear search ]          |
|                                  | |                                  |
|                                  | |                                  |
|        ( Feed |  Saved )         | |        ( Feed |  Saved )         |
+----------------------------------+ +----------------------------------+
```

- Empty: no search field (nothing to search). Icon, one title, one helper line, centred in the space between the title and the nav. No button: the nav is right there. Ref: Brink [Starred empty](https://mobbin.com/screens/0b90af96-2b9f-472f-9256-34f6aef4f20c), [Saved Articles empty](https://mobbin.com/screens/63476c8d-0a77-41a7-90c8-de4066c6a751).
- No results: the search field stays, with its clear button. Title, helper, and one text button "Clear search" (the recovery action). Announced politely to screen readers.
- Loading (saves not yet read): three skeleton rows in one group, no title change, no empty state (D-SAVE-2).

### Desktop: master and detail

Not an overlay. Desktop has room to show the list and the card together, so choosing a row never hides the list, and comparing two saved exchanges is one click each. Ref: the two-pane idea from the board's desktop section; Threads [web](https://mobbin.com/screens/c590c987-4b98-4f8f-b26a-55f34c7a21ac) for a centred content column with a second column beside it.

```
+----------------------------------------------------------------------------+
|                            ( Feed |  Saved )                               |
|                                                                            |
|   Saved                          +-------------------------------------+   |
|   ( Q  Search saved          )   |                                     |   |
|                                  |                                     |   |
|   Escalation                     |                                     |   |
|   +--------------------------+   |      Choose a card to replay it.    |   |
|   | Someone mentions a sma.. |   |                                     |   |
|   | Five minutes? Call the.. |   |                                     |   |
|   |--------------------------|   |                                     |   |
|   | Someone proudly states.. |   |                                     |   |
|   | Bold. Then the hallway.. |   |                                     |   |
|   +--------------------------+   |                                     |   |
|                                  |                                     |   |
|   Literal interpretation         |                                     |   |
|   +--------------------------+   +-------------------------------------+   |
+----------------------------------------------------------------------------+
```

- Container: max width 1200 px, centred, 24 px side padding, 88 px top (nav).
- Grid: `400px minmax(0, 1fr)`, gap 32 px. Left: title, search (sticky), groups; this column scrolls. Right: detail pane, sticky, height `100dvh - 112px`.
- Nothing selected: the pane shows one quiet line. Nothing is auto-selected (D-SAVED-7).
- The selected row is marked (`aria-current="true"`).

### Desktop, empty and no results

```
 empty (nothing saved): no search, no pane, message centred in the container
+----------------------------------------------------------------------------+
|                            ( Feed |  Saved )                               |
|                                                                            |
|   Saved                                                                    |
|                                                                            |
|                                                                            |
|                                 (heart)                                    |
|                            Nothing saved yet                               |
|                 Tap the heart on a card to keep it here.                   |
|                                                                            |
|                                                                            |
+----------------------------------------------------------------------------+

 no results (search missed): message in the list column, pane unchanged
+----------------------------------------------------------------------------+
|                            ( Feed |  Saved )                               |
|                                                                            |
|   Saved                          +-------------------------------------+   |
|   ( Q  zzz                  x )  |                                     |   |
|                                  |                                     |   |
|                                  |                                     |   |
|           No matches             |      Choose a card to replay it.    |   |
|      Try a different word.       |      (or the card already open)     |   |
|        [ Clear search ]          |                                     |   |
|                                  |                                     |   |
|                                  +-------------------------------------+   |
+----------------------------------------------------------------------------+
```

- Empty: the two-pane grid is not rendered at all. Title top left as usual; icon, title and helper centred in the container, both axes. The copy says "Tap" on coarse pointers and "Click" on fine pointers (same CSS swap as the hint, D-FEED-6).
- No results: the list column keeps the title and the search field (with its clear button) and shows the message where the groups were. The pane keeps whatever it was showing: the placeholder, or the open card (a search does not close a card the user is watching).

---

## 8. Card detail: overlay (phone) and pane (desktop)

Job: relive one saved exchange. Primary action: watch; secondary: unsave. Eye: the cue as title, then the response.

Refs: Brink [glass sheet with grabber](https://mobbin.com/screens/043b02a2-60d0-4478-bb09-6e537a2a6e17), Brink [dark queue sheet](https://mobbin.com/screens/ed165a51-c365-4165-a3e2-c6c5f74ddf47): the list stays visible above the sheet, the sheet carries a grabber, a title and one round button.

Content order (DOM): close button (overlay only), cue as title (`h2`), then `CardBack` content: move tag, trigger, response, breakdown, clip, action row. It does not flip (D-SAVED-6).

### Phone: bottom sheet

```
+----------------------------------+
|  Saved                           |  list, dimmed, inert
|  ( Q  Search saved            )  |
+==================================+  sheet top, rounded
|               ====               |  grabber (drag down to dismiss)
|  Someone uses a figure      (x)  |  cue as title; close, 44
|  of speech                       |
|                                  |
|  [Literal interpretation]        |
|  HOST                            |
|  (I'm so hungry I could eat  )   |
|  (a horse.                   )   |
|                          GUEST   |
|     (I'll call the stables. Do ) |
|     (you want it with fries?   ) |
|  Took 'I could eat a horse' at   |
|  face value                      |
|  +----------------------------+  |
|  |         clip 16:9          |  |
|  +----------------------------+  |
|  Placeholder        (mute) (<3)  |
+----------------------------------+  bottom safe area inside the sheet
```

- Sheet: anchored to the bottom, height fits content up to `92dvh`, top corners rounded, bottom padding `env(safe-area-inset-bottom) + 12px`. It covers the nav (modal). If content exceeds 92dvh the sheet body scrolls.
- Dismiss: close button, Escape, tap on the dimmed list, drag down on the grabber strip, browser Back. Focus returns to the row.
- Max width 560 px, centred, on tablets.
- The clip plays here under the same rules as the feed; the feed's player was already destroyed when the feed was hidden.
- Unsave leaves the sheet open with the heart off (D-SAVE-6).

### Desktop: detail pane

```
+----------------------------------------------------------------------------+
|                            ( Feed |  Saved )                               |
|                                                                            |
|   Saved                          +-------------------------------------+   |
|   ( Q  Search saved          )   |  Someone uses a figure of speech    |   |
|                                  |  [Literal interpretation]           |   |
|   Escalation                     |                                     |   |
|   +--------------------------+   |  HOST                               |   |
|   | Someone mentions a sma.. |   |  (I'm so hungry I could eat a   )   |   |
|   | Five minutes? Call the.. |   |  (horse.                        )   |   |
|   +--------------------------+   |                           GUEST     |   |
|                                  |      (I'll call the stables. Do  )  |   |
|   Literal interpretation         |      (you want it with fries?    )  |   |
|   +--------------------------+   |  Took '...' at face value           |   |
|   |[Someone uses a figure ..]|   |  +-------------------------------+  |   |
|   |[I'll call the stables...]|   |  |           clip 16:9           |  |   |
|   +--------------------------+   |  +-------------------------------+  |   |
|                                  |  Placeholder          (mute) (<3)   |   |
|                                  +-------------------------------------+   |
+----------------------------------------------------------------------------+
```

- Non-modal region. The list stays live; clicking another row swaps the card (and its clip). Escape clears the selection.
- Inside the pane the card is **always the stacked `CardBack`**, centred, max width 560 px, at every desktop width. The list already takes 400 px, so a stacked card gives a larger clip (up to 528 px wide) than two columns squeezed into the pane would. The 560 px cap keeps the card's container under the 720 px threshold, so the container query does this with no special case.
- Selections use `replaceState`, so browser Back leaves Saved in one step (D-SAVED-5). The pane body scrolls if a card is taller than the pane.

---

## 9. Loading, error and odd states (layout only)

| State | Layout |
|---|---|
| Feed before the client has shuffled | One skeleton card at the exact size and position of a real card; nav present; no text. |
| Feed with zero cards (defensive) | Centred single line "No cards yet." in place of the card. |
| Saved before saves are read | Title, three skeleton rows. No search field yet. |
| Not found | Centred: one line and a link "Go to the feed". Nav present. |
| Error boundary | Centred: one line and a "Reload" button. |
| Reduced motion | Identical layout. Flip becomes a crossfade; nothing drifts, pulses or shimmers. |
| Offline after load | Feed and Saved work (content is bundled, saves are local). Clips show the fallback after the 8 s timeout. |
| Storage blocked | Identical layout. Saves last for the visit. |

---

## 10. What Phase 1 must prove at Gate 1

1. Every wireframe above exists at real routes with real seed content, in grey boxes, at 390 x 844, 375 x 667 and 1440 x 900.
2. The back of the card fits without inner scroll at 375 x 667 and 360 x 640 for the longest seed card.
3. The desktop card is a landscape stage and the desktop Saved is two panes; neither is the phone layout scaled up.
4. Nav is bottom centre on phone, top centre on desktop, and never moves.
5. The clip box does not change size between loading, playing and error.
6. The desktop Saved pane shows a stacked card at 1440 x 900 and at 1024 x 768.
