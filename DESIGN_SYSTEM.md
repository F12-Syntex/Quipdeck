# Quipdeck design system

**Frozen after P3-2.** Changes go through the lead to the design system owner.

Owner: design system owner (P2-1, P3-2). Source of truth: `src/app/globals.css` (tokens, recipes, ambient layer), `src/lib/move-hue.ts` (hue), `src/components/ui/motion.ts` (JS motion), `src/components/ui/*` (primitives). Decisions: `DESIGN_DECISIONS.md` D-THEME-1..5, D-FLIP-1..3.

Direction: dark only, calm, rounded, glass. One signature idea, "one pane of glass, lit from behind": a still, near-black field with one soft glow tinted by the active move, a static grain, and glass that catches light at its rim. Nothing is loud and nothing moves without a reason.

Screens use the tokens below, not raw colours. A lane that needs a new token or variant asks the lead, who sends it to the design system owner.

---

## 1. Surfaces

| Token | Value | Purpose | Used by |
|---|---|---|---|
| `--surface-base` | `oklch(0.165 0.006 270)` = `#0d0e11` | Page canvas (on `<html>`), `themeColor`, `bg-background` | Every route; Saved sticky search backing until P4-5 |
| `--surface-base-top` / `--surface-base-bottom` | `oklch(0.19 …)` / `oklch(0.135 …)` | Barely perceptible vertical gradient of the ambient base | Ambient layer |
| `--surface-raised` | `oklch(0.235 0.008 270)` | Solid raised fill; shadcn `--card`, `--sidebar` | Fallback fills |
| `--surface-scrim` | `oklch(0.08 0.004 270 / 0.6)` | Dims the page behind a modal | Drawer (detail sheet) backdrop |
| `--hairline` | white 10% | Dividers, `border-border` | Saved row dividers |

Utilities: `bg-surface-base`, `bg-surface-raised`, `bg-surface-scrim`, `border-hairline`.

## 2. Text

| Token | Value | Purpose | Used by |
|---|---|---|---|
| `--fg-primary` | `oklch(0.97 0.003 270)` | Cue, dialogue lines, titles, active nav label | Card front and back, Saved title and rows, sheet title |
| `--fg-secondary` | `oklch(0.88 0.008 270)` | Move label, breakdown, response preview in rows, helper copy, inactive nav label | Card front move label, card back breakdown, Saved rows, empty and no-results helpers |
| `--fg-tertiary` | `oklch(0.82 0.01 270)` | Quietest text: reveal hint, key hints, source, placeholder, speaker labels | Card front hint, desktop key-hint line, card back source, search placeholder |
| `--fg-inverse` | `oklch(0.2 0.01 270)` | Text on a solid light fill | `Button` default variant |

Utilities: `text-fg-primary`, `text-fg-secondary`, `text-fg-tertiary`, `text-fg-inverse`. shadcn `foreground` maps to `--fg-primary`, `muted-foreground` to `--fg-secondary`.

### Contrast pairs (D-THEME-5; input for `scripts/contrast.cjs`)

Translucent surfaces are composited in sRGB over their worst case: the ambient glow peak (`--hue-glow` at its centre over `--surface-base-top`), then for card faces the painted glass at its lightest point (shade, top fill and the specular wash at full strength), for every hue on the ring. The table gives the lowest ratio over all ten ring hues and the composite where it occurs. Floor: 4.5:1 for all text tokens (3:1 would be allowed for `text-cue*` and `text-title`, but they use `--fg-primary`). Gate 2 made the card glass lighter and brighter; to keep AA, `--glass-fill-top` went from 8.5% to 6% and `--fg-secondary` / `--fg-tertiary` were raised from L 0.85 / 0.78 to 0.88 / 0.82.

