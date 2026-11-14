import { createCn } from "cn/config"

/**
 * The project's class merge (D-THEME-7). Since UI-V2 the design system uses
 * stock Tailwind and shadcn tokens only (D-THEME-8): globals.css defines no
 * custom `--text-*` size or `--color-*` token beyond the shadcn names, so the
 * merge needs no extension. utils.test.ts reads globals.css and fails if a
 * custom token comes back without being listed here.
 */

/** Custom `--text-*` size tokens in globals.css. None: stock sizes only. */
export const CUSTOM_TEXT_SIZES = [] as const

/** Custom `--color-*` tokens beyond the shadcn names. None. */
export const CUSTOM_COLORS = [] as const

export const mergeConfig = {}

export const cn = createCn(mergeConfig)
