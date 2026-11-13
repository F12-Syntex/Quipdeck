# Quipdeck build plan (tiered swarm)

Read with: `docs/SPEC.md` (authoritative), `STACK.md`, `DESIGN_DECISIONS.md` (D-... ids), `LAYOUT_PLAN.md`, `FEATURE_INVENTORY.md` (hooks and checks).

Scope: 2 screens (Feed, Saved), 1 detail view (sheet on phone, pane on desktop), 1 card component, 1 clip engine. 19 tasks.

## Roles

| Role | Tier | Use |
|---|---|---|
| lead | lead | Dispatch, gates, replans. Writes no code. |
| CEO (persona: Jony Ive) | reviewer | Judges every gate from real screenshots. APPROVED or VETO with reasons. Max three vetoes per gate. |
| planner | this document's author | Owns `LAYOUT_PLAN.md`, `DESIGN_DECISIONS.md`, `FEATURE_INVENTORY.md`. Structural changes after Gate 1 come back here. |
| implementer | high-effort tier | Design decisions, or work spanning modules. |
| worker | medium-effort tier | Fully specified task with a runnable check. Stops and asks if a decision is needed. |
| design system owner | implementer | The agent on P2-1. From P2 on, the only editor of `src/app/globals.css`, `src/app/layout.tsx`, `src/components/ui/**`, `src/lib/move-hue.ts`, `DESIGN_SYSTEM.md`. Others request changes through the lead. |

There is no scaffold tier in this swarm.

## Standing rules

1. Edit only the files your task owns. No file is owned by two tasks that can run at the same time (ownership map below).
2. Before writing Next code, read the relevant guide in `node_modules/next/dist/docs/` (`AGENTS.md`). In particular `01-app/02-guides/preserving-ui-state.md`.
3. UI primitives are Base UI (`base-nova`), not Radix. No `asChild`.
4. Client-only values (saves, shuffle, media queries) are read with `useSyncExternalStore`. No `useEffect` + `setState` for hydration (`react-hooks/set-state-in-effect` is on).
5. Hooks in `FEATURE_INVENTORY.md` section 1 are a contract. Build them in P1. Never rename them later.
6. No colour, type or effect styling in P1. No new features in any phase (`DESIGN_DECISIONS.md` section 9).
7. Add no dependency unless your task says so. `package.json` is owned only by the tasks that name it.
8. Committed docs use role names, never model ids.
9. Report format, 150 words maximum, no code:
   `STATUS / TASKS / FILES / CHECKS: <command> -> pass|fail / DEVIATIONS / QUESTIONS`

**QG** (quality gate, used in acceptance checks) = `npm run lint && npx next typegen && npx tsc --noEmit && npm test && npm run build`, all passing.

## Contracts (fixed by P1-1; lanes build against them)

State, `src/lib/visit-store.ts` (memory only, D-STATE-2):
- `useVisitOrder(): string[] | null` (`null` on the server and during hydration)
- `useIsFlipped(id): boolean`, `useActiveId(): string | null`, `useMuted(): boolean`
- `visit.toggleFlip(id)`, `visit.setActive(id)`, `visit.setMuted(value)`
- `createVisitStore(cards, seedFn)` for tests

State, `src/lib/saves-store.ts` (localStorage `quipdeck:saved:v1`, D-SAVE-1..4):
- `useSavedIds(): string[] | null` (`null` = not read yet), `useIsSaved(id): boolean`
- `toggleSaved(id): boolean`
- `createSavesStore(storage)` for tests

Hook, `src/hooks/use-media-query.ts`: `useMediaQuery(query): boolean` (`false` on the server).

Clip, `src/lib/youtube.ts` and `src/lib/clip-controller.ts` (D-CLIP-2..8):
- `loadYouTubeApi(timeoutMs?): Promise<YT>`; module keeps at most one live player
- `createClipController({ YT, mount, clip, getMuted, onState, onMuted, readyTimeoutMs })` returns `{ setMuted(value), destroy() }`; `onState` receives `loading | playing | paused | error`

