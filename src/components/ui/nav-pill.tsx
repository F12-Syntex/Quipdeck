"use client"

import * as React from "react"
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { LayoutGroup, motion, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"

import { capsuleSpring } from "@/components/ui/motion"

/*
 * Nav pill (REDESIGN_V2 5.9). Ported from 21st.dev "Bottom Nav Bar" 8343:
 * a pill of icon-and-label items with a capsule behind the active one that
 * slides to the new item (shared layout, capsuleSpring, critically damped;
 * instant under reduced motion). The pill is a flat card surface with a
 * border (Soft Pop has no visible shadows); the capsule is bg-primary.
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
        "flex h-[60px] items-stretch gap-1 rounded-full border border-border bg-card p-1.5",
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
      "relative isolate inline-flex h-12 min-w-[88px] flex-1 items-center justify-center gap-2 rounded-full px-5 text-base font-semibold text-muted-foreground outline-none select-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring data-[active]:text-primary-foreground data-[active]:hover:bg-transparent [&_svg]:size-5 [&_svg]:shrink-0",
      className
    ),
    children: (
      <>
        {active ? (
          <motion.span
            layoutId="nav-pill-capsule"
            aria-hidden="true"
            data-slot="nav-pill-capsule"
            className="absolute inset-0 -z-10 rounded-full bg-primary"
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
