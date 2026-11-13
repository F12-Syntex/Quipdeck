# Quipdeck stack (from installed package.json / lockfile)

## Versions
- next 16.4.6 (App Router, src/ dir, alias `@/*` -> `src/*`). AGENTS.md warns: this Next has breaking changes, read `node_modules/next/dist/docs/` first.
- next.config.ts enables `cacheComponents: true` and `partialPrefetching: true` (scaffold defaults) and a turbopack rule using `@tailwindcss/turbopack` for `*.css`.
- react / react-dom 19.3.0, typescript ^5, eslint ^9 (flat config `eslint.config.mjs`, eslint-config-next 16.4.6)
- tailwindcss 4.3.3 (v4)
- framer-motion 14.13.0 (chosen over `motion`; import from `framer-motion`)
- lucide-react 1.72.0
- shadcn CLI ^4.23.0, style `base-nova` (built on `@base-ui/react` 1.9.0, NOT Radix; no `asChild`, check each component's props), baseColor neutral, CSS variables, iconLibrary lucide
- sonner ^2.0.8, next-themes ^0.4.6, tw-animate-css ^1.4.0

## Tailwind v4 conventions
- No tailwind.config file (components.json `tailwind.config` is empty). Tokens live in `src/app/globals.css`: `@theme inline { ... }` maps `--color-*`, `--font-*` to CSS variables; actual colour values are `:root` / `.dark` variables in the same file.
- Dark mode: `@custom-variant dark (&:is(.dark *))`, class-based.
- Fonts: `--font-sans: var(--font-geist-sans)` (fixed after shadcn init emitted a circular `var(--font-sans)`).

## Folders
- `src/app/` routes, layout, globals.css
- `src/components/ui/` shadcn primitives: button, drawer (the one sheet primitive; sheet and dialog deleted in P4-6), tabs, scroll-area, badge, tooltip, sonner, skeleton, separator
- `src/lib/utils.ts` (`cn`), `src/hooks/` alias target
- Add more: `npx shadcn@latest add <name> -y`
- Wrap app in `TooltipProvider` (and mount `<Toaster />` from `@/components/ui/sonner`) in the layout when used; T0 did not wire them.

## Commands
- dev: `npm run dev`
- build: `npm run build`
- start: `npm run start`
- lint: `npm run lint` (eslint)
- typecheck: `npx tsc --noEmit`
- Layout exports `metadata` (title "Quipdeck") and `viewport` (viewportFit cover, themeColor #0a0a0a).

## Proxy probe
- https://21st.dev/r/ -> 308 (redirect; 404 when followed with -L, so registry root is not a page; individual registry URLs untested)
- https://fonts.googleapis.com/css2?family=Inter -> 200
- https://fonts.gstatic.com -> 404 (bare root; host reachable)
- Fonts: `next/font/google` (Geist, Geist_Mono) WORKS in `npm run build`; no local font fallback needed.

## Pitfalls
- Tailwind v4: no tailwind.config; put tokens in globals.css.
- shadcn base-nova uses Base UI, so Radix-style `asChild` examples from docs may not apply.
- `next dev` may rewrite AGENTS.md block; commit it as-is.
- Package name is lowercase `quipdeck` (npm forbids capitals).

## Testing
Playwright is preinstalled globally: `require('playwright')` works and `chromium.launch()` needs no options. Do not install it.