Components (props only; each fills its parent):
- `AppNav()` in `src/components/shell/app-nav.tsx`
- `Feed()` in `src/components/feed/feed.tsx`
- `WitCard({ card, active })` in `src/components/card/wit-card.tsx`: owns the flip, renders `CardFront` and `CardBack`
- `CardFront({ card, onReveal })`, `CardBack({ card, clipActive, onFlipBack? })`: `CardBack` has no flip logic and is reused by the feed, the sheet and the pane
- `Clip({ clip, title, active })` in `src/components/card/clip.tsx`
- `HeartButton({ cardId })`, `MuteButton()`
- `Saved()` in `src/components/saved/saved.tsx`; `CardDetail({ cardId, mode })` with `mode: "sheet" | "pane"`

## File ownership map (sequential hand-offs are explicit)

| Path | P1 | P2 / P3 | P4 | P5 |
|---|---|---|---|---|
| `src/content/**` | frozen (done) | frozen | frozen | P5-3 only if a check demands it |
| `src/app/page.tsx`, `src/app/saved/page.tsx` | P1-1 | frozen | frozen | P5-3 |
| `src/lib/visit-store.ts`, `src/lib/saves-store.ts`, their tests, `src/hooks/use-media-query.ts` | P1-1 | frozen | P4-6 | P5-3 |
| `src/lib/youtube.ts`, `src/lib/clip-controller.ts`, its test | P1-4 | frozen | P4-6 | P5-3 |
| `e2e/support/yt-stub.js` | P1-4 | frozen | frozen | P5-1 |
| `src/components/card/clip.tsx` | P1-1 stub, then P1-4 | frozen | P4-3, then P4-6 | P5-3 |
| `src/components/card/**` (except `clip.tsx`) | P1-1 stubs, then P1-3 | frozen | P4-2, then P4-6 | P5-3 |
| `src/components/feed/**` | P1-1 stub, then P1-3 | frozen | P4-4, then P4-6 | P5-3 |
| `src/components/saved/**` | P1-1 stub, then P1-5 | frozen | P4-5, then P4-6 | P5-3 |
| `src/components/shell/**`, `src/app/not-found.tsx`, `src/app/error.tsx` | P1-1 stub, then P1-2 | frozen | P4-1, then P4-6 | P5-3 |
| `src/app/layout.tsx` | P1-2 | design system owner (P2-1, P3-2) | design system owner on request | P5-3 |
| `src/app/globals.css`, `src/components/ui/**`, `src/lib/move-hue.ts`, `DESIGN_SYSTEM.md` | untouched, except `src/components/ui/input.tsx` (P1-5 may add it) | design system owner (P2-1, P3-2) | design system owner on request | P5-3 |
| `src/app/showcase/**`, `src/components/showcase/**`, `scripts/contrast.cjs` | none | P2-2, then P3-2 | frozen | P5-3 |
| `COMPONENTS_21ST.md`, `src/components/ui/x21/**` | none | P3-1, then P3-2 | frozen | frozen |
| `scripts/shots.cjs` | P1-6 | P2-2 (adds showcase shots) | P4-6 | P5-3 |
| `e2e/support/server.cjs`, `e2e/smoke.test.cjs` | P1-6 | frozen | frozen | P5-1 |
| other `e2e/*.test.cjs` (except `a11y.test.cjs`) | none | none | none | P5-1 |
| `e2e/a11y.test.cjs` | none | none | none | P5-2 |
| `package.json`, lockfile | P1-6 (scripts) | P3-1 (only deps a fetched component needs) | none | P5-2 (`axe-core` dev dependency) |
| `docs/gates/<phase>/**` | P1-6 | P2-2, P3-2 | P4-6 | P5-3 |
| `VALIDATION.md` | none | none | none | P5-3 |

---

## Phase 0: done

| ID | Task | Status |
|---|---|---|
| T0 | Scaffold Next, Tailwind, shadcn | done |
| T1 | Content model, moves, 14 seed cards, helpers, tests | done |
| PL | Spec copy, research copy, inventory, layout plan, decisions, this plan | done |

---

## Phase 1: grey-box wireframes that work

Real routes, real seed content, real behaviour, zero paint: the font already wired, 1 px neutral borders, greys only, no tokens, no effects, flip is an instant swap. The point is to approve structure and behaviour before any visual work.

