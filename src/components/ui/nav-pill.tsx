"use client"

import * as React from "react"
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { LayoutGroup, motion, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"

import { capsuleSpring } from "@/components/ui/motion"

/*
 * Nav pill (LAYOUT_PLAN section 2). Ported from 21st.dev "Bottom Nav Bar"
 * 8343: a pill of icon-and-label items with a capsule behind the active
 * one. Kept: the capsule, now a shared-layout element that slides to the
 * new item (capsuleSpring, critically damped). Dropped: the six demo items,
 * the label that springs open on the active item (both labels always show,
 * so nothing changes width), the scale-in on mount, the hover fill, and
 * `focus-visible:ring-0` (the focus ring stays). Surfaces are glass-chrome
 * and --control-active.
 *
 * Presentational only. The caller owns the <nav> label, the links and
 * aria-current: render each item as a Next Link with
 * `render={<Link href="/saved" />}` (Base UI useRender, no asChild).
 * Placement (fixed, bottom or top centre, safe areas) is the caller's.
 */

function NavPill({ className, children, ...props }: React.ComponentProps<"nav">) {
  // Scopes the capsule's layoutId, so two pills on one page never trade it.
  const group = React.useId()
  return (
    <nav
      data-slot="nav-pill"
      className={cn(
        "glass-chrome flex h-[52px] items-stretch gap-1 rounded-pill p-1",
        className
      )}
      {...props}
    >
      <LayoutGroup id={group}>{children}</LayoutGroup>
    </nav>
  )
}

type NavPillItemProps = useRender.ComponentProps<"a"> & {
  /** The current route. Draws the capsule; the caller also sets aria-current. */
  active?: boolean
}

function NavPillItem({
  render,
  active = false,
  className,
  children,
  ...props
}: NavPillItemProps) {
  const reduced = useReducedMotion()
  const own = {
    "data-slot": "nav-pill-item",
    "data-active": active ? "" : undefined,
    className: cn(
      "relative isolate flex min-h-11 min-w-[88px] flex-1 items-center justify-center gap-1.5 rounded-pill px-4 text-label text-fg-secondary outline-none select-none transition-[color,transform] duration-(--dur-fast) ease-soft focus-ring hover:text-fg-primary active:scale-[0.97] motion-reduce:active:scale-100 data-[active]:text-fg-primary [&_svg]:size-4 [&_svg]:shrink-0",
      className
    ),
    children: (
      <>
        {active ? (
          <motion.span
            layoutId="nav-pill-capsule"
            aria-hidden="true"
            data-slot="nav-pill-capsule"
            className="absolute inset-0 -z-10 rounded-pill bg-[var(--control-active)] shadow-[inset_0_1px_0_0_oklch(1_0_0/0.12),inset_0_0_0_1px_var(--glass-edge)]"
            transition={reduced ? { duration: 0 } : capsuleSpring}
          />
        ) : null}
        {children}
      </>
    ),
  } as React.ComponentProps<"a">

  return useRender({
    defaultTagName: "a",
    render,
    props: mergeProps<"a">(own, props),
  })
}

export { NavPill, NavPillItem }
export type { NavPillItemProps }
