# Quipdeck redesign V2: copy "Soft Pop" whole

Status: decision doc. No app code changed. The implementer copies this literally.

## 0. Decision in five lines

1. Theme: **Soft Pop** from tweakcn. Black background, white text, DM Sans, `--radius: 1rem`, five saturated chart colours.
2. The bespoke glass, grain, ambient glow, hue and specular layers are deleted. Surfaces are flat theme tokens only.
3. The move is shown with ONE mechanism: a solid fill in one of the theme's five chart colours, black text on top. No tints, no gradients.
4. Card front is a solid move-colour poster with a 45 px bold cue. Card back is clip first (full-bleed at the top), then the conversation, then actions. Nothing is pushed to the bottom with `mt-auto`.
5. SPEC.md "Look and feel" (glassmorphic, grain, ambient glow, refraction, "based on Brink") is superseded by this doc. Everything else in SPEC stands: dark theme, AA contrast, focus states, keyboard nav, `prefers-reduced-motion`.

## 1. Shortlist

Dark-variant numbers are WCAG contrast ratios computed from each theme's own dark tokens (oklch converted to sRGB). "card/bg" is how visibly the card separates from the page; 1.0 means identical.

| Theme | Source | Radius, font | Dark variant in one line | Verdict |
|---|---|---|---|---|
| **Soft Pop** | https://tweakcn.com/r/themes/soft-pop.json | 1rem, DM Sans | Pure black page, navy-slate card `#1a212b`, white text 16.2:1, muted text 10.1:1, card/bg 1.30, five distinct chart hues | **PICK** |
| Violet Bloom | https://tweakcn.com/r/themes/violet-bloom.json | 1.4rem, Plus Jakarta Sans | Charcoal `#1a1b1e` page with `#222327` card: card/bg 1.10. White on the violet primary is 4.13:1 (fails AA for body text) | Lost: it is the same muddy charcoal-on-charcoal the user rejected, and the primary button fails AA |
| Twitter | https://tweakcn.com/r/themes/registry.json (item `twitter`) | 1.3rem, Open Sans | Black page, but muted text `#72767a` is 3.88:1 on card and white on the blue primary is 2.97:1 | Lost: small grey text again; two AA failures; Open Sans is not friendly or rounded |
| Claymorphism | registry.json (item `claymorphism`) | 1.25rem, Plus Jakarta Sans | Warm brown-charcoal `oklch(0.22 0.007 67)`, card/bg 1.17, chart palette is five shades of one indigo (down to 1.47:1 on card) | Lost: muddy; puffy 10 px/4 px-spread shadows read as dated on dark; no usable move palette |
| Pastel Dreams | registry.json (item `pastel-dreams`) | 1.5rem, Open Sans | Brown-black page with a mauve card, card/bg 1.19, chart palette is five violets (down to 2.07:1) | Lost: muddy mauve; monochrome palette; Open Sans |
| Yoga with Ethan Theme (21st.dev) | https://21st.dev/community/themes/yoga-with-ethan-theme-1788587282853 | dark 1.4rem, Plus Jakarta Sans | Near-black `#070503` with sage primary; rounded and calm | Lost: not a whole to copy. Light and dark use different fonts (Poppins vs Plus Jakarta), radii (0.675 vs 1.4rem) and letter-spacing; sage on brown-black is sombre, not playful |

Search notes, so nobody repeats them:
- 21st.dev theme search (`type: "theme"`) only returns unnamed community themes with no previews or descriptions. Queries for "rounded", "playful", "violet" returned nothing. I fetched four by id (MoonCalendar, Respec, SMMART, Yoga with Ethan): radii 0.375rem, 0.375rem, 0 and 1.4rem. Only the last is rounded.
- tweakcn: all 42 themes in https://tweakcn.com/r/themes/registry.json were tabulated. Only five have a radius of 1rem or more: Violet Bloom, Twitter, Claymorphism, Pastel Dreams, Soft Pop. That is the whole rounded field.
- Other galleries: one web search pass (shadcn docs theming page, designrevision, shadcnblocks) surfaced nothing rounded with a published dark token set that beats Soft Pop. Not fetched in depth.

## 2. THE PICK: Soft Pop