| ID | Tier | Task | Files owned | Acceptance check | Depends on | Risk |
|---|---|---|---|---|---|---|
| P1-1 | implementer | Contracts and skeleton. Build both stores exactly as in Contracts (stable snapshots, injected storage, `storage` event). Create the two route files. `/saved` wraps `Saved` in `Suspense` whose fallback is the `h1` "Saved" plus `saved-skeleton` (this fallback is the prerendered shell). Create typed stubs for every component in Contracts so lanes compile in isolation; each stub renders its root hook from the inventory (for example the `Clip` stub is an empty box with `data-testid="clip"` and `data-clip-state="idle"`). | `src/lib/visit-store.ts`, `src/lib/saves-store.ts`, `src/lib/visit-store.test.ts`, `src/lib/saves-store.test.ts`, `src/hooks/use-media-query.ts`, `src/app/page.tsx`, `src/app/saved/page.tsx`, stubs: `src/components/shell/app-nav.tsx`, `src/components/feed/feed.tsx`, `src/components/saved/saved.tsx`, `src/components/saved/card-detail.tsx`, `src/components/card/{wit-card,card-front,card-back,clip,heart-button,mute-button}.tsx` | QG. New unit tests cover: order is a permutation and stable across reads; flip toggle; mute default `true`; saves read, write, order, unknown ids kept, throwing storage falls back to memory, `storage` event updates, server snapshot is `null`. `npm run build` succeeds and lists `/` and `/saved` as static or partially prerendered, not dynamic. | T1 | medium |
| P1-2 | worker | Shell and nav. Root layout: `class="dark"`, `color-scheme: dark`, fix the stale description ("flip-card jokes") to describe clips of unscripted wit, `preconnect` for the YouTube hosts, mount `AppNav`. `AppNav` per `LAYOUT_PLAN.md` section 2 (bottom centre phone, top centre desktop). Not-found and error pages per section 9. | `src/app/layout.tsx`, `src/components/shell/**`, `src/app/not-found.tsx`, `src/app/error.tsx` | QG. Lane ids N-1, N-2, N-3, N-4, N-7, R-4, R-7 hold when checked with a short Playwright script (pass/fail per id in the report). | P1-1 | low |
| P1-3 | implementer | Card and feed. Scroll-snap feed, skeleton, shuffle after mount, active card observer, scroll restore after Activity, flip with the no-flip targets, hidden face and inactive cards `inert`, keyboard map and focus rules, desktop previous / next and key hints, card front and back layouts incl. container-query two-column back and the phone height budget, heart and mute buttons, live region. Decisions D-FEED-1..10, D-SAVE-5, layouts sections 3 to 5. | `src/components/card/**` except `clip.tsx`, `src/components/feed/**` | QG. Lane ids (checkable with the sibling stubs in place) FD-1..5, FD-7..10, CF-1..6, FL-1..4, FL-6..9, FL-12, CB-1..9, SV-1, SV-2, SV-8, SV-9, KB-1..3, KB-6..10 hold via a Playwright script at 390x844, 375x667, 360x640, 1440x900 (pass/fail per id in the report). | P1-1 | medium |
| P1-4 | implementer | Clip engine. API loader with timeout, single-player guard, controller state machine (loading, playing, paused, error), loop poll and ENDED backup, mute attempt-verify-fallback, error on player error, script failure and ready timeout, teardown in effect cleanup, creation deferred until the card is settled. Grey-box `Clip` view with all `data-clip-state` values and the fallback message. The Playwright stub for the IFrame API. Decisions D-CLIP-1..11, D-TEST-2. | `src/lib/youtube.ts`, `src/lib/clip-controller.ts`, `src/lib/clip-controller.test.ts`, `src/components/card/clip.tsx`, `e2e/support/yt-stub.js` | QG. Unit tests with a fake player and fake timers cover: seek at `end - 0.15`; ENDED backup; unmute verified; unmute blocked falls back to muted; error codes; ready timeout; destroy stops the poll. Report whether F7 (200 x 200 minimum, no overlays) matches the current YouTube policy page. Browser behaviour is checked in P1-6, once a real card can flip. | P1-1 | high |
| P1-5 | implementer | Saved and detail. Three mount states, grouped list, live search with clear, empty and no-results states, rows, URL-derived detail, bottom sheet on phone (Base UI Dialog, focus return, drag-to-dismiss strip) and pane on desktop, unsave behaviour. Add the shadcn `input` primitive if needed (`npx shadcn@latest add input -y`, file only). Decisions D-SAVED-1..7, D-SAVE-2, D-SAVE-6..8, layouts sections 7 and 8. | `src/components/saved/**`, `src/components/ui/input.tsx` (new file, handed to the design system owner in P2) | QG. Lane ids (checkable with the `CardBack` stub in place) R-3, SL-1..15, OV-2..5, OV-9..11, OV-13 hold via a Playwright script at 390x844 and 1440x900 (pass/fail per id in the report). | P1-1 | medium |
| P1-6 | worker | Integration check and Gate 1 pack. `e2e/support/server.cjs` (build once, `next start` on a free port, teardown). `e2e/smoke.test.cjs` covers the ids that need more than one lane: N-5, N-6, FD-11, FL-5, CB-10, KB-4, SV-3, SL-16, OV-1, OV-6, OV-7, OV-8, OV-12, CL-1, CL-2, CL-6..10, CL-15, CL-16, CL-19, CL-20, plus no console errors and no hydration warnings on either route. Also one run against the real API (no stub): a flipped card reaches `data-clip-state="error"` and shows the fallback (sandbox videos all fail, D-TEST-5). This task tests and reports; it does not fix lane code. A failing id goes back to its lane through the lead. `scripts/shots.cjs <phase>`: screenshots of feed front, feed back (stubbed clip), feed back fallback, saved populated, saved searching, saved empty, saved no results, detail, at 390x844, 375x667 and 1440x900, into `docs/gates/<phase>/`. Add `e2e` and `shots` npm scripts. | `scripts/shots.cjs`, `e2e/support/server.cjs`, `e2e/smoke.test.cjs`, `package.json` (scripts only), `docs/gates/p1/**` | QG. `npm run e2e` passes (pass/fail per id in the report). `npm run shots -- p1` writes 24 PNGs. | P1-2, P1-3, P1-4, P1-5 | low |