| Surface (composited, lightest point) | Hex | fg-primary | fg-secondary | fg-tertiary |
|---|---|---|---|---|
| `--surface-base-top` (page) | `#121417` | 16.93 | 12.86 | 10.57 |
| `--surface-raised` / `--chrome-fill-solid` | `#1d1e22` | 15.29 | 11.61 | 9.55 |
| `glass-chrome` over glow peak | `#16272d` | 14.05 | 10.68 | 8.78 |
| `glass-chrome-strong` over glow peak (drawer, sheet) | `#161f24` | 15.29 | 11.61 | 9.55 |
| Nav capsule (`--control-active` on `glass-chrome`) | `#3c4a4f` | 8.44 | 6.41 | not allowed (5.27) |
| `glass-paint` over glow peak (card face) | `#34535a` | 7.62 | 5.79 | 4.76 |
| `glass-control` on a card face | `#456167` | 6.13 | 4.66 | not allowed (3.83) |
| `glass-control` on the page (`Input` field: text and placeholder) | `#1e454d` | 9.53 | 7.24 | 5.95 |
| `glass-bubble` on a card face | `#435f66` | 6.30 | 4.78 | not allowed (3.93) |
| `hue-bubble` on a card face (chroma 0.14) | `#28616b` | 6.35 | 4.83 | not allowed (3.97) |

Other pairs: `hue-tag` text on its own fill (chroma 0.14), worst hue: 5.43. `--fg-inverse` on `--fg-primary`: 16.6. Focus ring on the lightest card face: 6.23; on the base: 13.25. Lowest enforced ratio: 4.66 (`--fg-secondary` on `glass-control` on a card face, hue 205). Every figure is the output of `node scripts/contrast.cjs`, which reads all tokens and recipe formulas live from `globals.css` and the ring from `move-hue.ts`.

Rule: inside a control, a bubble or a tag that sits on a card face, use `--fg-primary` or `--fg-secondary`, never `--fg-tertiary`. A control on the page (the search field) may use `--fg-tertiary` (placeholder).

## 3. Glass recipes

All are Tailwind utilities defined with `@utility` in `globals.css` and always emitted.

| Recipe | What it is | Where it is allowed |
|---|---|---|
| `glass-paint` | Painted glass. Translucent fill (white 6% at the top to 3%) over a light shade tinted by the hue (`--glass-shade`, `oklch(0.14 0.03 h / 0.14)`), so the glow reads through the face. Also a top-left specular wash (`--glass-specular`, white 12%), an inset hairline edge, a faint bottom rim (`--glass-rim-low`), and a deep shadow tinted by `--hue-shadow`. The bright rim comes from `glass-rim`, and card faces always use both. **No `backdrop-filter`.** The ambient layer is all soft gradients, so unblurred glass over it reads as frosted. Looks the same at every angle in every browser. | Rotating card faces (front and back), the skeleton card (D-FLIP-2) |
| `glass-rim` | Refraction rim: a 1 px ring drawn with a masked `::before`. It is lit from the top-left corner only (`--glass-rim`, white 32%) and fades along the top and left edges by about 70%, with a faint catch at the bottom-right (`--glass-rim-low`). Needs a positioned element (`relative` or `absolute`). Uses `::before`. | Card faces with `glass-paint`; optionally the nav pill |
| `glass-chrome` | Blurred glass: `--chrome-fill` (62%), `blur(24px) saturate(1.4)`, top highlight (`--chrome-rim`, white 20%, unchanged at Gate 2), hairline, soft shadow. Falls back to `--chrome-fill-solid` under `@supports not (backdrop-filter)` and `prefers-reduced-transparency: reduce`. | Chrome that never rotates: nav pill, sticky search (`Input variant="chrome"`), desktop previous / next |
| `glass-chrome-strong` | Same, more opaque (82%), 32 px blur, upward shadow. Same fallbacks. | Bottom sheet (Drawer), desktop detail pane |
| `glass-control` | Small translucent control: white 8% fill, rim, hairline. No blur. | Heart, mute, the field variant of `Input`, `Button variant="glass"` |
| `glass-bubble` | Neutral bubble: white 7%, rim, hairline. | Trigger line (other speaker) |
| `hue-bubble` | Response bubble tinted by the move hue: `oklch(0.58 0.14 h / 0.24)`, rim, hue hairline `oklch(0.8 0.11 h / 0.22)`. | Response line (the witty one) |
| `hue-tag` | Move tag: `oklch(0.62 0.14 h / 0.16)` fill, `oklch(0.9 0.06 h)` text, hue hairline `oklch(0.78 0.12 h / 0.3)`. Chroma was raised at Gate 2 so neighbouring hues separate and the warm ones read as red, copper and amber rather than brown. | Card back move tag, `Badge variant="move"`, `Button variant="tint"` |
| `hue-scope` | Re-declares every hue-derived token (`--glass-shade`, `--hue-glow`, `--hue-glow-soft`, `--hue-shadow`, `--focus-ring`) on the element, so a local `--move-hue` (`moveHueStyle`) retints all of them, not only the tag and bubble. | Showcase card frames; any element shown in a hue other than the root's |
| `.ambient-frame` | An in-flow copy of the ambient base. Put `.ambient-glow`, `.ambient-vignette` and `.ambient-grain` inside it, and pair it with `hue-scope`. | Showcase card-mock frames |
| `--specular-sweep` | A faint 105 degree highlight band (CSS gradient value). | One pass across the card during the flip (P4-2); removed under reduced motion |

