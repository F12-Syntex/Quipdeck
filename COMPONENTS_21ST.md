# 21st.dev components (P3-1 scout)

Owner: P3-1 (scout), then P3-2 (design system owner: adapt, integrate, fill the Status column). Inputs: `docs/research/REFERENCE_BOARD.md` section 4, `DESIGN_SYSTEM.md`, Gate 2 rulings in `docs/gates/GATES.md`.

The design system is approved and frozen. Fetched code is a **pattern source** to port onto our tokens in P3-2 (Base UI, `framer-motion`, dark only, reduced motion, no `backdrop-filter` on rotating faces, specular never above 0.12). It is never a restyle. Anything that is not calmer than the P2 version is dropped in P3-2 and the reason recorded here.

Every element began with a free `search`. Four components were fetched with `get_component` (the cap). None came back locked or not found. The account is on the paid tier, and the quota fields came back empty (`remaining: null`), so no daily number was reported.

## 1. Decisions (one row per element)

Decision: **fetch** (source saved under `src/components/ui/x21/`), **pattern only** (studied from metadata and preview, no code fetched), **skip**.

| Element | Candidate | id | URL | Decision | Where used | Fallback (shadcn or hand-built) | Notes for P3-2 | Status (P3-2) |
|---|---|---|---|---|---|---|---|---|
| Card glass | Glass Card | 28259 | https://21st.dev/@educalvolpz/components/glass-card | fetch | Card front and back faces, skeleton card (P4-2) | Existing `glass-paint` + `glass-rim` recipes (hand-built, P2) | Take only the layering idea: inset polished edge (`BODY_EDGE`), `INNER_RING`, `BOTTOM_SHADE`, layered drop shadow, ring mask. Strip `backdrop-filter`, the SVG displacement rim, pointer-tracked specular and sweep, the chromatic cyan/magenta rim and the hover lift. Faces rotate, so the specular is static and capped at 0.12. Raw file needs `motion/react` (not installed) and calls setState inside an effect (`react-hooks/set-state-in-effect`), so it is parked as `.txt`. | |
| Nav pill | Bottom Nav Bar | 8343 | https://21st.dev/@arunachalam/components/bottom-nav-bar | fetch | `AppNav`, phone bottom centre and desktop top centre (P4-1) | Hand-built `glass-chrome rounded-pill` with Next `Link`s and a `framer-motion` `layoutId` capsule on `--control-active` | Swap the six demo items for Feed and Saved. Swap `bg-card` for `glass-chrome`, and the `primary/10` active fill for `--control-active`. Remove `focus-visible:ring-0`, which breaks the focus rule. Remove the mount scale-in. Make the label width spring calmer, or drop it if both labels always show. Compiles as-is. | |
| Heart | Heart Favorite | 10627 | https://21st.dev/@moumensoliman/components/heart-favorite-shadcnui | fetch | Card back heart button; detail sheet and pane heart (P4-2, P4-5) | `Button variant="glass" size="circle"` + lucide `Heart` + `heartSpring` / `heartScale` from `motion.ts` | Replace the 1.3 pop with `heartScale` (1.18). Swap `red-500` and `gray-*` for tokens. Add `aria-pressed` and a label, and drop the hover background in favour of `glass-control`. No pop under reduced motion. Compiles as-is. | |
| Move tag | Pill | 1600 | https://21st.dev/@haydenbleasel/components/pill | pattern only | Card back move tag, Saved group label (P4-2, P4-5) | Existing `Badge variant="move"` (`hue-tag`) | Our Badge already covers it; we only check pill padding and icon slot. | |
| Bubbles | Chat Bubble Thread | 29393 | https://21st.dev/@bundui/components/bubble6 | pattern only | Card back trigger and response lines (P4-2) | Hand-built bubbles: `glass-bubble` (trigger) and `hue-bubble` (response), `rounded-bubble`, `text-line` | In-house per the plan. Pattern: grouping and alignment of the two sides, muted other-speaker bubble. | |
| Search field | Component Search | 27914 | https://21st.dev/@uiable/components/component-search | pattern only | Saved sticky search (P4-5) | Existing `Input variant="chrome"` + lucide `Search` at `z-10` + `Button variant="quiet" size="pill-sm"` "Clear search" | Pattern: leading icon inset. HeroUI Search Field 16266 used as the clear-button pattern reference. | |
| Sheet | Drawer (Base UI) | 24837 | https://21st.dev/@base-ui/components/drawer-base | fetch | Phone detail bottom sheet (P4-5) | Existing `Sheet` (Base UI Dialog, `glass-chrome-strong`, `SheetGrabber`) + the grabber drag in `src/components/saved/detail-sheet.tsx` | Built on `@base-ui/react/drawer`, which ships in the installed Base UI 1.9, so the fetched file compiles as-is. Base UI's native swipe-to-dismiss and `--drawer-swipe-progress` backdrop fade could replace the hand-rolled grabber drag. P3-2 decides whether to adopt it, keeping the sheet's `data-slot`s and the inventory hooks. Swap `bg-background`, `rounded-t-2xl`, the 450 ms curve and `backdrop-blur-3xl` for `glass-chrome-strong`, `rounded-t-sheet`, `--dur-sheet` / `ease-soft` and `--surface-scrim`. Ignore the nested-drawer and indent parts. The registry also bundled a Radix `button.tsx` (`@radix-ui/react-slot`), which was not saved; use our Base UI `Button`. | |
| Skeleton | Skeleton Swap | 23557 | https://21st.dev/@ddoemonn/components/skeleton-swap | pattern only | Feed skeleton card, Saved skeleton rows, clip loading (P4-3, P4-4, P4-5) | Existing `Skeleton` + `animate-ready-fade` | Pattern: reserved box and crossfade with no layout shift. Shapes Skeleton 29863 confirms our calm pulse plus reduced-motion stop. | |
| Empty state | Empty | 19745 | https://21st.dev/@cnippet-dev/components/cnippet-empty | pattern only | Saved empty and no-results states (P4-5) | Hand-built block: `text-heading` title, `text-body` `--fg-secondary` helper, optional `quiet` action | Pattern: header / media / title / description / content slots, no dependencies. | |
| Ambient / grain | Grain Gradient | 17835 | https://21st.dev/@paper-design/components/grain-gradient | pattern only | Root ambient layer | Existing `AmbientLayer` (static SVG `feTurbulence` grain, CSS glow drift) | Not fetched (deviation from the plan shortlist). It is an animated WebGL shader with a loud four-colour palette. The approved ambient is a static grain and a slow CSS drift, and an animated glow was already tried and rejected (`DESIGN_SYSTEM.md` section 5). Nothing to port. | |
| Dialogue exchange | Chat Messages | 20130 | https://21st.dev/@solaceui/components/chat-messages-2 | pattern only | Card back two-line exchange (P4-2) | Hand-built (D-FLIP / in-house dialogue) | In-house per the plan. Pattern only for spacing between turns; no reveal-one-by-one animation (one moving thing at a time). | |
| Grouped list | List Group Custom Content | 29346 | https://21st.dev/@uiable/components/list-group-custom-content | pattern only | Saved groups and rows (P4-5) | Hand-built `rounded-group` list, `border-hairline` dividers, `text-eyebrow` group label | Pattern: heading, meta and supporting text per row. The solid accent active row is replaced by the selected-row style in the desktop master-detail. Preferences Card 30553 is a second reference for the inset card group. | |
| Video frame | YouTube Video Player | 18229 | https://21st.dev/@cult-ui/components/youtube-video-player | pattern only | Clip frame on the card back: poster or hue wash while loading or in fallback (P4-3, Gate 2 carry-over) | Hand-built `rounded-clip` frame with a `--hue-glow-soft` wash, `Skeleton`, `animate-ready-fade` | The clip engine is in-house (D-CLIP). Pattern only: thumbnail as a poster under the iframe. The modal-expand behaviour is out of scope. Video Thumbnail Player 4586 is a second poster reference. | |

