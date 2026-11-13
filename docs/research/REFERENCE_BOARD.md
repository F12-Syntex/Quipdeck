# Quipdeck Reference Board (R1)

Direction (updated): short YouTube clips of real unscripted wit. Card front = cue + move label + "Tap to reveal". Card back = move tag, 2-line dialogue, one-line breakdown, clip (autoplay muted, captions, loop), heart + mute. Saved = grouped by move A-Z, cue + response rows, search, tap opens full-card overlay. Dark first, phone-first, desktop-capable.

Note on specs: values below are measured from 300px-wide previews of ~393pt iPhone screens (scale ~1.31) and rounded. They are estimates for design intent, not exact Brink tokens.

Images (hi-res, local): [images/](images/)

## 1. Brink system extraction (tokens observed)

Brink screens: [now playing dark](https://mobbin.com/screens/e39701ce-59d7-4e7d-890c-ff065f52f620), [summary glass sheet](https://mobbin.com/screens/043b02a2-60d0-4478-bb09-6e537a2a6e17), [episode sheet](https://mobbin.com/screens/6afbd1f6-685a-4775-ac2d-a06764d9201e), [home light + tab bar](https://mobbin.com/screens/ad3cf0b5-a9b6-4366-a31e-79c35d2a7234), [trending carousel + tab bar](https://mobbin.com/screens/5844efc6-3b56-4198-bb54-4e628a96f6ae), [light list sheet](https://mobbin.com/screens/9129b7d7-485d-4e8e-bf7a-d8aa158f9f28), [dark queue sheet](https://mobbin.com/screens/ed165a51-c365-4165-a3e2-c6c5f74ddf47), [library w/ search+chips](https://mobbin.com/screens/1f1b08f2-c1d0-4c0d-a512-ff245eb6bfdd).

- Ambient background: whole screen is a deep tint pulled from the artwork (dark espresso brown, ~#2A140C to #3A1E12, vertical gradient slightly lighter at top). Light mode: near-white with a faint warm/cool wash at the top (cream, mint, peach, sky) that changes per screen and fades to white by ~40% height. Colour temperature warm. Card artwork casts a soft same-hue glow/shadow (large blur, ~30-40px, low opacity).
- Screen container: whole app view has large top corner radii (~44-48px) when a sheet sits over it; sheets have ~36-40px top radii.
- Artwork card: ~ 76% of screen width, square, radius ~24-28px (looks like ~28), no border, soft shadow tinted by artwork.
- Glass sheet: height ~55% of screen, top radii ~36px, grabber 36x5px pill centered ~8px from top, tinted frosted (dark: ~brown-black at ~70-80% opacity over blurred art; light: white at ~85%, faint inner hairline). Title centered 17px semibold; circular glass button at left or right of title row (close X or Clear/Done pill).
- Circular icon buttons: 44-48px diameter, glass or white fill (light: white ~90% + soft shadow; dark: white ~10-14% fill + blur), icon 20-22px, placed top-left/top-right at ~16-20px inset. Centered pill label at top (e.g. "Queue", ~34px tall, ~14px medium, glass fill) between them.
- Pill buttons: height 44-52px, fully rounded; primary = solid tint (brown "Now Playing", blue "Play Latest", black "Create Smart Download") with white 16-17px semibold label; secondary = white/glass with dark label and hairline. Action chips row ("2 Bookmarks", "Transcript", "Summary"): ~36px tall, 14px medium, translucent fill (~8-10% white) with 1px hairline (~15% white), icon 16px left; horizontally scrollable, clipped at edge to hint scroll.
- Floating tab bar: detached pill, ~16px from side edges and ~12px above bottom, height ~62px, radius full (~31px), white ~80% + blur ~24px + soft shadow; 4 items (Home, Library, Discover, Search) icon 24px + 11px label; active item gets a rounded-rect highlight capsule (~#E8E8EC light) with accent-colour icon (navy-blue). A mini player strip sits under it, full-bleed with tinted artwork colour.
- Type (SF-like): screen titles centered 17px semibold; hero headings 28-32px bold (e.g. "In Progress"); eyebrow label 11-12px semibold, letterspaced ~0.12em, uppercase, grey (e.g. "CONTINUE LISTENING"); body/sub 14-16px, secondary text grey ~#8A8A8E (light) or ~white 55% (dark); list titles 17px semibold, meta 13px regular.
- Grouped list (light sheet): inset white rounded group, radius ~20-24px, 16px inner padding, rows ~64-72px, 1px inset hairline starting after thumbnail, small grey section label ("Source episodes") 13px above the group; thumbnails 48px radius ~10px.
- Empty states: centered column in vertical middle: 40-48px outlined grey icon (~grey 50%), 20px bold title ("No Starred Items"), 14px grey one-line helper, optional black/primary pill CTA. Tab bar stays visible. Dark empty state lives inside a dark glass sheet with same layout.
- Chips filter row (library): search icon in a 44px circular pill + segmented pills "Newest / Oldest / Just Started"; selected = solid black with white text, others white with hairline; pill height ~40px, 15px medium.
- Toast: dynamic-island style black capsule at top ("Added to Queue / In Progress"), icon left 24px, title 14px semibold + 12px grey subtitle, radius full.
- Confirm popover: frosted glass popover with arrow, red "Delete All" label on a secondary glass button.

## 2. Per-screen board

### Feed card front (cue + move + "Tap to reveal")
- Brink [now playing](https://mobbin.com/screens/e39701ce-59d7-4e7d-890c-ff065f52f620): one dominant card centred on tinted ambient bg, circular buttons top-left/right, pill label top-centre. Reuse: card ~ 88% width on phone, radius 36-40px, glass border.
- TIDE [full-screen quote](https://mobbin.com/screens/33b9e68f-fe96-4f49-bb79-e166ea0809b1): text bottom-left aligned, ~20px medium white, 1px short divider, italic attribution 12px; icons top row. Takeaway: big text anchored low-left reads calm; for us centre the cue vertically.
- Tolan [quote card](https://mobbin.com/screens/5369d396-8ca8-43dd-ae76-a63e23c5660a): dark purple with grain/particles and glowing card; small uppercase tracked tag under text in accent colour. Takeaway: tiny tracked tag + glow = our "move" label style.
- How We Feel [quote deck](https://mobbin.com/screens/9e315dcf-ce2c-49e4-a332-687b5be02662) shows the next card peeking at right edge; Me+ [full-bleed quote](https://mobbin.com/screens/300fe0ea-07f4-495b-bdcc-91ce06541a85) bottom-left pill + bottom-right circular buttons.
- Flashcard hints: Nibble [tap card to see image](https://mobbin.com/screens/fcea425c-5ec6-4ed4-9387-21b7af733f6e) puts "Tap the card to see the image" 13px semibold grey 24px below the card; Deepstash [tap to reveal](https://mobbin.com/screens/3daab469-5284-4e39-986a-03fe55e8b846) puts the hint inside the card with a pulsing circle; CapWords [card](https://mobbin.com/screens/3251eb57-f387-4092-8e99-b46d763915c3) has a radius ~32px card with speckle grain.
- Specs for Quipdeck: cue 30-34px bold (line-height 1.15, max 4 lines, balanced wrap); move label 15px medium in a glass pill with accent hue; "Tap to reveal" 13px, 55% opacity, 4s soft pulse.

### Card back (move tag, dialogue, breakdown, clip)
- Dialogue bubbles reference: Locket [chat](https://mobbin.com/screens/1144d7a0-69bb-467b-aaea-ba803b5a3640), BeReal [chat](https://mobbin.com/screens/2816e84d-5160-4a6e-a655-716055c41da9), One [chat](https://mobbin.com/screens/d6ce8ecf-0b8a-47e5-ada2-b905b07b3f05), XChat [chat](https://mobbin.com/screens/9e8dcf0d-1a9a-41ef-b72f-04ae267e3b37): dark bubbles ~#262628 (left, other speaker) vs light/accent bubble (right, you); bubble radius ~20px with one tighter tail corner, padding 10x14, text 15-16px; speaker label above 12px grey 600; timestamps 11px grey. Use left bubble = trigger speaker, right bubble tinted accent = response speaker (the witty line), so the response reads as the punchline.
- Video with captions: Me+ [video](https://mobbin.com/screens/b1fe6829-92cc-4ddf-a9fd-b06b1649622f) bold white captions with black stroke, bottom-third, mute icon top-right as plain glyph; Liven [player](https://mobbin.com/screens/ea028f4f-9e81-4d6d-b3e6-052d28a36b60) mute glyph top-right, CC toggle bottom; Speak [captions](https://mobbin.com/screens/1286890b-a9fc-47d4-994e-463c0084f270) shows CC OFF / CC toggle; Hers [player](https://mobbin.com/screens/932f6977-d051-4d69-82d3-75a45a5396dc). Takeaway: clip is 9:16 or 16:9 rounded ~24px, captions burned in bottom third, mute is a glass circle 40px bottom-right of the clip.
- Video error: Grok [error](https://mobbin.com/screens/fe248bef-19ec-4f49-b83b-0096463a9c65) uses a small glass pill with warning icon over a dimmed frame ("Server failed to respond"), controls stay in place; Finch [error](https://mobbin.com/screens/eaebf4be-46a2-4769-b6d9-189dd755756e) full-screen message. Takeaway: keep the clip box, dim it, show a pill "Clip unavailable" + "Retry" text button; the text exchange stays fully usable.
- Layout (phone, 393x852): top row circular buttons (close/flip back optional) at y=16; move tag pill; bubbles; breakdown 15px at 70% white; clip 16:9 rounded 24px width = card inner width; action row: heart (44px glass circle) + mute (44px glass circle) bottom.

### Saved list grouped by move A-Z, with search
- Brink [light list sheet](https://mobbin.com/screens/9129b7d7-485d-4e8e-bf7a-d8aa158f9f28) = grouped rounded inset list with small section label; Brink [library header](https://mobbin.com/screens/1f1b08f2-c1d0-4c0d-a512-ff245eb6bfdd) = circular search button + pills row; Alexa [grouped list](https://mobbin.com/screens/258bd315-20d7-462c-be87-d6cc5ed5e23f) = uppercase section headers with counts "HOUSEHOLD (3)" on a grey band; LinkedIn [saved](https://mobbin.com/screens/8013b997-467a-4fce-9054-6bc5078f5181) = counts per group; X [bookmarks](https://mobbin.com/screens/917d38af-a1b1-4875-81eb-b554f18b183c) = full-width search field at top (pill, ~44px, magnifier + placeholder).
- Spec: large title "Saved" 32px bold; search = full-width glass pill 48px with magnifier, collapses into the circular button on scroll; group = sticky small caps header "Take it literally · 3" 12px tracked; rows 72px: cue 15px semibold (1 line), response line 14px 65% white (1-2 lines, italic optional), heart-filled glyph right; inside rounded 24px glass group, hairline dividers inset 16px. Alphabet fast-scroll rail optional on desktop only.
- Tap row -> full-card overlay: see Navigation; use Brink sheet pattern (grabber + glass) but scaled to ~92% height with the full card back (same component as feed back).

### Empty states
- Brink [Starred](https://mobbin.com/screens/0b90af96-2b9f-472f-9256-34f6aef4f20c), [Saved Articles](https://mobbin.com/screens/63476c8d-0a77-41a7-90c8-de4066c6a751), [Downloads](https://mobbin.com/screens/1d3f7039-98ed-4760-93d3-bc08368bce59), [dark Queue empty](https://mobbin.com/screens/a79b557b-7c75-4ba4-acf2-0aee23545c5a), [Smart Downloads w/ CTA](https://mobbin.com/screens/9818825c-f9ab-47c7-9eb4-577f7d89a10f). Pattern: 48px outlined icon, 20px bold title, 14px grey single line, optional pill CTA, nothing else.
- Quipdeck copy suggestions: Saved empty "Nothing saved yet" / "Tap the heart on a card to keep it here." with a pill "Back to feed". Search no-results "No matches" / "Try a different word." Clip error as above.

### Navigation mobile
- Brink floating tab bar ([home](https://mobbin.com/screens/ad3cf0b5-a9b6-4366-a31e-79c35d2a7234)). For Quipdeck: only 2 tabs (Feed, Saved) so make the bar narrower (~200px wide, centered, not full-width), 56px tall, active capsule highlight. Auto-hide during clip playback scroll, show on tap. Blinkist [bar](https://mobbin.com/screens/1f6f9b84-3a31-46d7-8af7-3ab7c5914b2a) shows a similar floating bar with active capsule over a full-height card feed.
- Vertical feed: scroll-snap (y mandatory), one card per viewport, next card peeks 0 (full-screen); use dvh units; top safe-area gradient scrim.

### Navigation desktop
- Threads [web](https://mobbin.com/screens/c590c987-4b98-4f8f-b26a-55f34c7a21ac), X [web](https://mobbin.com/screens/8bf43a03-a762-41b3-93be-15a10353eabf), Substack [web](https://mobbin.com/screens/48cf75bd-3095-4a47-a942-938f9b4a3363): left icon+label rail ~240px (or icon-only 72px), centered content column ~600px, right column optional. Quipdeck desktop: no right column. Left glass rail (Feed, Saved) icon-only 72px; centre a phone-proportioned card column (max width ~440px, height min(100dvh - 48px, 860px)), ambient glow fills the rest; keyboard: Space/Enter flips, Up/Down or J/K navigates, S/H saves, M mutes. Saved on desktop: two-pane (list left ~420px, card right) instead of overlay.

## 3. UX recommendations (<= 12)

1. One card = one viewport (`100dvh`, scroll-snap y mandatory, `scroll-snap-stop: always`) so exposure is paced and calm; no auto-advance.
2. Flip = 3D rotateY 180deg, 550-650ms, spring (stiffness ~180, damping ~24); perspective 1200px; backface hidden; add a faint specular sweep during flip.
3. Autoplay muted clip only when the back face is showing and the card is >60% visible (IntersectionObserver); pause and unmount all other players; loop; preload nothing off-screen.
4. Captions on by default (burned in or WebVTT track); mute is a glass circle toggle with state remembered; unmute never auto-persists across sessions without intent.
5. Error fallback: keep the clip frame, dim it, glass pill "Clip unavailable" + Retry; exchange text and breakdown remain. Never show a blank hole.
6. Dialogue styling: trigger bubble left in neutral glass, response bubble right in accent tint (~20% opacity fill, 1px 30% border); speaker names 12px above each bubble.
7. Heart is the only save affordance: 44px target min, filled-heart spring (scale 1 -> 1.25 -> 1, 250ms), soft haptic via `navigator.vibrate(8)` where supported, small toast capsule "Saved" 1.4s.
8. "Tap to reveal" fades after the first 3 flips per device (localStorage, try/catch) to stay calm.
9. Saved: sticky group headers A-Z by move, live client-side search over cue + response + speaker names; keep headers with counts; empty groups hidden while searching.
10. Full-card overlay from Saved: shared-element expansion from the row (layoutId), 92% height glass sheet with grabber, swipe-down to dismiss, Esc on desktop, focus trap, back face shown by default.
11. Contrast: dark surfaces #0B0B0F to #14141A base, text 92% white, secondary 60% white; verify >= 4.5:1 for secondary on glass; honour `prefers-reduced-motion` (no flip spin, crossfade; no autoplay shader) and `prefers-reduced-transparency`.
12. Ambient layer: one slow gradient (hue derived per move, 40-60s drift), grain overlay at 4-6% opacity (SVG feTurbulence, static, `mix-blend-mode: overlay`), glow behind card at 25-35% opacity; disable animation on low-power / reduced-motion and cap to a single canvas or CSS layer.

## 4. 21st.dev candidates (metadata only; get_component not called)

| Need | Name | id | URL | Why |
|---|---|---|---|---|
| Flip card | Tilt Flip Card | 12635 | https://21st.dev/@cesaroeduardo/components/flip-card | Controlled flip state + tilt; suits externally driven flip |
| Flip card | Flip Card | 26139 | https://21st.dev/@skyleen77/components/flip-card | Tap-to-flip front/back structure |
| Glass card | Glass Card | 28259 | https://21st.dev/@educalvolpz/components/glass-card | Refractive rim + specular highlight + drop shadow, ideal signature layer |
| Glass card | Glassmorphism Folder Cards | 37625 | https://21st.dev/@kedhareswer/components/glass-folder-cards | Reference for grouped-by-move folder idea in Saved |
| Liquid glass button | Liquid Glass Button (draggable pill, SVG displacement) | 44445 | https://21st.dev/@aakashmehra/components/liquid-glass-button | Real refraction with Safari/Firefox fallback |
| Liquid glass button | Liquid Glass Button | 3166 | https://21st.dev/@designali-in/components/liquid-glass-button | Simple CSS glass pill |
| Dock / tab bar | Bottom Nav Bar | 8343 | https://21st.dev/@arunachalam/components/bottom-nav-bar | Pill tab bar, active label animates in, framer-motion, sticky bottom prop |
| Dock / tab bar | Floating Dock Navigation | 8476 | https://21st.dev/@erikvalencia1/components/floating-dock-navigation | Desktop floating dock magnify |
| Gradient / aurora bg | Aurora Blur | 18505 | https://21st.dev/@unlumen/components/aurora-blur | Soft WebGL aurora layer |
| Gradient / aurora bg | LiquidAurora | 7937 | https://21st.dev/@dhileepkumargm/components/liquid-aurora | Pure CSS fallback (cheap on phones) |
| Gradient / aurora bg | Aurora Flow | 7624 | https://21st.dev/@ruixen.ui/components/aurora-flow | OGL shader aurora with noise distortion |
| Grain / noise | Grain Gradient | 17835 | https://21st.dev/@paper-design/components/grain-gradient | Paper Shaders grain gradient, zero-dep, Apache-2.0 |
| Grain / noise | Grainy Light Leak Shader | 36552 | https://21st.dev/@kedhareswer/components/velvet-haze | Film grain light leak, dark base |
| Grain / noise | Noise Field | 43818 | https://21st.dev/@bagherifarzad/components/noise-field | Subtle animated noise/blob layer |
| Video player | Video Player (composable) | 30231 | https://21st.dev/@mohammadshehadeh/components/video-player | Controls fade out while playing; we only need mute, so use as pattern |
| Video player | Video Player (compact) | 36555 | https://21st.dev/@syeddhasnainn/components/video-player | Keyboard shortcuts, compact |
| Toast | Sonner Toast | 27363 | https://21st.dev/@isaiahbjork/components/primitive-sonner | shadcn-standard toast for "Saved" |
| Heart / bookmark | Heart Button | 1695 | https://21st.dev/@ozantekin/components/heart-button | Animated like toggle |
| Heart / bookmark | Heart Favorite | 10627 | https://21st.dev/@moumensoliman/components/heart-favorite-shadcnui | Minimal animated heart |
| Chat bubbles | Chat Bubble Thread | 29393 | https://21st.dev/@bundui/components/bubble6 | Two-sided bubble layout with muted other-sender bubbles |
| Chat bubbles | Chat Bubble Reactions | 28759 | https://21st.dev/@bundui/components/bubble4 | Alignment variants |
| Search | Command Search | 28888 | https://21st.dev/@arihantcodes_1f7b8c4d/components/command-search | Live-filter grouped results pattern |
| Search | Component Search | 27914 | https://21st.dev/@uiable/components/component-search | Simple input with leading icon |
| Overlay / modal | Reshaped Modal | 17826 | https://21st.dev/@reshaped/components/reshaped-modal | Bottom + full-screen positions, scroll lock, focus mgmt |
| Overlay / modal | Modal | 23539 | https://21st.dev/@ddoemonn/components/modal | Focus trap, Esc dismissal |
| Tag chips | Pill | 1600 | https://21st.dev/@haydenbleasel/components/pill | Small label pill base for move tags |
| Tag chips | Chip | 13842 | https://21st.dev/@hero_ui/components/heroui-chip | Variant set for tags |
| Empty state | Empty State | 27575 | https://21st.dev/@wensity/components/empty-state | Icon + title + description + action |
| Skeleton | Skeleton Swap | 23557 | https://21st.dev/@ddoemonn/components/skeleton-swap | Crossfade with no layout shift (card front/back) |
| Grouped list | Accordion Multiple | 29251 | https://21st.dev/@uiable/components/accordion-multiple | Optional collapsible move groups |

## 5. Dribbble / web / motion refs

Dribbble pages did not surface via web search (not indexed); the following are the useful web references found instead. Next step if desired: manual Dribbble browse for "liquid glass iOS 26".

- Liquid glass on the web, 6 CSS/SVG methods: https://dev.to/devyatov/liquid-glass-on-the-web-6-ways-to-build-it-with-css-and-svg-3m07 (SVG feDisplacementMap refraction; fallback to heavier blur plus edge gradient)
- CodePen SVG displacement glass card: https://codepen.io/Sachin-Kizhakkepurath/pen/VYPpWvB (bends backdrop; copy fallback strategy)
- LogRocket liquid glass with CSS and SVG: https://blog.logrocket.com/how-create-liquid-glass-effects-css-and-svg (step-by-step refraction + specular highlight)
- Linear's liquid glass writeup: https://linear.app/now/linear-liquid-glass (they skipped refraction; justification for a restrained approach)
- Glassmorphism vs liquid glass 2026: https://setproduct.com/blog/liquid-glass-vs-glassmorphism (opacity/blur ranges and when to use)
- Kokonut UI card flip: https://www.mintlify.com/kokonut-labs/kokonutui/components/cards/card-flip (180deg Y-axis rotation, perspective, preserve-3d, hidden backface)
- Educative glass flip card: https://www.educative.io/courses/css-design-patterns/lta/glass-flip-card (3D rotation with glass faces)
- Superdesign glassmorphism card: https://www.superdesign.dev/styles/glassmorphism/card (near-black backdrop + radial glow behind the glass)
- Paper Shaders (grain gradient source): https://github.com/paper-design/shaders (Apache-2.0 shader library behind 21st Grain Gradient)

Starting numbers for glass (tune by eye): dark surface `rgba(255,255,255,0.08)` fill, `backdrop-filter: blur(24px) saturate(1.6)`, 1px `rgba(255,255,255,0.14)` border, inner top highlight `inset 0 1px 0 rgba(255,255,255,0.18)`, shadow `0 20px 60px rgba(0,0,0,0.45)`; light surface `rgba(255,255,255,0.72)` with same blur.

## 6. Downloaded images (images/)

- brink-now-playing-dark-ambient.jpg (card on tinted ambient bg, top circular buttons + pill, action chips)
- brink-glass-sheet-summary-grabber.jpg (glass sheet with grabber over card)
- brink-dark-glass-sheet-queue.jpg (dark sheet, row with pill action buttons)
- brink-floating-tabbar-trending-carousel-light.jpg (floating tab bar + large rounded card)
- brink-home-light-tabbar-pill-buttons.jpg (light home, pill buttons, tab bar)
- brink-light-sheet-episodes-grouped-list.jpg (grouped inset list in light sheet)
- brink-empty-state-starred-tabbar.jpg (empty state pattern)
- brink-library-search-chips-header.jpg (search button + pill filter row + destructive popover)
- tide-fullscreen-quote-card.jpg (full-screen quote card layout)
- speak-video-captions-controls.jpg (video captions + CC + controls)
- grok-video-error-pill-glass-controls.jpg (video error pill)
- desktop-threads-web-feed-layout.jpg (desktop feed layout)