Supporting tokens: `--chrome-rim`, `--glass-fill-top`, `--glass-fill-bottom`, `--glass-shade`, `--glass-edge`, `--glass-rim`, `--glass-rim-low`, `--glass-specular`, `--chrome-fill`, `--chrome-fill-strong`, `--chrome-fill-solid`, `--chrome-blur`, `--chrome-saturate`, `--control-fill`, `--control-fill-hover`, `--control-fill-pressed` (utilities `bg-control`, `bg-control-hover`, `bg-control-pressed`), `--control-active` (nav active capsule).

## 4. Move hue (D-THEME-3)

- `src/lib/move-hue.ts`: a 10-hue OKLCH ring, one slot per move (Gate 2 carry-over, P3-2). Each move in `src/content/moves.ts` is pinned to its own slot in `MOVE_HUES`; `moveHue(moveId)` returns the pin, or for an id that is not pinned (a new move from the content pipeline) a ring hue from a stable FNV-1a hash, so a new move still gets a hue with no UI change. It may share a hue until it is pinned here. Lightness and chroma are fixed by the tokens.

| Hue | Name | Move |
|---|---|---|
| 20 | ember | Naming the obvious |
| 50 | copper | Misdirection |
| 80 | amber | Self-deprecation |
| 140 | sage | Playing along |
| 170 | jade | Escalation |
| 205 | lagoon | Understatement |
| 245 | cobalt | Mock seriousness |
| 275 | iris | Literal interpretation (default hue) |
| 305 | violet | Callback |
| 340 | rose | Reversal |

- Spacing is uneven on purpose. 30 degrees reads as distinct in the orange, green and blue-violet ranges. The red-pink and teal-cyan ranges need 35 to 40 degrees, because Gate 2 called 15/345 and 190/215 near-twins. The ring skips the yellow-green band (about 85 to 135 degrees), which turns muddy at low lightness. `move-hue.test.ts` checks that every move is pinned, that no two moves share a hue, and these minimum gaps (30 degrees, 35 inside red-pink and teal-cyan).
- `--move-hue` (registered `<number>`, default 275, equal to `DEFAULT_MOVE_HUE`) is the one root property. **P4-2** publishes the active card's hue with `publishMoveHue(card.move)` from an effect (and may leave it on the last card when the feed hides). Saved may publish the open card's hue.
- Root-derived colours, registered as `<color>` so a hue change crossfades in oklab instead of sweeping the hue wheel: `--hue-glow` (`oklch(0.44 0.12 h / 0.42)`, the ambient glow), `--hue-glow-soft` (`oklch(0.36 0.07 h / 0.3)`, the counter-light), `--hue-shadow` (`oklch(0.2 0.06 h / 0.7)`, the card shadow). They transition over `--dur-hue`.
- Local tints: `hue-tag`, `hue-bubble` and `::selection` compute from `var(--move-hue)` where they are used. Root-declared tokens (`--focus-ring`, `--glass-shade`, `--hue-glow`, `--hue-glow-soft`, `--hue-shadow`) follow the root (active card) hue. To retint them locally as well, add `hue-scope` next to `moveHueStyle`. Where several moves share a screen (Saved rows, detail), set the hue on the element with `style={moveHueStyle(card.move)}`.
- The hue feeds the ambient glow, the card shadow, the move tag, the response bubble, the focus ring and selection, and nothing else.

## 5. Ambient layer (D-THEME-2)

`<AmbientLayer />` (`src/components/ui/ambient-layer.tsx`) is mounted once in the root layout, before the page. It is fixed, `z-index: -1`, `aria-hidden`, and never hit-tested. `<html>` paints the base and `body` is transparent, so the layer shows behind every route. Nothing in it sits on an ancestor of the page (no transform, filter or contain on `body`).

