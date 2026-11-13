import { createCn } from "cn/config"

/**
 * Custom tokens from the `@theme` block in src/app/globals.css.
 * Keep these in step with the file: utils.test.ts reads globals.css and fails
 * if either list drifts.
 */

/** `--text-*` tokens (font-size utilities: `text-heading`, `text-body`, ...). */
export const CUSTOM_TEXT_SIZES = [
  "cue-stage",
  "cue",
  "title",
  "heading",
  "line",
  "line-compact",
  "body",
  "label",
  "eyebrow",
  "caption",
] as const

/** Quipdeck `--color-*` tokens (`text-fg-secondary`, `bg-surface-base`, ...). */
export const CUSTOM_COLORS = [
  "surface-base",
  "surface-raised",
  "surface-scrim",
  "fg-primary",
  "fg-secondary",
  "fg-tertiary",
  "fg-inverse",
  "hairline",
  "control",
  "control-hover",
  "control-pressed",
  "focus",
] as const

/** Shared merge config: custom sizes are font-size, custom colours stay colour. */
export const mergeConfig = {
  extend: {
    classGroups: {
      "font-size": [{ text: [...CUSTOM_TEXT_SIZES] }],
      "text-color": [{ text: [...CUSTOM_COLORS] }],
    },
  },
}

export const cn = createCn(mergeConfig)
