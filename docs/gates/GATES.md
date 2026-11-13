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