- Theme JSON (fetched, HTTP 200): https://tweakcn.com/r/themes/soft-pop.json
- Same item inside the full registry: https://tweakcn.com/r/themes/registry.json
- Editor preview (not fetched, standard tweakcn URL shape): https://tweakcn.com/editor/theme?theme=soft-pop
- Licence: tweakcn is Apache-2.0 (https://raw.githubusercontent.com/jnsahaj/tweakcn/main/LICENSE, fetched). Add one line to README: "Theme: Soft Pop from tweakcn (Apache-2.0), https://tweakcn.com". No other obligation for copying token values.

Why it wins:
- Highest contrast of the rounded field: white on card 16.2:1, muted text on card 10.1:1, black on primary 7.04:1. Every text pair clears AA; most clear AAA.
- Page is pure black and the card is a blue-slate `#1a212b`. There is no grey-on-grey anywhere.
- It ships a real five-hue palette (indigo, teal, yellow, pink, green). Black text on each is 7.0 to 14.6:1. That replaces the bespoke move-hue system with theme tokens.
- DM Sans is geometric, round and friendly, and is a variable font in `next/font/google`.
- Format: tweakcn publishes shadcn registry JSON with oklch values, which is Tailwind v4 native. No v3 conversion is needed.

Dark palette as it renders:

| Token | sRGB | Use |
|---|---|---|
| `--background` | `#000000` | page, nav gutter, inset panels on coloured cards |
| `--card` / `--popover` | `#1a212b` | card back, list groups, drawer, nav pill |
| `--muted` | `#333333` | trigger bubble, skeleton, hover rows, fallback notice |
| `--border` | `#545454` | hairlines (2.1:1 on card: clearly visible) |
| `--input` | `#ffffff` | outline-button and input borders are WHITE |
| `--foreground` | `#ffffff` | all primary text |
| `--muted-foreground` | `#cccccc` | secondary text. Never smaller than 14 px |
| `--primary` / `--chart-1` | `#818cf8` | primary button, active nav, saved heart |
| `--secondary` / `--chart-2` | `#2dd4bf` | teal |
| `--accent` / `--chart-3` | `#fcd34d` | yellow |
| `--chart-4` | `#f472b6` | pink |
| `--chart-5` | `#4ade80` | green |
| `--destructive` | `#f87171` | errors only |

### 2.1 Full CSS, verbatim values

tweakcn does not host a static `.css` file. This block was generated by script from `soft-pop.json` and laid out in the standard shadcn Tailwind v4 shape (`:root`, `.dark`, `@theme inline`, base layer). Every token value is copied from the JSON unedited; the `@theme inline` mapping lines are the standard ones and are adjusted in 2.2.

```css
:root {
  --background: oklch(0.9789 0.0082 121.6272);
  --foreground: oklch(0 0 0);
  --card: oklch(1.0000 0 0);
  --card-foreground: oklch(0 0 0);
  --popover: oklch(1.0000 0 0);
  --popover-foreground: oklch(0 0 0);
  --primary: oklch(0.5106 0.2301 276.9656);
  --primary-foreground: oklch(1.0000 0 0);
  --secondary: oklch(0.7038 0.1230 182.5025);
  --secondary-foreground: oklch(1.0000 0 0);
  --muted: oklch(0.9551 0 0);
  --muted-foreground: oklch(0.3211 0 0);
  --accent: oklch(0.7686 0.1647 70.0804);
  --accent-foreground: oklch(0 0 0);
  --destructive: oklch(0.6368 0.2078 25.3313);
  --destructive-foreground: oklch(1.0000 0 0);
  --border: oklch(0 0 0);
  --input: oklch(0.5555 0 0);
  --ring: oklch(0.7853 0.1041 274.7134);
  --chart-1: oklch(0.5106 0.2301 276.9656);
  --chart-2: oklch(0.7038 0.1230 182.5025);
  --chart-3: oklch(0.7686 0.1647 70.0804);
  --chart-4: oklch(0.6559 0.2118 354.3084);
  --chart-5: oklch(0.7227 0.1920 149.5793);
  --radius: 1rem;
  --sidebar: oklch(0.9789 0.0082 121.6272);
  --sidebar-foreground: oklch(0 0 0);
  --sidebar-primary: oklch(0.5106 0.2301 276.9656);
  --sidebar-primary-foreground: oklch(1.0000 0 0);
  --sidebar-accent: oklch(0.7686 0.1647 70.0804);
  --sidebar-accent-foreground: oklch(0 0 0);
  --sidebar-border: oklch(0 0 0);
  --sidebar-ring: oklch(0.7853 0.1041 274.7134);
  --font-sans: DM Sans, sans-serif;
  --font-serif: DM Sans, sans-serif;
  --font-mono: Space Mono, monospace;
  --shadow-color: #1a1a1a;
  --shadow-opacity: 0.05;
  --shadow-blur: 0px;
  --shadow-spread: 0px;
  --shadow-offset-x: 0px;
  --shadow-offset-y: 0px;
  --letter-spacing: normal;
  --spacing: 0.25rem;
  --shadow-2xs: 0px 0px 0px 0px hsl(0 0% 10.1961% / 0.03);
  --shadow-xs: 0px 0px 0px 0px hsl(0 0% 10.1961% / 0.03);
  --shadow-sm: 0px 0px 0px 0px hsl(0 0% 10.1961% / 0.05), 0px 1px 2px -1px hsl(0 0% 10.1961% / 0.05);
  --shadow: 0px 0px 0px 0px hsl(0 0% 10.1961% / 0.05), 0px 1px 2px -1px hsl(0 0% 10.1961% / 0.05);
  --shadow-md: 0px 0px 0px 0px hsl(0 0% 10.1961% / 0.05), 0px 2px 4px -1px hsl(0 0% 10.1961% / 0.05);
  --shadow-lg: 0px 0px 0px 0px hsl(0 0% 10.1961% / 0.05), 0px 4px 6px -1px hsl(0 0% 10.1961% / 0.05);
  --shadow-xl: 0px 0px 0px 0px hsl(0 0% 10.1961% / 0.05), 0px 8px 10px -1px hsl(0 0% 10.1961% / 0.05);
  --shadow-2xl: 0px 0px 0px 0px hsl(0 0% 10.1961% / 0.13);
  --tracking-normal: normal;
}

.dark {
  --background: oklch(0 0 0);
  --foreground: oklch(1.0000 0 0);
  --card: oklch(0.2455 0.0217 257.2823);
  --card-foreground: oklch(1.0000 0 0);
  --popover: oklch(0.2455 0.0217 257.2823);
  --popover-foreground: oklch(1.0000 0 0);
  --primary: oklch(0.6801 0.1583 276.9349);
  --primary-foreground: oklch(0 0 0);
  --secondary: oklch(0.7845 0.1325 181.9120);
  --secondary-foreground: oklch(0 0 0);
  --muted: oklch(0.3211 0 0);
  --muted-foreground: oklch(0.8452 0 0);
  --accent: oklch(0.8790 0.1534 91.6054);
  --accent-foreground: oklch(0 0 0);
  --destructive: oklch(0.7106 0.1661 22.2162);
  --destructive-foreground: oklch(0 0 0);
  --border: oklch(0.4459 0 0);
  --input: oklch(1.0000 0 0);
  --ring: oklch(0.6801 0.1583 276.9349);
  --chart-1: oklch(0.6801 0.1583 276.9349);
  --chart-2: oklch(0.7845 0.1325 181.9120);
  --chart-3: oklch(0.8790 0.1534 91.6054);
  --chart-4: oklch(0.7253 0.1752 349.7607);
  --chart-5: oklch(0.8003 0.1821 151.7110);
  --radius: 1rem;
  --sidebar: oklch(0 0 0);
  --sidebar-foreground: oklch(1.0000 0 0);
  --sidebar-primary: oklch(0.6801 0.1583 276.9349);
  --sidebar-primary-foreground: oklch(0 0 0);
  --sidebar-accent: oklch(0.8790 0.1534 91.6054);
  --sidebar-accent-foreground: oklch(0 0 0);
  --sidebar-border: oklch(1.0000 0 0);
  --sidebar-ring: oklch(0.6801 0.1583 276.9349);
  --font-sans: DM Sans, sans-serif;
  --font-serif: DM Sans, sans-serif;
  --font-mono: Space Mono, monospace;
  --shadow-color: #1a1a1a;
  --shadow-opacity: 0.05;
  --shadow-blur: 0px;
  --shadow-spread: 0px;
  --shadow-offset-x: 0px;
  --shadow-offset-y: 0px;
  --letter-spacing: normal;
  --spacing: 0.25rem;
  --shadow-2xs: 0px 0px 0px 0px hsl(0 0% 10.1961% / 0.03);
  --shadow-xs: 0px 0px 0px 0px hsl(0 0% 10.1961% / 0.03);
  --shadow-sm: 0px 0px 0px 0px hsl(0 0% 10.1961% / 0.05), 0px 1px 2px -1px hsl(0 0% 10.1961% / 0.05);
  --shadow: 0px 0px 0px 0px hsl(0 0% 10.1961% / 0.05), 0px 1px 2px -1px hsl(0 0% 10.1961% / 0.05);
  --shadow-md: 0px 0px 0px 0px hsl(0 0% 10.1961% / 0.05), 0px 2px 4px -1px hsl(0 0% 10.1961% / 0.05);
  --shadow-lg: 0px 0px 0px 0px hsl(0 0% 10.1961% / 0.05), 0px 4px 6px -1px hsl(0 0% 10.1961% / 0.05);
  --shadow-xl: 0px 0px 0px 0px hsl(0 0% 10.1961% / 0.05), 0px 8px 10px -1px hsl(0 0% 10.1961% / 0.05);
  --shadow-2xl: 0px 0px 0px 0px hsl(0 0% 10.1961% / 0.13);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);

  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);
  --font-serif: var(--font-serif);

  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);

  --shadow-2xs: var(--shadow-2xs);
  --shadow-xs: var(--shadow-xs);
  --shadow-sm: var(--shadow-sm);
  --shadow: var(--shadow);
  --shadow-md: var(--shadow-md);
  --shadow-lg: var(--shadow-lg);
  --shadow-xl: var(--shadow-xl);
  --shadow-2xl: var(--shadow-2xl);

  --tracking-tighter: calc(var(--tracking-normal) - 0.05em);
  --tracking-tight: calc(var(--tracking-normal) - 0.025em);
  --tracking-wide: calc(var(--tracking-normal) + 0.025em);
  --tracking-wider: calc(var(--tracking-normal) + 0.05em);
  --tracking-widest: calc(var(--tracking-normal) + 0.1em);
}

@layer base {
  body {
    letter-spacing: var(--tracking-normal);
  }
}
```

### 2.2 Required deviations when pasting into `src/app/globals.css`

Paste `:root` and `.dark` as they are, replacing every existing custom property block. Then apply exactly these six changes and no others:

1. **Fonts.** In both `:root` and `.dark` replace the three font lines with:
   ```css
   --font-sans: var(--font-dm-sans), ui-sans-serif, system-ui, sans-serif;
   --font-serif: var(--font-dm-sans), ui-sans-serif, system-ui, sans-serif;
   --font-mono: var(--font-space-mono), ui-monospace, monospace;
   ```
2. **Radius scale.** Keep the project's existing base-nova radius lines in `@theme inline` (`--radius-sm: calc(var(--radius) * 0.6)` up to `--radius-4xl: calc(var(--radius) * 2.6)`), not tweakcn's `- 4px / + 4px` lines. base-nova components use `rounded-2xl` to `rounded-4xl`. With `--radius: 1rem` that gives: lg 16, xl 22.4, 2xl 28.8, 3xl 35.2, 4xl 41.6 px.
3. **Tracking.** Do NOT paste the five `--tracking-*` lines. Soft Pop sets `--tracking-normal: normal`, so `calc(normal - 0.025em)` is invalid and `tracking-tight` would silently do nothing. Leaving them out restores Tailwind's stock tracking utilities. Keep the `body { letter-spacing: var(--tracking-normal); }` rule.
4. **Keep in `@theme inline`:** the existing `--color-*` shadcn mapping, `--font-heading: var(--font-sans)`, and add the eight `--shadow-*: var(--shadow-*)` lines from the block above.
5. **Font mapping in `@theme inline`.** Replace the existing `--font-sans: var(--font-geist-sans);` and `--font-mono: var(--font-geist-mono);` with:
   ```css
   --font-sans: var(--font-sans);
   --font-mono: var(--font-mono);
   --font-serif: var(--font-serif);
   ```
   After the build, check in devtools that `body` computes to DM Sans.
6. **Keep at the top of the file:** `@import "tailwindcss"; @import "tw-animate-css"; @import "shadcn/tailwind.css";` and `@custom-variant dark (&:is(.dark *));`.

Shadows: Soft Pop's shadows are deliberately near-invisible (0 blur, 5% alpha). The theme is flat. Depth comes from black page, slate card and solid colour. Do not add custom shadows or glows.

Light mode: paste the light tokens so the theme is whole, but ship dark only. `<html className="dark">` and `style={{ colorScheme: "dark" }}` stay. Light is not designed or tested (see risks).

## 3. Fonts with next/font

Checked against `node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md`, the `font.md` API reference and `node_modules/next/dist/compiled/@next/font/dist/google/font-data.json`:
- DM Sans is a variable font (axes `wght` 100 to 1000 and `opsz` 9 to 40). No `weight` needed.
- Space Mono is NOT variable. `weight` is required; only 400 and 700 exist.

`src/app/layout.tsx`:

```tsx
import { DM_Sans, Space_Mono } from "next/font/google";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  axes: ["opsz"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

// <html lang="en" className={`${dmSans.variable} ${spaceMono.variable} dark h-full antialiased`} style={{ colorScheme: "dark" }}>
```

Remove the Geist and Geist_Mono imports. Set `viewport.themeColor` to `"#000000"`. Remove `<AmbientLayer />`.

Weights used: 400 body, 500 labels, 600 buttons and row titles, 700 cue and headings. Nothing lighter than 400.

## 4. Composition reference

**Public (iOS), "Options" lesson screen:** https://mobbin.com/screens/3b07d29d-4fef-45f1-97e4-5b5bfcf1f9c7

What is copied from it: media sits edge to edge at the TOP of the screen; a dark rounded panel below carries one very large title and a short coloured-accent paragraph; nothing floats in the middle of an empty field. Text starts immediately under the media and reads downward.

Adaptation: Public's video is portrait and takes about 58% of the height. Our clip is 16:9, so it is only 210 px tall on a 374 px wide card (27%). The words therefore have to carry about 450 px. That is done with large type and big bubbles (budget in 5.2), not by spacing things out.

Secondary reference for the front (a text-only card with its controls pinned in the card's footer): Headway flashcard, https://mobbin.com/screens/e109ca23-95a1-4edd-94d8-704a97ad043b

Root cause of the current empty top half, so it is not rebuilt by accident: in `src/components/card/card-back.tsx` the words block has `@max-[719px]:mt-auto` and the clip is pinned to the bottom, so all free height collects above the tag. Delete that; the clip goes first.

## 5. Screens

### 5.0 Shared rules

- **Move colour.** `n = (index of the move in `movesSortedAZ`) % 5 + 1`, so neighbouring groups in the A to Z Saved list never share a colour. Set it once per card or group as an inline custom property: `style={{ "--move": `var(--chart-${n})` }}`. Paint with `bg-(--move) text-black`. Put this in `src/lib/move-color.ts` (`moveColorStyle(moveId)`), replacing `move-hue.ts`. Data-driven, nothing hardcoded per move.
- Colour is never the only signal: the move label text is always present next to the colour. Two moves sharing a colour (there are 10 to 15 moves and five colours) is accepted.
- **Text on a move-colour fill is always `text-black`, full opacity.** No `/70` opacity on fills. Contrast: indigo 7.04, pink 7.93, teal 11.28, green 12.05, yellow 14.56.
- **Text on black or card** is `text-foreground` or `text-muted-foreground` only. Minimum size 14 px (`text-sm`). No `text-xs` anywhere except the keyboard hint on desktop.
- **Move badge** = stock `Badge` (default variant) with `className="h-8 rounded-full bg-(--move) px-3.5 text-sm font-semibold text-black"`. Delete the `move` and `glass` badge variants.
- **Buttons.** Stock `Button`. Stock sizes are 32 to 36 px, too small for touch, so every button gets an explicit height: 48 px for icon buttons (the project's existing `size="circle-lg"`, `size-12 rounded-full`; keep that size and `circle`), 52 px (`h-13`) for the reveal button. Variants allowed: `default` (indigo, black text), `outline` (white 1 px border, 30% white fill), `ghost`. **Never use `variant="secondary"` (it is teal) or anything that paints `bg-accent` (it is yellow)** unless this doc says so.
- **Focus.** Stock shadcn ring (`focus-visible:ring-3 focus-visible:ring-ring/50`). On a move-colour surface add `focus-visible:ring-black` so the ring is visible.
- **Radii.** Feed card `rounded-4xl`. Bubbles, list groups, inset panels `rounded-3xl`. Standalone clip `rounded-2xl`. Buttons, badges, nav, search `rounded-full`.
- **Flip.** Keep the existing rotateY flip and its reduced-motion fallback. Remove the specular sweep child. Front and back stay in one grid cell, so they are always the same size.
- Keep every `data-testid` and `data-clip-state` attribute as it is.

### 5.1 Feed card front (phone)

Surface: `bg-(--move) text-black rounded-4xl`, padding 24 px (20 px when viewport height is 700 px or less). `@container`. Flex column, full height.

Top to bottom, card 374 x 767 at 390 x 844:

| Block | Height | Spec |
|---|---|---|
| Eyebrow row | 28 | Left: "The cue", `text-sm font-semibold uppercase tracking-[0.08em]`. Right: source name if present, `text-sm font-medium`, truncated |
| Cue zone | flex-1 (523) | `flex items-center`. The cue is vertically centred in this zone |
| Cue | 187 to 281 | `text-[clamp(2.25rem,12cqw,4.5rem)] leading-[1.04] font-bold tracking-[-0.03em] text-balance hyphens-auto break-words line-clamp-6`. That is 45 px on a 374 px card and 43 px on a 359 px card. Sized so the longest seed word, "inconvenience" (13 letters, about 305 px at 45 px bold), fits the 326 px inner width; 14cqw (52 px) does not. The 14 seed cues are 23 to 39 characters: three to five lines |
| Gap | 16 | |
| Footer panel | 152 | `bg-background text-foreground rounded-3xl p-4`. Line 1: "The move", `text-sm font-medium text-muted-foreground`. Line 2: move label, `text-2xl font-bold tracking-[-0.01em]` (24 px), `data-testid="move"`. Gap 12. Line 3: reveal button, full width, `h-13 rounded-full bg-(--move) text-black text-base font-semibold hover:bg-(--move)/90`, label "Tap to reveal" (existing pointer-dependent wording logic stays), with a 20 px lucide `RotateCw` icon at inline-end |

Sum: 24 (padding) + 28 + 523 + 16 + 152 + 24 (padding) = 767. With a four-line cue (187 px) the free colour above and below the cue is about 168 px each; with six lines (281 px), about 120 px. The card is a solid colour field with three anchored bands (eyebrow, cue, black footer), so no region reads as empty.

At 375 x 667 (card about 359 x 590, padding 20): eyebrow 28, footer panel 144 (button `h-12`, move label `text-xl`), gap 12, cue zone 366. Six lines of 43 px type is 268 px: fits.

No heart, mute or clip on the front. The whole face stays tappable as today.

### 5.2 Feed card back (phone)

Surface: `bg-card text-card-foreground rounded-4xl overflow-hidden`. Flex column, full height. No padding on the card itself; the clip is full-bleed.

Top to bottom, card 374 x 767:

| Block | Height | Spec |
|---|---|---|
| Clip | 210 | Full card width, `aspect-video`, flush to the top and sides, no radius of its own (the card's `overflow-hidden` rounds the top corners). `min-h-[200px]` stays |
| Body | flex-1 (557, of which the words zone is 441) | `flex flex-col px-5 pt-5 pb-4`. Children below |
| Tag row | 32 | Move badge (5.0) at the left, `data-testid="move"`. Source at the right, `text-sm text-muted-foreground`, truncated |
| Words zone | flex-1 | `flex flex-col justify-center gap-5 min-h-0`. Holds exchange and breakdown. Free height splits evenly above and below, about 70 px each for a typical card |
| Trigger | 26 + 56 to 84 | Left aligned, `max-w-[88%]`. Speaker: `text-sm font-semibold text-muted-foreground`, 20 px line, 6 px below. Bubble: `bg-muted text-foreground rounded-3xl rounded-bl-md px-4 py-3.5 text-xl leading-7` (20/28), `line-clamp-3` |
| Gap | 12 | |
| Response | 26 + 84 to 112 | Right aligned, `max-w-[88%]`, speaker label right aligned. Bubble: `bg-(--move) text-black rounded-3xl rounded-br-md px-4 py-3.5 text-xl leading-7 font-medium`, `line-clamp-3` |
| Gap | 20 | |
| Breakdown | 24 + 52 | Label "Why it lands", `text-sm font-semibold text-muted-foreground`. Text: `text-lg leading-[26px] text-foreground` (18/26), `line-clamp-2`, `data-testid="breakdown"` |
| Action row | 48 | `flex items-center justify-between`. Left: "Back to cue" `Button variant="ghost"`, `h-12 rounded-full px-4 text-sm font-semibold text-muted-foreground`, always visible (replaces the invisible focus-only pill). Right: mute then heart, 8 px apart |

Budget: fixed parts are 210 (clip) + 20 + 32 (tag row) + 48 (actions) + 16 = 326, leaving a 441 px words zone. Typical card (one-line trigger, two-line response, two-line breakdown): 82 + 12 + 110 + 20 + 76 = 300, so 141 px of slack, centred. Worst case (three-line trigger and response): 384, slack 57. Words fill 68% to 87% of the zone; the card has no empty half.

Buttons:
- Mute: `Button variant="outline" size="circle-lg"`, lucide `Volume2` / `VolumeX`, 20 px.
- Heart, not saved: same outline button, lucide `Heart` 20 px.
- Heart, saved: `variant="default"` (indigo fill, black icon) with the heart `fill-current`. Keep the existing pop animation from `heart-toggle.tsx`; drop any glow.

At viewport height 700 px or less (card about 359 x 590): clip 202; body `px-4 pt-4 pb-3`; tag row 28 (`h-7` badge); bubbles `text-base leading-6 py-2.5`; speaker labels 18 px line; words gaps 12 / 8 / 12; breakdown `text-base leading-6` with no label; action row 48. Budget: fixed 202 + 16 + 28 + 48 + 12 = 306, words zone 284, typical words 90 + 8 + 90 + 12 + 48 = 248, slack 36. Worst case (three-line bubbles) is 296 px and overflows by 12 px, so the words zone has `overflow-y-auto` for the whole compact tier (viewport height 700 px or less), not only below 600 px. Card height confirmed as 590 px from `docs/gates/final/feed-back-375x667.png`.

### 5.3 Clip

- Frame: `bg-black`. In the feed it is full-bleed with no border. Anywhere else (drawer, desktop) it is `rounded-2xl overflow-hidden`.
- Loading: stock `Skeleton` filling the frame (`bg-muted animate-pulse`, `motion-reduce:animate-none`). Delete `skeleton-shimmer`.
- Ready: the iframe fades in with the existing `ready-fade` (200 ms opacity only).
- Dev stub: `bg-black`, centred "Stub clip" `text-sm font-semibold text-muted-foreground` and the id in `font-mono text-sm`. Not a grey slab.
- No hue glow, no specular highlight, no inner border.

### 5.4 Clip fallback (clip failed to load)

The 16:9 box collapses. In its place, as the first child of the body (so the card has normal `pt-5` padding at the top and no full-bleed media):

- Notice row, 64 px: `flex items-center gap-3 rounded-2xl bg-muted px-4`, lucide `VideoOff` 20 px `text-muted-foreground`, then "Clip unavailable" `text-base font-semibold` and "The exchange is all here." `text-sm text-muted-foreground` on one line each. Keep `data-clip-state="error"`.
- The words zone takes the released 130 px or so. Bubbles step up to `text-2xl leading-8` (24/32) and the breakdown to `text-xl leading-7`, so the card stays full. Apply with a `:has([data-clip-state=error])` selector on the card back root (today that hook sits on the media block; move it up).
- Mute button is hidden (existing rule). Heart stays.

### 5.5 Saved list

- Page: `bg-background`, content column `max-w-[640px]` on phone/tablet, `px-4`, `pt-6`, bottom padding clears the nav.
- Header: "Saved" `text-4xl font-bold tracking-[-0.02em]` (36 px), with the count in a stock `Badge variant="outline"` (`h-7 px-2.5 text-sm`) beside it.
- Group heading: move badge (5.0) plus the count as `text-sm text-muted-foreground`. 24 px above, 10 px below. Each group sets `--move`.
- Group body: stock card surface `bg-card rounded-3xl overflow-hidden`, rows separated by stock `Separator`.
- Row (a `button`, min height 72): `px-4 py-3.5 text-left hover:bg-muted focus-visible:bg-muted`. Line 1 cue: `text-lg font-semibold leading-6 text-foreground`. Line 2 response: `text-base leading-6 text-muted-foreground line-clamp-2`. Right edge: lucide `ChevronRight` 20 px `text-muted-foreground`.
- Selected row (desktop, pane open): `bg-muted` plus a 4 px `bg-(--move)` bar on the left edge.

### 5.6 Search

- Stock `Input`: `h-13 rounded-full pl-12 pr-12 text-base` with lucide `Search` 20 px at the left. Stock dark styling gives a white 1 px border and a 30% white fill. Keep it exactly; do not soften it. Placeholder `text-muted-foreground`.
- Clear: `Button variant="ghost" size="icon"` (`size-9 rounded-full`) with lucide `X`, shown only when there is a query.
- Sticky under the header with a solid `bg-background` strip behind it. No blur, no glass.
- Result count while searching: `text-sm text-muted-foreground`, 8 px under the field.

### 5.7 Empty and no-results

Centred column, `max-w-[320px]`, vertically centred in the list area:

- Empty: 72 px circle `bg-primary text-primary-foreground` with lucide `Heart` 32 px. Title "Nothing saved yet" `text-2xl font-bold`. Body `text-base text-muted-foreground`. `Button` default variant, `h-12 rounded-full px-6 text-base font-semibold`, "Go to the feed".
- No results: 72 px circle `bg-muted text-foreground` with lucide `SearchX`. Title "No matches" `text-2xl font-bold`. Body quoting the query. `Button variant="outline"`, same size, "Clear search".

### 5.8 Detail drawer (phone) and pane (desktop)

Phone, stock `Drawer`:
- Popup: `bg-popover rounded-t-4xl`, max height 92 svh. Backdrop `bg-black/70`. No blur.
- Handle: 40 x 5 px `bg-border rounded-full`, 10 px from the top.
- Header, `px-5 pt-3`: cue as the drawer title, `text-2xl font-bold leading-7 tracking-[-0.01em]`, with a close `Button variant="outline" size="circle-lg"` at the right.
- Then the card back body from 5.2 in this order: clip (`mx-5 rounded-2xl`, 16:9), tag row, exchange, breakdown, action row (no "Back to cue"). Same type sizes as 5.2. The drawer scrolls if it overflows.

Desktop pane (right column of Saved): `bg-card rounded-4xl p-8 sticky top-24`. Same content, with the clip at the top inside the padding (`rounded-2xl`), cue title above it at `text-3xl font-bold`. Empty pane: the 5.7 layout with lucide `MousePointerClick`, title "Pick a card", body "Choose a card to replay it." No button.

### 5.9 Nav

Floating pill, bottom centre on phone, top centre on desktop (positions unchanged):
- Container: `bg-card border border-border rounded-full p-1.5 flex gap-1`. Height 60.
- Item: `h-12 px-5 rounded-full text-base font-semibold inline-flex items-center gap-2`, lucide icon 20 px.
- Active: `bg-primary text-primary-foreground` (indigo, black text, 7.04:1). `aria-current="page"`.
- Inactive: `text-muted-foreground hover:bg-muted hover:text-foreground`.
- Keep the sliding active indicator from `nav-pill.tsx`, painted as a plain `bg-primary rounded-full` pill. Delete `glass-chrome` and `glass-edge`.

### 5.10 Desktop stage (feed at 720 px card width and up)

- Page `bg-background`. Card centred, `w-[min(1120px,100vw-200px)]`, **height hugs content** (no fixed tall stage; that is what made the desktop card half empty). `rounded-4xl`.
- Back: `p-8`, grid `grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-10 items-stretch`.
  - Right column: clip `aspect-video rounded-2xl` (593 x 333 at full width), 20 px gap, breakdown (label plus `text-xl leading-7`), 20 px gap, action row 48. Column height about 500.
  - Left column: `flex flex-col justify-between`. Tag row at the top. Exchange below it with bubbles at `text-2xl leading-8` (24/32), `max-w-[92%]`. "Back to cue" ghost button pinned at the bottom left.
  - Resulting card: about 1120 x 565.
- Front: same box (it shares the grid cell). `p-10`. Eyebrow row top. Below it a two-column row filling the rest: left, the cue `text-7xl leading-none font-bold tracking-[-0.03em] max-w-[14ch]` (72 px), vertically centred; right, the footer panel (5.1) `w-[340px]`, pinned to the bottom.
- Prev/next: two `Button variant="outline" size="circle-lg"` stacked at the right of the card, lucide `ChevronUp` / `ChevronDown`. Disabled state is stock `disabled:opacity-50`.
- Keyboard hint: `text-xs text-muted-foreground`, centred, 24 px from the bottom. Render each key in stock `kbd` styling (`bg-muted rounded-md px-1.5 py-0.5 font-mono`).

## 6. Delete list

`src/app/globals.css`:
- The `@source inline(...)` line listing recipe utilities.
- All `@property` rules: `--move-hue`, `--hue-glow`, `--hue-glow-soft`, `--hue-shadow`, `--drift-x`, `--drift-y`.
- Custom colour tokens and their `@theme` mappings: `surface-base`, `surface-raised`, `surface-scrim`, `fg-primary`, `fg-secondary`, `fg-tertiary`, `fg-inverse`, `hairline`, `control`, `control-hover`, `control-pressed`, `focus`.
- Custom radii: `--radius-card`, `-stage`, `-sheet`, `-pane`, `-group`, `-bubble`, `-clip`, `-field`, `-pill`.
- Custom type scale: `text-cue-stage`, `text-cue`, `text-title`, `text-heading`, `text-line`, `text-line-compact`, `text-body`, `text-label`, `text-eyebrow`, `text-caption`. Use stock Tailwind sizes as specified above.
- Utilities: `glass-paint`, `glass-rim`, `glass-chrome`, `glass-chrome-strong`, `glass-control`, `glass-bubble`, `glass-edge`, `glass-specular`, `hue-tag`, `hue-bubble`, `hue-scope`, `focus-ring`, `skeleton-shimmer`.
- Classes and keyframes: `.ambient`, `.ambient-frame`, `.ambient-glow`, `.ambient-grain`, `.ambient-vignette`, `@keyframes ambient-drift`, `shimmer`. Delete `hint-pulse` too (the reveal is a real button now and does not pulse). Keep `ready-fade`.

Files:
- Delete `src/components/ui/ambient-layer.tsx` and its use in `src/app/layout.tsx`.
- Delete `src/lib/move-hue.ts` and `src/lib/move-hue.test.ts`; add `src/lib/move-color.ts` with a small test (index mod 5, unknown move falls back to `--chart-1`).
- `src/components/ui/motion.ts`: remove `specularSweep` and the ambient timing constants.
- `src/components/card/wit-card.tsx`, `card-front.tsx`, `card-back.tsx`, `clip.tsx`: remove the specular sweep child, `glass-paint`, `glass-rim`, `hue-scope`, `hue-glow*`, `glass-specular`, `moveHueStyle`.
- `src/components/feed/feed.tsx`: `glass-paint`, `glass-rim`.
- `src/components/saved/*`: `glass-control`, `glass-chrome-strong`, `hue-bubble`, `hue-scope`, `moveHueStyle`, ambient references in `card-detail.tsx` and `saved-search.tsx`.
- `src/components/ui/badge.tsx`: delete variants `move` and `glass`; replace the `focus-ring` utility in the base class with the stock ring classes.
- `src/components/ui/button.tsx`, `input.tsx`, `drawer.tsx`, `nav-pill.tsx`: remove `glass-*` and `hue-tag` variants and classes. Edit these by hand; do not overwrite from the registry, because `button.tsx` carries project sizes (`circle`, `circle-lg`, `pill-sm`) that screens use.
- `src/app/showcase` and `src/components/showcase/*`: delete the glass, ambient and hue demos. `e2e/routes.test.cjs` test R-6 expects `/showcase` to return 200 with noindex, so keep the route as one minimal page: the 13 colour tokens from section 2 as swatches, plus `Button` (default, outline, ghost), `Badge` in the five move colours and `Input`. Nothing else.
- Docs that become stale: `DESIGN_SYSTEM.md`, `DESIGN_DECISIONS.md` (D-THEME-1 to 4), `LAYOUT_PLAN.md` sections 3 to 5, `COMPONENTS_21ST.md`. Mark them superseded by this file. `docs/gates/*` screenshots need regenerating with `npm run shots`.

Class mapping. These names are deleted with their tokens, and Tailwind emits nothing for an unknown class, so every use must be replaced (counts are current uses in `src`):

| Old | Uses | New |
|---|---|---|
| `text-fg-primary` | 36 | `text-foreground` |
| `text-fg-secondary` | 47 | `text-muted-foreground` |
| `text-fg-tertiary` | 23 | `text-muted-foreground` (there is no third tier) |
| `text-fg-inverse` | 3 | `text-black` on move fills, else `text-primary-foreground` |
| `bg-surface-base` | 2 | `bg-background` |
| `bg-surface-raised` | 1 | `bg-card` |
| `bg-surface-scrim` | 2 | `bg-black/70` |
| `border-hairline` and other `hairline` uses | 10 | `border-border` |
| `bg-control` | 2 | `bg-muted` |
| `bg-control-hover` | 8 | `hover:bg-muted` |
| `bg-control-pressed` | 6 | `active:bg-muted/70` |
| `focus-ring` utility | 7 | `outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50` |
| `text-cue-stage` | 7 | `text-7xl leading-none font-bold tracking-[-0.03em]` |
| `text-cue` | 6 | the cue classes in 5.1 |
| `text-title` | 5 | `text-2xl font-bold` |
| `text-heading` | 14 | `text-lg font-semibold` |
| `text-line` | 6 | `text-xl leading-7` |
| `text-line-compact` | 4 | `text-base leading-6` |
| `text-body` | 25 | `text-base` |
| `text-label` | 31 | `text-sm font-semibold` |
| `text-eyebrow` | 5 | `text-sm font-semibold uppercase tracking-[0.08em]` |
| `text-caption` | 18 | `text-sm` |
| `rounded-card`, `-stage`, `-sheet`, `-pane` | 26 | `rounded-4xl` (`rounded-t-4xl` on the drawer) |
| `rounded-group`, `rounded-bubble` | 17 | `rounded-3xl` |
| `rounded-clip` | 7 | `rounded-2xl` |
| `rounded-pill`, `rounded-field` | 15 | `rounded-full` |
| `animate-shimmer` | 3 | `animate-pulse` |
| `animate-hint-pulse` | 4 | removed |

After the pass, `grep -rnE "fg-(primary|secondary|tertiary|inverse)|surface-|hairline|bg-control|glass-|hue-|ambient|specular|rounded-(card|stage|sheet|pane|group|bubble|clip|field|pill)|text-(cue|title|heading|line|body|label|eyebrow|caption)\b" src` must return nothing.

Not reused: move-hue tinting. The theme's chart palette replaces it (5.0).

## 7. Risks

1. **Five colours for 10 to 15 moves.** Colours repeat. Mitigated by the always-visible label. If the content pipeline ever needs unique colours, that is a new decision, not a tweak here.
2. **Teal `secondary` and yellow `accent`.** Any stock component that paints `bg-secondary` or `bg-accent` (secondary buttons, some menu and toggle hovers) will show a loud fill with black text. Audit after pasting: `grep -rn "bg-secondary\|bg-accent" src/components/ui`. In this build only `button` and `badge` secondary variants use them, and this doc forbids both.
3. **White `--input`.** Outline buttons, inputs and active tabs get a pure white 1 px border in dark mode. That is the theme's look and is intended. Do not soften it during this pass.
4. **Flat shadows.** The nav pill and drawer have no visible shadow. Separation relies on `bg-card` vs black (1.30:1) plus `border-border`. Keep the border on every floating surface.
5. **Full-colour card fronts are loud.** Yellow and green fronts are very bright in a dark room. This is the chosen direction ("playful"), and black-on-colour contrast is 7:1 or better. If it tests badly, the fallback is front on `bg-card` with only the footer panel and a 6 px top bar in the move colour. Do not blend the two.
6. **Tracking tokens.** If someone pastes the block from 2.1 without deviation 3, every `tracking-*` utility breaks silently.
7. **Light mode is untested.** Soft Pop light has black borders and a white-on-teal secondary. `text-black` on move fills is wrong for light chart-1 (dark indigo). Dark is forced, so it cannot be reached today.
8. **Long content.** Cues over about 60 characters clamp at six lines on the front; lines over three bubble lines clamp on the back. The content pipeline should be told the limits (cue 60 characters, lines 90, breakdown 80).
9. **375 x 667 is tight.** The compact back budget leaves 20 px. Check the three-line worst case there first.
10. **Test and screenshot churn.** Unit test for move hue goes away, e2e R-6 depends on `/showcase`, and every gate screenshot changes. axe contrast checks should pass more easily, but re-run them on the five coloured fronts.
11. **SPEC conflict.** SPEC.md still says "glassmorphic" and "based on Brink". Update that paragraph or reviewers will flag the new look as off-spec.
12. **Font swap.** DM Sans is wider than Geist. Any hard-coded widths or `ch`-based clamps in the feed chrome need a visual check.
