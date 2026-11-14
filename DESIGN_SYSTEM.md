# Quipdeck design system (UI-V2)

Source of truth for the look since UI-V2 (D-THEME-8). The full screen-by-screen spec is `docs/REDESIGN_V2.md`; this file is the short reference. The v1 system (painted glass, ambient glow, grain, move hues, custom tokens) is gone.

## 1. Theme

**Soft Pop** from tweakcn, copied whole: https://tweakcn.com/r/themes/soft-pop.json (Apache-2.0, https://github.com/jnsahaj/tweakcn).

- `src/app/globals.css` holds the theme's `:root` (light) and `.dark` blocks verbatim under the standard shadcn variable names. The only edits inside them are the font lines, which point at the next/font variables.
- `@theme inline` maps the shadcn names to utilities (`bg-card`, `text-muted-foreground`, `bg-chart-3`, ...), the base-nova radius scale on `--radius: 1rem`, and the theme's (near-invisible) shadows. The theme's `--tracking-*` lines are left out on purpose (`calc(normal - 0.025em)` is invalid).
- The app ships **dark** (`<html class="dark">`, `color-scheme: dark`, no toggle). The light block renders correctly and is used for screenshots (`*-light-*.png`).
- Fonts: DM Sans (variable, `--font-sans`, also `--font-serif`) and Space Mono 400/700 (`--font-mono`), from `next/font/google` in `src/app/layout.tsx`. Weights: 400 body, 500 labels, 600 buttons and row titles, 700 cue and headings.

Dark palette as it renders:

| Token | sRGB | Use |
|---|---|---|
| `background` | `#000000` | Page, footer panel on the cue card |
| `card` = `popover` | `#1a212b` | Card back, list groups, sheet, pane, nav pill |
| `muted` | `#333333` | Trigger bubble, skeleton, hover and selected rows, fallback notice |
| `border` | `#545454` | Hairlines, nav and sheet edges |
| `input` | `#ffffff` | Outline-button and input borders (30% white fill) |
| `foreground` | `#ffffff` | Primary text |
| `muted-foreground` | `#cccccc` | Secondary text, never under 14 px |
| `primary` = `chart-1` | `#818cf8` | Default button, active nav, saved heart, focus ring |
| `secondary` = `chart-2` | `#2dd4bf` | Teal. Never a button variant |
| `accent` = `chart-3` | `#fcd34d` | Yellow. Never a control fill |
| `chart-4`, `chart-5` | `#f472b6`, `#4ade80` | Pink, green |
| `destructive` | `#f87171` | Errors only (none in this build) |

## 2. Quipdeck additions (outside the theme blocks)

- **Move colour** (`src/lib/move-color.ts`): `moveColorStyle(moveId)` sets `--move: var(--chart-n)` and `--move-foreground: var(--chart-n-foreground)`, `n = (index in movesSortedAZ) % 5 + 1`, unknown move → 1. Paint with `bg-(--move) text-(--move-foreground)`. `--chart-n-foreground` is black for all five in dark; in light, chart-1 (dark indigo) takes white.
- **Motion**: `--dur-fast` 150 ms, `--dur-base` 240 ms, `--dur-sheet` 280 ms, `--dur-ready` 200 ms, `ease-soft`, `animate-ready-fade` (clip fade-in). Durations drop to 0 under reduced motion. Springs (flip, nav capsule, heart pop) in `src/components/ui/motion.ts`.
- **Focus**: stock shadcn rings on the primitives (`focus-visible:border-ring ring-3 ring-ring/50`); on outline and ghost buttons the full-opacity `border-ring` carries the contrast. On `bg-primary` controls (saved heart, default pill) the border matches the fill, so only the 50% halo shows (about 2.3:1 on card, printed as info by the contrast script): a known gap of the stock ring, left as stock. Custom controls (nav links, saved rows) use a full-opacity `ring-ring`; anything else gets a 2 px `--ring` outline from the base layer.

## 3. Components

Stock shadcn base-nova primitives in `src/components/ui/`: button, badge, input, skeleton, separator, kbd, drawer (Base UI, ported), nav-pill and heart-toggle (21st.dev ports on theme tokens).

- **Button** variants used: `default`, `outline`, `ghost`. Never `secondary` (teal) or anything that paints `bg-accent`. Project sizes: `circle` 44, `circle-lg` 48, `pill` 48, `pill-sm` 44 (stock sizes are under the 44 px touch floor).
- **Move tag**: default `Badge` + `MOVE_BADGE` (32 px, `rounded-full`, move fill).
- **Radii**: feed card `rounded-4xl`; bubbles, list groups, panels `rounded-3xl`; standalone clip `rounded-2xl`; buttons, badges, nav, search `rounded-full`.
- Surfaces are flat. No backdrop-filter, no glow, no custom shadow; floating surfaces carry `border-border`.

## 4. Contrast

`node scripts/contrast.cjs` reads the tokens from `globals.css` and checks every text pair the screens paint (4.5:1) in dark and light, and the focus ring and control borders (3:1) in dark. Lowest enforced pair: ring on muted 4.24:1; lowest text pair: muted-foreground on the outline search field, 5.30:1. Barred (never painted): secondary, accent and destructive fills.

## 5. Showcase

`/showcase` (noindex, not in the nav) shows the 13 colour tokens, Button (default, outline, ghost), Badge in the five move colours, and Input.
