"use client"

import * as React from "react"
import { Toggle } from "@base-ui/react/toggle"
import { motion, useReducedMotion } from "framer-motion"
import { HeartIcon } from "lucide-react"
import { cn } from "@/lib/utils"

import { buttonVariants } from "@/components/ui/button"
import { heartPop, heartScale } from "@/components/ui/motion"

/*
 * Heart (D-SAVE-5). Ported from 21st.dev "Heart Favorite" 10627: a toggle
 * whose heart pops once when it fills. Changes from the source: Base UI
 * Toggle (aria-pressed, controlled or not), a 48 px stock Button circle
 * (outline when off, default indigo with a filled heart when on; REDESIGN_V2
 * 5.2) instead of a hover-tinted ghost button, no red-500 and no glow, a
 * 1.18 pop (heartScale / heartPop) instead of 1.3, a pop on save only, by
 * press or, when controlled, by any false -> true change of `pressed` (never
 * on mount, so an already-saved heart in the Saved detail stays still, and
 * never on unsave), and no pop under reduced motion. The press scale comes
 * from the Button recipe, so it also stops under reduced motion.
 */

type HeartToggleProps = Omit<Toggle.Props, "children" | "render"> & {
  /** Accessible name. Fixed, the state is in aria-pressed (D-SAVE-5). */
  label?: string
}

function HeartToggle({
  label = "Save",
  className,
  pressed,
  onPressedChange,
  ...props
}: HeartToggleProps) {
  const reduced = useReducedMotion()
  // Bumped on each save; keys the icon so the pop replays.
  const [pops, setPops] = React.useState(0)
  // Controlled use (the card heart follows the saves store): a false -> true
  // change of `pressed` from outside (the S key) pops too. The first render
  // only records the value, so a heart that mounts saved stays still.
  const [prevPressed, setPrevPressed] = React.useState(pressed)
  if (pressed !== prevPressed) {
    setPrevPressed(pressed)
    if (pressed && !prevPressed && !reduced) setPops((n) => n + 1)
  }

  return (
    <Toggle
      data-slot="heart-toggle"
      aria-label={label}
      className={(state) =>
        cn(
          buttonVariants({ variant: state.pressed ? "default" : "outline", size: "circle-lg" }),
          typeof className === "function" ? className(state) : className
        )
      }
      pressed={pressed}
      onPressedChange={(next, details) => {
        // Uncontrolled: pop here. Controlled: the prop change above pops.
        if (pressed === undefined && next && !reduced) setPops((n) => n + 1)
        onPressedChange?.(next, details)
      }}
      {...props}
      render={(htmlProps, state) => (
        <button {...htmlProps}>
          <motion.span
            key={pops}
            aria-hidden="true"
            className="inline-flex"
            animate={pops > 0 && !reduced ? { scale: [...heartScale] } : undefined}
            transition={heartPop}
          >
            <HeartIcon
              className="size-5 transition-[fill] duration-(--dur-fast) ease-soft"
              fill={state.pressed ? "currentColor" : "none"}
            />
          </motion.span>
        </button>
      )}
    />
  )
}

export { HeartToggle }
export type { HeartToggleProps }