Parallelism: P1-1 first. Then P1-2, P1-3, P1-4, P1-5 in parallel (disjoint directories; stubs keep each lane compiling, and each lane's acceptance ids are the ones it can pass against stubs). Then P1-6, which is the first point where the lanes meet and where every cross-lane id is checked.
P1-4 gets an independent reviewer pass (risk high): re-run its checks, read the controller for teardown leaks.

**CEO Gate 1 (layout and behaviour, from `docs/gates/p1/`).** Judged on structure alone, against `LAYOUT_PLAN.md` section 10. Questions the CEO answers: Is there anything on any screen that could be removed? Is the cue unmistakably first? Does the desktop feel designed for a desk, or stretched? Decisions put to the CEO here: D-FEED-3 (quiet end of deck), D-SAVED-6 (detail does not flip), D-CLIP-10 (autoplay under reduced motion). A veto on structure returns to the planner, who amends `LAYOUT_PLAN.md` before any rework.

---

## Phase 2: design system and showcase

| ID | Tier | Task | Files owned | Acceptance check | Depends on | Risk |
|---|---|---|---|---|---|---|
| P2-1 | implementer (design system owner) | Tokens and primitives for the direction in D-THEME-1..5 and D-FLIP-1..3: dark surfaces, text levels, painted-glass recipe for rotating faces, blurred-glass recipe for chrome with fallbacks, radii, spacing, type scale (cue is the largest), motion tokens (flip spring, crossfade, hue crossfade) and their reduced-motion values, focus ring, move hue function and the root custom property, ambient layer (base, glow, grain), restyled `button` (glass circle, pill), `badge` (move tag), `input` (search), `skeleton`, `sheet` / `dialog`. Write `DESIGN_SYSTEM.md`: every token, its purpose, and which screen element uses it. Mount the ambient layer in the layout. No screen components are touched. | `src/app/globals.css`, `src/app/layout.tsx`, `src/components/ui/**`, `src/lib/move-hue.ts`, `src/lib/move-hue.test.ts`, `DESIGN_SYSTEM.md` | QG. `npm run e2e` still passes (hooks intact). Unit test: hue function is deterministic, covers every move in `moves.ts`, and returns a value for an unknown id. | Gate 1 | medium |
| P2-2 | worker | `/showcase`: every token group (surfaces, text, glass recipes on the ambient layer, radii, type scale with a real cue, motion demos with a reduced-motion note), every primitive in every state (default, hover, focus-visible, pressed, disabled), one static mock of the card front and back built only from primitives, `noindex`, not in the nav. `scripts/contrast.cjs`: computes contrast for each text token on each surface token it is documented to sit on and fails under 4.5:1 (3:1 for the large-text tokens). Add showcase shots to `scripts/shots.cjs`. | `src/app/showcase/**`, `src/components/showcase/**`, `scripts/contrast.cjs`, `scripts/shots.cjs`, `docs/gates/p2/**` | QG. `node scripts/contrast.cjs` exits 0. `npm run shots -- p2` writes showcase PNGs at 390x844 and 1440x900. Inventory R-6. | P2-1 | low |

**CEO Gate 2 (direction and system, from `docs/gates/p2/`).** Is it calm? Is the glass believable without being loud? Is there exactly one signature idea, held with restraint? Does the type make the cue inevitable?

---

## Phase 3: 21st.dev component library

`get_component` is metered. Search and metadata are free; fetch at most four components. The reference board already lists candidates with ids.

| ID | Tier | Task | Files owned | Acceptance check | Depends on | Risk |
|---|---|---|---|---|---|---|
| P3-1 | implementer | Component scout. For each element (card glass, nav pill, heart, move tag, bubbles, search field, sheet, skeleton, empty state, ambient / grain) record in `COMPONENTS_21ST.md`: the 21st.dev candidate (name, id, URL), the decision (fetch, pattern only, or skip), where it is used, and the shadcn or hand-built fallback. Fetch only the highest-value few. Starting shortlist, in priority order: Glass Card 28259 (rim and specular), Bottom Nav Bar 8343 (active capsule), Grain Gradient 17835 (ambient), Heart Button 1695. The flip, the clip and the dialogue are built in-house (D-FLIP-1, D-CLIP). Save fetched source unmodified. If the fetch tool is unavailable to the agent, report it; the lead fetches. | `COMPONENTS_21ST.md`, `src/components/ui/x21/**`, `package.json` (only a dependency a fetched component cannot work without, named in the report) | `COMPONENTS_21ST.md` has a row for every element above with a decision and a fallback. At most four fetched components. `npx tsc --noEmit` passes (raw files may be excluded from lint only if listed in the doc). | Gate 2 | medium |
| P3-2 | implementer (design system owner) | Adapt and integrate. Port each fetched component to the tokens, Base UI, `framer-motion` imports, dark only, reduced motion, and the no-`backdrop-filter`-on-rotating-faces rule; drop anything that is not calmer than the P2 version and record why. Export from `src/components/ui`. Add each to `/showcase`. Update `DESIGN_SYSTEM.md`. After this task the design system is frozen. | `src/components/ui/**`, `src/app/globals.css`, `src/app/layout.tsx`, `src/app/showcase/**`, `src/components/showcase/**`, `DESIGN_SYSTEM.md`, `COMPONENTS_21ST.md` (status column), `docs/gates/p3/**` | QG. `node scripts/contrast.cjs` exits 0. `npm run e2e` passes. `npm run shots -- p3` writes updated showcase PNGs. | P3-1 | medium |

**CEO Gate 3 (library, from `docs/gates/p3/`).** Does every adopted component look like it was made for this product? Anything that reads as a borrowed effect is cut.

---

## Phase 4: screens

Each lane re-owns its P1 files and applies the frozen system. Structure, DOM order and hooks do not change. A lane that needs a token or a primitive change asks the lead, who sends it to the design system owner.

| ID | Tier | Task | Files owned | Acceptance check | Depends on | Risk |
|---|---|---|---|---|---|---|
| P4-1 | worker | Shell lane. Nav pill (glass, active capsule, focus ring) at both placements, safe areas, not-found and error pages. | `src/components/shell/**`, `src/app/not-found.tsx`, `src/app/error.tsx` | QG. `npm run e2e` passes. N-3, N-4, N-5, A-9 hold. | Gate 3 | low |
| P4-2 | implementer | Card lane. Front (cue, move, hint with its pulse), back (move tag, bubbles, breakdown, action row, source), heart animation, flip per D-FLIP-1 with the specular sweep, reduced-motion crossfade, painted glass faces, both container-query layouts, height budget tiers. Publishes the move hue for the active card. | `src/components/card/**` except `clip.tsx` | QG. `npm run e2e` passes. FL-10, FL-11, CB-8, CB-9, LF-2 hold via script. | Gate 3 | medium |
| P4-3 | worker | Clip lane (visual only). Clip frame radius and surface, loading skeleton, ready fade, fallback message styling. No change to the controller or to state names. | `src/components/card/clip.tsx` | QG. `npm run e2e` passes. CL-14, CL-15, CL-18, CL-19, CB-10 hold. | Gate 3 | low |
| P4-4 | implementer | Feed lane. Wheel gesture handler (D-FEED-11): one wheel notch or one trackpad flick moves exactly one card; accumulate deltaY to a ~40 px threshold, then lock until the scroll settles; no effect on touch; un-todo FD-2x. Slide padding and safe areas, desktop stage grid, previous / next, key hints, skeleton card, focus behaviour, smooth vs instant scroll. | `src/components/feed/**` | QG. `npm run e2e` passes. FD-1, FD-5, CF-6, KB-7..10 hold. | Gate 3 | medium |
| P4-5 | implementer | Saved lane. Title, sticky glass search, groups and rows, skeleton, empty and no-results states, bottom sheet (glass, grabber, drag), desktop master-detail with placeholder and selected row. | `src/components/saved/**` | QG. `npm run e2e` passes. SL-13, SL-14, OV-3, OV-10, OV-13 hold. | Gate 3 | medium |
| P4-6 | implementer | Integration pass. Walk every screen and state at 390x844, 375x667 and 1440x900 against the wireframes and the showcase; fix cross-lane drift (spacing rhythm, motion timing, focus order, hue hand-off between feed and saved); confirm one moving thing at a time. May edit any lane file after the lanes close; not design system files. Produce the Gate 4 pack. | lane files (after P4-1..5 close), `scripts/shots.cjs`, `docs/gates/p4/**` | QG. `npm run e2e` passes. `npm run shots -- p4` writes the 24-screen pack plus a reduced-motion set. | P4-1, P4-2, P4-3, P4-4, P4-5 | medium |

Parallelism: P4-1 to P4-5 run together (five disjoint lanes). P4-6 runs alone after them.

**CEO Gate 4 (screens, from `docs/gates/p4/`, area by area, phone and desktop, beside the approved wireframes).** Anything that drifts from the approved layout is vetoed. Anything that is merely decorated is vetoed.

---

## Phase 5: validation

| ID | Tier | Task | Files owned | Acceptance check | Depends on | Risk |
|---|---|---|---|---|---|---|
| P5-1 | worker | e2e for the inventory. One `node:test` file per inventory section (routes, nav, feed, card, flip, clip, saving, saved, detail, keyboard, look-and-feel, scope guard), every PW check implemented under its id, stubbed clip API, visibility-scoped locators. List every MAN item in the report untouched. | `e2e/*.test.cjs` except `a11y.test.cjs`, `e2e/support/**` | `npm run e2e` runs every PW id in `FEATURE_INVENTORY.md`; report lists pass / fail per id. | Gate 4 | low |
| P5-2 | worker | Accessibility and motion. Add `axe-core` as a dev dependency and inject it from `node_modules` in Playwright. Run it on feed front, feed back, saved, saved empty, detail (phone and desktop). Reduced-motion run. Touch-target, focus-visibility and contrast checks (A-1..A-9, LF-1, LF-6). | `e2e/a11y.test.cjs`, `package.json` (dev dependency) | `node --test e2e/a11y.test.cjs` reports zero serious or critical axe violations and passes A-1..A-9; report lists any moderate findings. | Gate 4 | low |
| P5-3 | implementer | Fix pass and final pack. Triage every failure from P5-1 and P5-2; fix in source (any file, sequential); structural or visual-system changes go back to the planner or the design system owner through the lead. Write `VALIDATION.md`: command results, inventory ids passed, MAN items outstanding, known limits (sandbox playback). Final screenshots. | any `src/**` (sequential, after P5-1 and P5-2), `VALIDATION.md`, `docs/gates/final/**` | QG. `npm run e2e` and `node --test e2e/a11y.test.cjs` pass. `npm run shots -- final` writes the pack. `VALIDATION.md` lists every inventory id with a result. | P5-1, P5-2 | medium |

**CEO final gate (full walkthrough, from `docs/gates/final/` and `VALIDATION.md`).** Only APPROVED ends the job.

---

## Dependency graph

```
T0 -> T1 -> PL -> P1-1 -> { P1-2 | P1-3 | P1-4 | P1-5 } -> P1-6 -> GATE 1
GATE 1 -> P2-1 -> P2-2 -> GATE 2
GATE 2 -> P3-1 -> P3-2 -> GATE 3
GATE 3 -> { P4-1 | P4-2 | P4-3 | P4-4 | P4-5 } -> P4-6 -> GATE 4
GATE 4 -> { P5-1 | P5-2 } -> P5-3 -> FINAL GATE
```

## Risks

| ID | Risk | Mitigation | Owner |
|---|---|---|---|
| R1 | Real YouTube playback cannot be verified in the sandbox: every video returns error 150 in headless Chromium here. | Stubbed IFrame API for all automated checks (D-TEST-2). Manual check on real devices before release (inventory CL-22). Gate screenshots use the stub. | P1-4, lead |
| R2 | iOS Safari may block unmuting without a tap on each card, so "unmute persists for the visit" could degrade to one tap per card. | Attempt, verify, fall back to muted with an honest button (D-CLIP-7). Manual iOS check. If it fails, the lead brings options to the user. | P1-4, lead |
| R3 | Feed scroll position after returning from Saved (Activity hides with `display: none`). | Active id kept in the store; scroll restored in a layout effect (D-FEED-4). Check FD-11. | P1-3 |
| R4 | Safari rendering of the flip and of an iframe near 3D transforms cannot be tested here (Chromium only). | Nothing is transformed at rest and no `backdrop-filter` on rotating faces (D-FLIP-1, D-FLIP-2). Manual Safari check. | P4-2, lead |
| R5 | Long dialogue overflows the card back on short phones. | Height budget, clamps and compact tier (`LAYOUT_PLAN.md` section 3); check CB-8; content rule of about 90 characters per line for the pipeline. | P1-3, P4-2 |
| R6 | 21st.dev components assume Radix or a light theme, and fetches are metered. | Four-fetch cap; adapt or drop in P3-2; fallbacks recorded in `COMPONENTS_21ST.md`. | P3-1, P3-2 |
| R7 | Clips whose owners disable embedding, or that lack captions, reach users as fallbacks or silent video. | Content pipeline rule: verify embeddable and captioned before a card ships. Outside this build. | lead (to content pipeline) |
| R8 | A lane renames a hook or changes DOM order during P4 and breaks e2e. | Standing rule 5; `npm run e2e` is in every P4 acceptance check. | all P4 |

## Open questions for the lead

1. End of deck: the plan stops quietly at the last card (D-FEED-3). Confirm at Gate 1, or ask for a reshuffle.
2. The Saved detail shows the cue as title plus the card back and does not flip (D-SAVED-6). Confirm at Gate 1.
3. Reduced motion keeps muted autoplay (D-CLIP-10). Confirm at Gate 1.
4. Who performs the real-device playback check (R1, R2, R4)? It cannot be done from the sandbox.

**Lead answers:** (1) Keep the quiet end (D-FEED-3); the CEO may overrule at Gate 1. (2) Accepted. (3) Accepted. (4) The user, before release; flagged in the final report and `VALIDATION.md`.

## Status

| Task | Status |
|---|---|
| T0, T1, PLAN, P1-1, P1-2, P1-3, P1-4, P1-4b, P1-5, P1-6 | done |
| Gate 1 | APPROVED (see docs/gates/GATES.md for carry-overs) |
| P2-1, P2-2, P2-3 | done |
| Gate 2 | VETO 1, then APPROVED on re-review (depends on P2-4) |
| P2-4, P3-1, P3-2 | done (design system frozen) |
| Gate 3 | APPROVED |
| Known flake | KB-4 (M-mute, goToCard timeout) failed once in P2-2 and passed on the lead's re-run. P5-1 hardens it. |