## 2. Fetched files (`src/components/ui/x21/`)

Saved exactly as returned by `get_component` (component code and demo). Nothing in this folder is imported by the app.

| File | From | Compiles as-is | Why parked |
|---|---|---|---|
| `glass-card.tsx.txt` | 28259 component | no | Imports `motion/react` (not a dependency; we use `framer-motion`); setState in an effect fails `react-hooks/set-state-in-effect` |
| `glass-card.demo.tsx.txt` | 28259 demo | no | Imports `@/components/ui/glass-card` (registry path) |
| `bottom-nav-bar.tsx` | 8343 component | yes | |
| `bottom-nav-bar.demo.tsx.txt` | 8343 demo | no | Imports `@/components/ui/bottom-nav-bar` (registry path) |
| `heart-favorite.tsx` | 10627 component | yes | |
| `heart-favorite.demo.tsx.txt` | 10627 demo | no | Imports `@/components/ui/heart-favorite-shadcnui` (registry path) |
| `drawer-base.tsx` | 24837 component | yes | |
| `drawer-base.demo.tsx.txt` | 24837 demo | no | Imports `@/components/ui/drawer-base` (registry path) |

Exclusions from lint and `tsc`: none in config. The `.txt` suffix keeps the files above out of both, so `tsconfig.json` and `eslint.config.mjs` are unchanged. No dependency was added: the one missing package (`motion`) has a drop-in equivalent in `framer-motion`, and the Radix `button.tsx` bundled with 24837 was not saved.

