# CEO gate log

CEO persona: Jony Ive (chosen by the lead). Reviews run on the planning tier at medium effort.

## Gate 1: structure (grey-box wireframes), APPROVED

Pack: `docs/gates/p1/` (24 shots, 3 viewports).

Rulings:
1. Feed ends quietly at the last card: no end card, reshuffle or position indicator. Upheld.
2. Saved detail shows the card back and does not flip. Upheld.
3. Reduced motion keeps muted autoplay. Upheld on one condition: tap-to-pause with controls off must work on iOS. If it does not, cue the clip without autoplay under reduced motion. This is a manual device check (MAN list).

Carry-overs, each assigned to its owner:
- Feed back at 1440: the breakdown is orphaned about 200 px below the response. Move it directly under the response bubble, as the phone layout and the 1440 detail pane already do. Owner: P4-2.
- Desktop key-hint line: keep it very faint, or fade it after the first key use. Owner: P4-4.
- Detail at 1440: align the title to the content's left edge (it sits 16 px out). Owner: P4-5.
- Feed front at 1440: the ambient layer should make the empty right half feel intended. Owner: P2-1.
- Gate shots must include a saved group with 2+ rows, and must check last-row clearance under the phone nav (84 px). Owner: P2-2 (scripts/shots.cjs).

## Gate 2: direction and system, VETO 1 of 3

Keep: cue-first type scale, radii, chrome recipes, motion, the 1440 glow placement (Gate 1 carry-over met). It does not copy Brink.

Fixes (task P2-3, owned by the design system owner):
1. Card glass `glass-paint` reads as flat charcoal. Cut `--glass-shade` alpha from 0.28 to about 0.14 and tint it with the hue (`oklch(0.14 0.03 h)`). Re-run contrast.
2. Grain is invisible (sigma about 0.8/255). Raise `--grain-opacity` to about 0.14, or use `overlay`. Target sigma 2 to 3.
3. Rim and specular don't register. Set `--glass-specular` to about 0.12 and `--glass-rim` to about 0.32, top-left only. Keep `--glass-rim-low`.
4. Showcase card mock: re-shoot front and back in a viewport-height frame over the glow, in two hues, one of them warm.
5. Showcase Button focus-visible column looks the same as default. Fix the forced state.
6. Hue ring: 265/290/315 are indistinguishable and 15/40/65 go brown. Raise `hue-tag` and `hue-bubble` chroma to about 0.14, keeping text contrast at 5:1 or more.

Phase 4 notes: the front move label goes to `text-body` (15 px), optionally hue-tinted (P4-2). Apply `rounded-group` to saved groups (P4-5). Tighten the breakdown to the response bubble and the loose gap above the clip (P4-2). The re-gate needs only the showcase re-shot.

## Gate 2 re-review: APPROVED

All six fixes landed. The approval depends on P2-4, the contrast script reading live tokens, which must exit 0.

Carry-overs:
- Hue ring: 190/215 and 15/345 are still near-twins. Give every move in `moves.ts` its own clearly distinct hue (10 slots for 10 moves) rather than 8 shared ones. Owner: P3-2 (`move-hue.ts`, design system owner).
- Card back: the empty clip slab is the heaviest, deadest area. Give it a poster frame or hue wash while loading or in fallback. Owner: P4-3. Tighten the void between the tag and the first bubble. Owner: P4-2.
- Specular is held at 0.12 and must never be raised.

## Gate 3: component library, APPROVED

The ports read as native. NavPill, HeartToggle and Drawer are each the best version of themselves. Dropping Glass Card was right. Hues 20/50/80 read as rose, copper and amber. The tightest pair is 170/205: acceptable, but never move them closer.

Carry-overs:
- P4-5 (saved): move `detail-sheet.tsx` and `card-detail.tsx` to Drawer (D-SAVED-8). Use `DrawerTitle` for the cue so it outranks the body. Close with the glass circle, not a text pill.
- P4-6 (integration): once P4-5 has merged, delete the unused `Sheet`, `SheetGrabber` and `Dialog` primitives, leaving one sheet primitive. The lead authorises this one design-system edit.
- P4-1 (shell): `AppNav` always passes `active` to NavPill. The focus ring on the end item must not cross the pill outline.
- MAN (device check): saved rows with 170/205 and 245/275 side by side.

## Gate 4: screens, VETO 1 of 3 (narrow)

Structure matches p1/p3 on all 24 shots, and the hierarchy holds. Ruling: the phone back, stacked at the bottom with the tag beside the bubbles, is accepted. Do not revert it.

Fixes (task P4-9):
1. saved-bottom 390: the stuck search pill fuses with the group card below it. Extend the opaque band in `saved-search.tsx` to the pill's bottom edge plus a 16 px fade.
2. feed-back and detail, all viewports: there are two left edges. Remove the 4 px `px-1`/`pl-1` inset on the role labels, breakdown and source in `card-back.tsx`, leaving one edge.
3. feed-back-fallback: drop "Clip unavailable" to `text-body text-fg-secondary`, and the subline and icon to `fg-tertiary`.
Lead adds two notes:
4. Saved at 1440: tint the selected row with its move hue, not neutral grey.
5. The "Placeholder" source text must not ship. Omit `source` on the seed cards, since the field is optional.
Re-gate shots: saved-bottom-390, plus feed-back, feed-back-fallback and detail at 390 and 1440.

Phase 5 notes: verify the key-hint fade and the loading hue wash in a real browser run. Device checks owed (MAN): iOS tap-to-pause under reduced motion; hues 170/205 and 245/275 side by side.

## Gate 4 re-review: APPROVED

All five fixes landed: one left edge, a quiet fallback, the hue-tinted selected row, and no placeholder source.

Final-gate notes:
- saved-bottom 390: the card emerging under the stuck pill can read as a dropdown in a still. Judge it in motion. If it still reads as attached, strengthen the fade; do not add a divider.
- Confirm real embeds in a browser run (gate shots use the stub).
- Owed from Phase 5: key-hint fade, loading hue wash, device checks.
