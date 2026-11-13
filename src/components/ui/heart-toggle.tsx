"use client"

import * as React from "react"
import { Toggle } from "@base-ui/react/toggle"
import { motion, useReducedMotion } from "framer-motion"
import { HeartIcon } from "lucide-react"
import { cn } from "cn"

import { buttonVariants } from "@/components/ui/button"
import { heartPop, heartScale } from "@/components/ui/motion"

/*
 * Heart (D-SAVE-5). Ported from 21st.dev "Heart Favorite" 10627: a toggle
 * whose heart pops once when it fills. Changes from the source: Base UI
 * Toggle (aria-pressed, controlled or not), the 44 px glass circle instead
 * of a hover-tinted ghost button, fg-primary fill instead of red-500, a
 * 1.18 pop (heartScale / heartPop) instead of 1.3, a pop on save only (never
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
  onPressedChange,
  ...props
}: HeartToggleProps) {
  const reduced = useReducedMotion()
  // Bumped on each save by the user; keys the icon so the pop replays.
  const [pops, setPops] = React.useState(0)

  return (
    <Toggle
      data-slot="heart-toggle"
      aria-label={label}
      className={(state) =>
        cn(
          buttonVariants({ variant: "glass", size: "circle" }),
          typeof className === "function" ? className(state) : className
        )
      }
      onPressedChange={(pressed, details) => {
        if (pressed && !reduced) setPops((n) => n + 1)
        onPressedChange?.(pressed, details)
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