The `npx shadcn add` install commands were not run. They write into `src/components/ui/` and may touch `components.json`, `globals.css` and `package.json`, which this task does not own.

## 3. Candidate log (every search hit considered)

Source: `search` results from this task unless marked "board" (listed on the reference board, not re-surfaced by a search).

| Element | Candidate | id | URL | Verdict |
|---|---|---|---|---|
| Card glass | Glass Card | 28259 | https://21st.dev/@educalvolpz/components/glass-card | fetched |
| Card glass | Liquid Glass | 40333 | https://21st.dev/@manuarora700/components/liquid-glass | no: SVG displacement through `backdrop-filter`, banned on rotating faces |
| Card glass | Glass Shine Card | 7717 | https://21st.dev/@dhileepkumargm/components/glass-shine-card | no: animated shine and gradient orbs, loud |
| Card glass | Glare Cards | 10904 | https://21st.dev/@daiwiikharihar/components/glare-cards | no: 3D tilt and cursor glare |
| Card glass | Glass Card (3D) | 2696 | https://21st.dev/@Smit-Prajapati/components/glass-card | no: 3D tilt card |
| Card glass | Fractal Glass | 26089 | https://21st.dev/@hyperiux/components/fractal-glass | no: WebGL strip refraction |
| Card glass | Glassmorphism Folder Cards (board) | 37625 | https://21st.dev/@kedhareswer/components/glass-folder-cards | no: folder metaphor not in the layout plan |
| Card glass | Liquid Glass Button (board) | 44445 | https://21st.dev/@aakashmehra/components/liquid-glass-button | no: SVG displacement, draggable |
| Card glass | Liquid Glass Button (board) | 3166 | https://21st.dev/@designali-in/components/liquid-glass-button | no: `glass-control` already covers it |
| Nav pill | Bottom Nav Bar | 8343 | https://21st.dev/@arunachalam/components/bottom-nav-bar | fetched |
| Nav pill | Expanding Tabs | 30168 | https://21st.dev/@aicanvas/components/expanding-tabs | runner-up: same active-label morph |
| Nav pill | Pill Morph Tabs | 7878 | https://21st.dev/@ruixen.ui/components/pill-morph-tabs | no: spring overshoot on the pill |
| Nav pill | Capsule Tabs | 7884 | https://21st.dev/@ruixen.ui/components/capsule-tabs | no: paginated tabs, two items only here |
| Nav pill | Tabs (coss, pill) | 11641 | https://21st.dev/@coss.com/components/tabs | no: tab panels, not route nav |
| Nav pill | Reshaped Tabs | 18325 | https://21st.dev/@reshaped/components/reshaped-tabs | no: tab panels |
| Nav pill | Tabs Subtle | 24960 | https://21st.dev/@micka_design/components/tabs-subtle | no: Radix Tabs |
| Nav pill | Floating Nav | 5840 | https://21st.dev/@ruixen.ui/components/floating-nav | runner-up: sliding underline, not a capsule |
| Nav pill | Floating Navbar | 18090 | https://21st.dev/@arihantcodes_1f7b8c4d/components/floating-navbar | no: dropdown menu |
| Nav pill | Bottom Menu | 10458 | https://21st.dev/@0xUrvish/components/bottom-menu | no: heavier animation |
| Nav pill | LumaBar | 5841 | https://21st.dev/@ruixen.ui/components/futuristic-nav | no: glowing gradient indicator, loud |
| Nav pill | Adaptive Notch Navigation Bar | 25735 | https://21st.dev/@arunachalam/components/adaptive-notch-navigation-bar | no: multi-island desktop layout |
| Nav pill | Floating Dock Navigation | 8476 | https://21st.dev/@erikvalencia1/components/floating-dock-navigation | no: magnify dock, two items only |
| Nav pill | NotchNav | 8317 | https://21st.dev/@jatin-yadav05/components/notch-nav | no: notch indicator, not a capsule |
| Nav pill | Navbars | 4878 | https://21st.dev/@arihantcodes_1f7b8c4d/components/navbars | no: site header |
| Nav pill | Navigation Bar (originui) | 3379 | https://21st.dev/@originui/components/navigation-menu-4 | no: site header |
| Nav pill | Navigation Bar (originui) | 3012 | https://21st.dev/@originui/components/navigation-bar | no: site header |
| Heart | Heart Button | 1695 | https://21st.dev/@ozantekin/components/heart-button | no (deviation from the shortlist): counter and celebration effects, not calmer |
| Heart | Heart Favorite | 10627 | https://21st.dev/@moumensoliman/components/heart-favorite-shadcnui | fetched |
| Heart | Like Burst | 23534 | https://21st.dev/@ddoemonn/components/like-burst | no: spark burst and count |
| Heart | Heartbeat Effect Button | 10210 | https://21st.dev/@shadcnspace/components/heartbeat-effect-button | no: looping heartbeat |
| Heart | Button (originui) | 141 | https://21st.dev/@originui/components/button | no: our `Button` already covers it |
| Heart | Send Button | 5976 | https://21st.dev/@m.umairwaheedansari/components/send-button | no: unrelated |
| Move tag | Pill | 1600 | https://21st.dev/@haydenbleasel/components/pill | pattern only |
| Move tag | Interfaces Badge | 11843 | https://21st.dev/@jshguo/components/interfaces-badge | no: same as our Badge |
| Move tag | Filter Badge | 519 | https://21st.dev/@serafimcloud/components/filter-badge | no: removable filter |
| Move tag | Chip (HeroUI) | 13842 | https://21st.dev/@hero_ui/components/heroui-chip | no: HeroUI runtime |
| Move tag | Badge Tag | 6952 | https://21st.dev/@prebuiltui/components/badge-tag | no: light theme |
| Move tag | Tier Badge | 39030 | https://21st.dev/@abushaidislam7/components/tier-badge | no: glow accents, loud |
| Bubbles | Chat Bubble Thread | 29393 | https://21st.dev/@bundui/components/bubble6 | pattern only |
| Bubbles | Chat Bubble Thread (links) | 28561 | https://21st.dev/@bundui/components/bubble5 | no: link and button bubbles |
| Bubbles | Message Bubble (framecn) | 34988 | https://21st.dev/@framecn/components/message-bubble | runner-up: incoming/outgoing variants |
| Bubbles | AI Message Bubble | 20125 | https://21st.dev/@elements-/components/message-bubble | no: AI chat chrome |
| Bubbles | Chat Bubble Reactions | 28759 | https://21st.dev/@bundui/components/bubble4 | no: reactions |
| Bubbles | Message Bubble (typing) | 36525 | https://21st.dev/@syeddhasnainn/components/message-bubble | no: typing and delivery status |
| Bubbles | User Message | 12353 | https://21st.dev/@serafimcloud/components/user-message | no: attachments |
| Search field | Component Search | 27914 | https://21st.dev/@uiable/components/component-search | pattern only |
| Search field | Input (originui search) | 159 | https://21st.dev/@originui/components/input | no: our `Input` already covers it |
| Search field | HeroUI Search Field | 16266 | https://21st.dev/@hero_ui/components/heroui-search-field | pattern only (clear button) |
| Search field | Search Bar with Category Filter | 28463 | https://21st.dev/@cnippet-dev/components/v-group-18 | no: category select |
| Search field | Company Search Input Group | 29920 | https://21st.dev/@sean0205/components/company-search-input-group | no: region dropdown |
| Search field | Search Input Group | 29850 | https://21st.dev/@sean0205/components/search-input-group | no: visible label |
| Search field | Command Search (board) | 28888 | https://21st.dev/@arihantcodes_1f7b8c4d/components/command-search | no: command palette |
| Search field | Expandable Search Bar | 7904 | https://21st.dev/@arunachalam/components/expandable-search-bar | no: collapsing field hides search |
| Sheet | Drawer (Base UI) | 24837 | https://21st.dev/@base-ui/components/drawer-base | fetched |
| Sheet | Drawer (wensity) | 31360 | https://21st.dev/@wensity/components/drawer | runner-up: snap points, not Base UI |
| Sheet | Drawer (ddoemonn) | 23558 | https://21st.dev/@ddoemonn/components/drawer | no: side panel |
| Sheet | Magnetic Drawer | 19360 | https://21st.dev/@animbits/components/specials-magnetic-drawer | no: springy snap |
| Sheet | Drawer (coss) | 11442 | https://21st.dev/@coss.com/components/drawer | runner-up: also Base UI style, nested drawers |
| Sheet | Sheet (Different Directions) | 25002 | https://21st.dev/@shadcnspace/components/sheet-01 | no: form sheet |
| Sheet | Reshaped Modal (board) | 17826 | https://21st.dev/@reshaped/components/reshaped-modal | no: Reshaped runtime |
| Sheet | Modal (board) | 23539 | https://21st.dev/@ddoemonn/components/modal | no: Base UI Dialog already does this |
| Skeleton | Skeleton Loader | 19999 | https://21st.dev/@animbits/components/loaders-skeleton | no: same as ours |
| Skeleton | Skeleton shimmer (motion) | 24972 | https://21st.dev/@motiondotdev/components/motion-skeleton-shimmer | no: `motion/react` |
| Skeleton | Skeleton (HeroUI) | 14932 | https://21st.dev/@hero_ui/components/skeleton | no: HeroUI runtime |
| Skeleton | Skeleton (mayurrawte) | 44951 | https://21st.dev/@mayurrawte/components/skeleton | no: same as ours |
| Skeleton | Shapes Skeleton | 29863 | https://21st.dev/@ai2/components/skeleton-shapes | pattern only (reduced motion) |
| Skeleton | Skeleton Swap | 23557 | https://21st.dev/@ddoemonn/components/skeleton-swap | pattern only |
| Empty state | Empty State (wensity) | 27575 | https://21st.dev/@wensity/components/empty-state | runner-up |
| Empty state | Empty State with Marquee | 19377 | https://21st.dev/@shadcnui-blocks/components/empty-state-04 | no: scrolling marquee |
| Empty state | Empty Background | 18266 | https://21st.dev/@uiable/components/empty-background | no: refresh action not needed |
| Empty state | Empty State (serafimcloud) | 1435 | https://21st.dev/@serafimcloud/components/empty-state | no: card with buttons |
| Empty state | Empty State Kit | 27024 | https://21st.dev/@laziekiki/components/empty-state-kit | no: illustrations |
| Empty state | Empty (cnippet) | 19745 | https://21st.dev/@cnippet-dev/components/cnippet-empty | pattern only |
| Ambient / grain | Grain Gradient | 17835 | https://21st.dev/@paper-design/components/grain-gradient | pattern only (not fetched) |
| Ambient / grain | Grainy Mesh Gradient Background | 37627 | https://21st.dev/@kedhareswer/components/meridian-mist | no: WebGL2, pointer-reactive |
| Ambient / grain | Grain Gradient (Truchet) | 24043 | https://21st.dev/@themostevildwarf/components/grain-gradient | no: high intensity |
| Ambient / grain | Grain Gradient · Truchet | 21921 | https://21st.dev/@paper-design/components/grain-gradient-truchet | no: high intensity |
| Ambient / grain | Grainy Light Leak Shader | 36552 | https://21st.dev/@kedhareswer/components/velvet-haze | no: WebGL2, click ripples |
| Ambient / grain | Ocean grain | 24379 | https://21st.dev/@hazelgrace3026/components/ocean-grain | no: fixed palette; ours is hue-driven |
| Ambient / grain | Aurora Background | 18263 | https://21st.dev/@pulkitxm/components/aurora-background | no: canvas animation |
| Ambient / grain | Aurora | 35187 | https://21st.dev/@kevingirelli/components/aurora | no: multi-colour drift |
| Ambient / grain | Aurora Blur | 18505 | https://21st.dev/@unlumen/components/aurora-blur | no: WebGL |
| Ambient / grain | LiquidAurora | 7937 | https://21st.dev/@dhileepkumargm/components/liquid-aurora | no: morphing keyframes |
| Ambient / grain | Background Gradient Glow | 7428 | https://21st.dev/@meghtrix/components/background-gradient-glow | no: static, same as ours |
| Ambient / grain | Aurora Flow (board) | 7624 | https://21st.dev/@ruixen.ui/components/aurora-flow | no: OGL shader |
| Ambient / grain | Noise Field (board) | 43818 | https://21st.dev/@bagherifarzad/components/noise-field | no: animated noise |
| Dialogue exchange | Chat Messages | 20130 | https://21st.dev/@solaceui/components/chat-messages-2 | pattern only |
| Dialogue exchange | Conversation | 5246 | https://21st.dev/@vercel-crawled/components/conversation | no: AI chat scroller |
| Dialogue exchange | Dialog (jolbol1) | 5084 | https://21st.dev/@jolbol1/components/dialog-2 | no: modal dialog, wrong sense |
| Dialogue exchange | Dialog (originui) | 370 | https://21st.dev/@originui/components/dialog | no: modal dialog |
| Dialogue exchange | Dialog (anubra266) | 6380 | https://21st.dev/@anubra266/components/dialog-2 | no: modal dialog |
| Dialogue exchange | IA Siri Chat | 3014 | https://21st.dev/@botsnew354/components/ia-siri-chat | no: voice UI |
| Dialogue exchange | Audio Chat | 9677 | https://21st.dev/@jatin-yadav05/components/audio-chat | no: voice UI |
| Grouped list | List Group Custom Content | 29346 | https://21st.dev/@uiable/components/list-group-custom-content | pattern only |
| Grouped list | Preferences Card | 30553 | https://21st.dev/@ssychui/components/preferences-card | pattern only |
| Grouped list | Checkbox Group | 25106 | https://21st.dev/@edwinvakayil/components/checkbox-group | no: selection list |
| Grouped list | Interactive List Preview | 26256 | https://21st.dev/@hyperiux/components/interactive-list-preview | no: blend-mode hover |
| Grouped list | Item List with Actions | 28596 | https://21st.dev/@bundui/components/item7 | no: contact rows |
| Grouped list | Select (Interfaces) | 11885 | https://21st.dev/@jshguo/components/interfaces-select | no: Radix select |
| Grouped list | Sortable List | 38208 | https://21st.dev/@ebnsina/components/sortable | no: reordering not in scope |
| Grouped list | Tabs (coss, underline) | 11643 | https://21st.dev/@coss.com/components/tabs | no: tabs |
| Grouped list | Accordion (shadcn) | 698 | https://21st.dev/@shadcn/components/accordion | no: groups do not collapse |
| Grouped list | HeroUI ListBox | 16827 | https://21st.dev/@hero_ui/components/heroui-list-box | no: HeroUI runtime |
| Grouped list | Glassmorphism Folder Cards (board) | 37625 | https://21st.dev/@kedhareswer/components/glass-folder-cards | no: see card glass |
| Video frame | YouTube Video Player | 18229 | https://21st.dev/@cult-ui/components/youtube-video-player | pattern only |
| Video frame | Video Thumbnail Player | 4586 | https://21st.dev/@ravikatiyar162/components/video-thumbnail-player | pattern only |
| Video frame | Video Player (HUD) | 19339 | https://21st.dev/@thegridcn/components/video-player | no: sci-fi HUD |
| Video frame | Video Player (framer) | 613 | https://21st.dev/@chetanverma16/components/video-player | no: transport controls, we only mute |
| Video frame | Chapter Player | 45089 | https://21st.dev/@louisstudios/components/chapter-player | no: chapter glow |
| Video frame | Thumbnail button video player | 2870 | https://21st.dev/@arunachalam/components/thumbnail-button-video-player | no: modal player |
| Video frame | Mono Contrast Preloader | 28826 | https://21st.dev/@kedhareswer/components/mono-contrast-preloader | no: WebGL loader |
| Video frame | Chroma Glitch Preloader | 28825 | https://21st.dev/@kedhareswer/components/chroma-glitch-preloader | no: glitch |
| Video frame | Cinema Grain Preloader | 28824 | https://21st.dev/@kedhareswer/components/cinema-grain-preloader | no: loud |
| Video frame | Gradient Background | 5199 | https://21st.dev/@efferd/components/gradient-background | no: looping colour |
| Video frame | Preloader | 2556 | https://21st.dev/@info-mdshakeeb/components/preloader | no: page gate |
| Video frame | Video Player composable (board) | 30231 | https://21st.dev/@mohammadshehadeh/components/video-player | no: full controls |
| Video frame | Video Player compact (board) | 36555 | https://21st.dev/@syeddhasnainn/components/video-player | no: keyboard controls |
| Out of row | Tilt Flip Card (board) | 12635 | https://21st.dev/@cesaroeduardo/components/flip-card | skip: flip is in-house (D-FLIP-1) |
| Out of row | Flip Card (board) | 26139 | https://21st.dev/@skyleen77/components/flip-card | skip: flip is in-house (D-FLIP-1) |
| Out of row | Sonner Toast (board) | 27363 | https://21st.dev/@isaiahbjork/components/primitive-sonner | skip: `sonner` primitive already installed |