| Part | Class | What it does |
|---|---|---|
| Base | `.ambient` | Vertical gradient `--surface-base-top` to `--surface-base` to `--surface-base-bottom` |
| Glow | `.ambient-glow` | Phone: one soft radial glow behind the card (50% / 44%) plus a faint counter-light low left. Desktop (1024 px and up): the main glow sits at 68% / 48%, behind the right half of the landscape card, so the open side of the front reads as lit and the cue stays on darker ground (Gate 1 carry-over), with a counter-light low left and a whisper top right. |
| Vignette | `.ambient-vignette` | Darkens the edges so the eye stays on the card |
| Grain | `.ambient-grain` | Static SVG `feTurbulence` tile (`--grain`), grey, contrast-stretched (slope 4 around mid grey), `soft-light` at `--grain-opacity` (14%). Measured pixel sigma on a flat part of the base is about 2.6/255 (the target is 2 to 3), with a mean lift of under 1/255. It dithers the gradients so they never band. |

Drift: `--drift-x` and `--drift-y` (registered percentages) move the glow centres a few percent over `--dur-drift` (56 s, alternate), in `steps(90)` per segment. That is under 1 px per step, a few repaints a second, inside the root layer. A transform-animated glow was tried first: it became a composited texture that banded and tiled on dark gradients.

One moving thing at a time: a screen may set `data-ambient="still"` on `<html>` to pause the drift while the flip or the clip moves (P4-2's choice).

Under reduced motion the drift is `animation: none`. The hue still changes, as a 400 ms colour fade with no movement.

## 6. Radii

| Token / utility | Value | Used by |
|---|---|---|
| `rounded-card` | 32 px | Phone card faces, skeleton card |
| `rounded-stage` | 40 px | Desktop landscape card |
| `rounded-sheet` | 32 px (top corners) | Bottom sheet (`DrawerPopup`, `rounded-t-sheet`) |
| `rounded-pane` | 32 px | Desktop detail pane |
| `rounded-group` | 24 px | Saved grouped list |
| `rounded-bubble` | 20 px | Dialogue bubbles |
| `rounded-clip` | 20 px | Clip frame |
| `rounded-field`, `rounded-pill` | full | Search field, nav pill, tags, pill buttons |
| `--radius` | 14 px | shadcn scale (`rounded-lg` and the rest), untouched primitives |

Spacing uses Tailwind's 4 px scale and the pixel values in `LAYOUT_PLAN.md` (height budget, safe areas). No spacing token overrides them.

## 7. Type (Geist; D-THEME-4)

| Utility | Size / line height / tracking / weight | Used by |
|---|---|---|
| `text-cue-stage` | 56 px / 1.06 / -0.03em / 600 | Desktop card front cue. Largest text in the product. |
| `text-cue` | 34 px / 1.12 / -0.022em / 600 | Phone card front cue. Larger than any other phone text. |
| `text-title` | 28 px / 1.15 / -0.02em / 600 | "Saved" `h1` |
| `text-heading` | 18 px / 1.3 / -0.01em / 600 | Sheet and pane title (the cue as title), empty-state title |
| `text-line` | 16 px / 20 px | Dialogue lines, normal height tier |
| `text-line-compact` | 15 px / 18 px | Dialogue lines, compact tier (height 700 px or less) |
| `text-body` | 15 px / 1.4 | Saved row cue, breakdown, helpers, search text on desktop |
| `text-label` | 13 px / 1.2 / 500 | Move label and tag, speaker labels, pill-sm buttons |
| `text-eyebrow` | 12 px / 1.2 / 0.08em / 600 (uppercase in the component) | Saved group label |
| `text-caption` | 13 px / 1.3 | Reveal hint, key hints, source |

## 8. Motion

CSS (`globals.css`) and JS (`src/components/ui/motion.ts`) carry the same values.

| Token | Normal | Reduced motion | Used by |
|---|---|---|---|
| `flipSpring` (JS) | spring, stiffness 120, damping 20, mass 1: settles in about 600 ms, no visible overshoot | replaced by `flipCrossfade` (150 ms opacity, linear) | Card flip (D-FLIP-1, P4-2) |
| `specularSweep` (JS) | 600 ms, `easeGlide` | removed | Sweep during the flip |
| `heartPop`, `heartScale` (JS) | 1 to 1.18 to 1, 300 ms tween (`times` 0 / 0.4 / 1, `ease-soft`), on save only | state change only | Heart fill (`HeartToggle`). Replaces the P2 `heartSpring`: framer-motion springs take two keyframes only. |
| `capsuleSpring` (JS) | spring, stiffness 420, damping 42: critically damped, about 300 ms | instant | Nav active capsule slide (`NavPill`) |
| `--dur-fast` | 150 ms | 150 ms (colour only) | Button and field hover, press |
| `--dur-base` | 240 ms | 0 | Generic fades (key hints) |
| `--dur-sheet` | 280 ms, `ease-soft` | 0 (opacity only, no rise) | Drawer rise and backdrop; a Drawer released after a swipe finishes in `--drawer-swipe-strength` x `--dur-sheet` |
| `--dur-crossfade` | 150 ms | 150 ms | Flip crossfade (CSS twin) |
| `--dur-ready` / `animate-ready-fade` | 320 ms opacity | 0 | Clip fades in when ready (P4-3) |
| `--dur-hue` | 1400 ms, `ease-glide` | 400 ms | Ambient and shadow hue crossfade |
| `--dur-drift` | 56 s | stopped | Ambient drift |
| `--dur-pulse` / `animate-hint-pulse` | 4 s opacity 1 to 0.62 | stopped (`motion-reduce:animate-none`) | "Tap to reveal" hint |
| `--dur-shimmer` / `animate-shimmer` | 2.4 s | stopped | `Skeleton` |
| `ease-soft` | `cubic-bezier(0.22, 1, 0.36, 1)` | n/a | Default UI easing |
| `ease-glide` | `cubic-bezier(0.65, 0, 0.35, 1)` | n/a | Hue crossfade, sweep |
| `scrollBehavior(reduced)` (JS) | `smooth` | `auto` | Keyboard paging in the feed (P4-4) |

Pressed buttons scale to 0.97; under reduced motion they do not scale. Reduced motion is read with framer-motion's `useReducedMotion()` and CSS media queries, never by user agent.

## 9. Focus

`--focus-ring` is `oklch(0.9 0.06 h)`: near-white, faintly tinted by the move hue. It is 2 px (`--focus-ring-width`) with a 2 px offset (`--focus-ring-offset`) and reaches at least 6.2:1 on every surface. It applies to every `:focus-visible` element by default (base layer). `focus-ring` re-applies it on components that reset outlines. Both also answer to a `data-focus-visible` attribute, which forces the state for documentation (the showcase state matrix). shadcn `--ring` maps to it.

## 10. Primitives (`src/components/ui`)

| Primitive | Variants added | Screen element |
|---|---|---|
| `Button` | `glass` (in-card control, no blur), `chrome` (blurred), `tint` (hue pill), `quiet` (text action); sizes `circle` (44 px), `circle-lg` (48 px), `pill` (44 px), `pill-sm` (36 px). Existing variants and sizes are kept. Focus ring, soft press, 40% disabled. | Heart and mute (`glass circle`), desktop previous / next (`chrome circle-lg`), sheet close (`glass circle`), "Clear search" (`quiet pill`, 44 px, D-SAVED-9), "Back to cue" (`glass pill-sm` painted at 36 px inside a 44 px hit box, A-9) |
| `Badge` | `move` (26 px `hue-tag` pill), `glass` | Card back move tag; Saved group label if a pill is wanted |
| `Input` | `variant="field"` (default, `glass-control` pill, 48 px, no blur), `variant="chrome"` (blurred). The blur makes the field a stacking context, so a leading icon drawn before it needs `z-10`. | Saved search |
| `Skeleton` | Faint glass fill with a slow shimmer, stopped under reduced motion | Feed skeleton card, Saved skeleton rows, clip loading |
| `Drawer` (P3-2, from 21st.dev 24837; D-SAVED-8) | Bottom-only Base UI Drawer: `Drawer`, `DrawerTrigger`, `DrawerPopup` (portal, `--surface-scrim` backdrop with no blur, viewport and the `glass-chrome-strong` `rounded-t-sheet` panel in one; max 92dvh; takes `finalFocus` / `initialFocus`), `DrawerContent` (the scrolling body; swipe-to-dismiss waits until it is at the top), `DrawerHandle` (32 px strip with the 36 x 5 pill; takes `data-testid`), `DrawerTitle`, `DrawerDescription`, `DrawerClose`. Native swipe-to-dismiss: the panel follows the finger, the scrim fades with `--drawer-swipe-progress`. Rise and fade use `--dur-sheet` / `ease-soft`, instant under reduced motion. `data-base-ui-swipe-ignore` on a child opts it out of the swipe. `drawerSurfaceClassName` draws the panel inline (showcase). | Phone detail sheet (`detail-sheet.tsx`, P4-5). The only sheet primitive: `Sheet`, `SheetGrabber` and `Dialog` were deleted in P4-6 (Gate 3 carry-over). |
| `NavPill`, `NavPillItem` (P3-2, from 21st.dev 8343) | `glass-chrome` 52 px pill; items are 44 px, `text-label`, `--fg-secondary`, `--fg-primary` when `active`. The active item has a `--control-active` capsule that slides to the new item (`capsuleSpring`, shared layout, scoped per pill), instant under reduced motion. Focus ring, 0.97 press. Items render any element through `render` (Base UI `useRender`), e.g. `render={<Link href="/saved" />}`. The caller owns the `nav` label, `aria-current` and placement. | `AppNav` (P4-1) |
| `HeartToggle` (P3-2, from 21st.dev 10627) | Base UI `Toggle` drawn as `Button variant="glass" size="circle"` (44 px): `aria-pressed`, fixed label (default "Save"), heart filled with `--fg-primary` when pressed. Pops to 1.18 once on save (`heartPop`): on press, and when controlled on any false-to-true change of `pressed` (so a save by the S key pops too). Never on unsave, never on mount, not under reduced motion. Controlled (`pressed`, `onPressedChange`) or not; passes `data-testid` and other props to the button. | Card back heart (P4-2), detail heart (P4-5) |
| `AmbientLayer` | (new) | Root layout |
| `motion.ts` | (new; P3-2 added `heartPop`, `capsuleSpring`) | Card flip, heart, nav capsule, sweep, keyboard scroll |

Untouched: `scroll-area`, `separator`, `tabs`, `tooltip`, `sonner` (they pick up the dark tokens through the shadcn names).

## 11. Hand-offs to P4

- The screens still carry P1 grey-box classes (`border-neutral-*`, `bg-neutral-*`, `bg-background` on the sticky search, `rounded-none` on the search field). They override these tokens until each lane restyles.
- P4-2: `HeartToggle` for the heart (pass `data-testid="heart"`, `pressed`, `onPressedChange`; the label stays "Save"), `glass-paint glass-rim` on both faces, `rounded-card` / `rounded-stage`, `text-cue` / `text-cue-stage`, `publishMoveHue`, `flipSpring`, `--specular-sweep`, `animate-hint-pulse motion-reduce:animate-none`.
- P4-1: `NavPill aria-label="Primary"` with one `NavPillItem render={<Link href=… />} active aria-current` per route; keep the fixed placement classes on the pill.
- P4-5: switch `detail-sheet.tsx` to `Drawer` (D-SAVED-8): `DrawerPopup` with `finalFocus`, `DrawerHandle data-testid="sheet-grabber"`, the detail inside `DrawerContent`, `data-base-ui-swipe-ignore` on the clip frame; drop the framer-motion grabber drag. `HeartToggle` in the detail. `Input variant="chrome"` with the icon at `z-10`, `rounded-group` lists, `moveHueStyle` for any hue in rows.

## 12. 21st.dev library (P3-2)

Four components were fetched in P3-1 (`COMPONENTS_21ST.md`). Three were ported to the tokens, Base UI and framer-motion, and are shown in every state on `/showcase` (Library section): `Drawer`, `NavPill`, `HeartToggle`. Glass Card 28259 was dropped: what survives the no-`backdrop-filter`, static-specular rules is a full-perimeter 55% inner ring (louder than the top-left `glass-rim`) and a bottom shade that does not show at a calm strength, so `glass-paint glass-rim` stays. The raw fetched files were removed from `src/components/ui/x21/`; they are in git history (commit `000ed90`).
