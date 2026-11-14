"use client"

import * as React from "react"
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer"
import { cn } from "@/lib/utils"

/*
 * Bottom drawer (D-SAVED-8). Ported from 21st.dev "Drawer (Base UI)" 24837
 * onto the theme: bg-popover, rounded-t-4xl, a bg-black/70 backdrop (no
 * blur), a border on top (Soft Pop is flat: no shadow), --dur-sheet / ease-soft.
 * Bottom only: the side, nested-drawer and indent parts are dropped.
 *
 * Base UI owns swipe-to-dismiss. While the finger moves the popup follows
 * it (--drawer-swipe-movement-y) and the scrim fades with
 * --drawer-swipe-progress. A release finishes in
 * --drawer-swipe-strength x --dur-sheet. Under reduced motion --dur-sheet
 * is 0, so opening and closing are instant; the drag still tracks the
 * finger, because that is direct manipulation, not animation.
 *
 * Swipe and scroll: put scrolling content in <DrawerContent>. Base UI only
 * dismisses on a downward swipe once that content is scrolled to the top.
 * Add `data-base-ui-swipe-ignore` to an element (the clip frame) that must
 * never start a swipe.
 */

/** Base UI accepts a className function of the part's state; merge either form. */
function withBase<S>(
  base: string,
  className: string | ((state: S) => string | undefined) | undefined
) {
  return (state: S) =>
    cn(base, typeof className === "function" ? className(state) : className)
}

/** Distance the popup extends below the screen, so an upward overshoot never shows a gap. */
const BLEED = "[--bleed:3rem]"

/** The drawer surface. */
const drawerSurfaceClassName =
  "relative flex w-full max-w-[560px] flex-col rounded-t-4xl border border-b-0 border-border bg-popover text-popover-foreground outline-none"

function Drawer({
  ...props
}: Omit<DrawerPrimitive.Root.Props, "swipeDirection">) {
  return <DrawerPrimitive.Root swipeDirection="down" {...props} />
}

function DrawerTrigger({ ...props }: DrawerPrimitive.Trigger.Props) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />
}

function DrawerClose({ ...props }: DrawerPrimitive.Close.Props) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />
}

function DrawerPortal({ ...props }: DrawerPrimitive.Portal.Props) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />
}

function DrawerBackdrop({
  className,
  ...props
}: DrawerPrimitive.Backdrop.Props) {
  return (
    <DrawerPrimitive.Backdrop
      data-slot="drawer-backdrop"
      className={withBase(
        "fixed inset-0 z-50 min-h-dvh bg-black/70 opacity-[calc(1-var(--drawer-swipe-progress,0))] transition-opacity duration-(--dur-sheet) ease-soft data-swiping:duration-0 data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-[calc(var(--drawer-swipe-strength,1)*var(--dur-sheet))] supports-[-webkit-touch-callout:none]:absolute",
        className
      )}
      {...props}
    />
  )
}

function DrawerViewport({
  className,
  ...props
}: DrawerPrimitive.Viewport.Props) {
  return (
    <DrawerPrimitive.Viewport
      data-slot="drawer-viewport"
      className={withBase(
        "fixed inset-0 z-50 flex items-end justify-center",
        className
      )}
      {...props}
    />
  )
}

/**
 * Portal, scrim, viewport and the popup in one. Pass `finalFocus` to
 * send focus back to the row that opened it (D-SAVED-7).
 */
function DrawerPopup({
  className,
  children,
  container,
  ...props
}: DrawerPrimitive.Popup.Props & {
  container?: DrawerPrimitive.Portal.Props["container"]
}) {
  return (
    <DrawerPortal container={container}>
      <DrawerBackdrop />
      <DrawerViewport>
        <DrawerPrimitive.Popup
          data-slot="drawer-popup"
          className={withBase(
            cn(
            drawerSurfaceClassName,
            BLEED,
            "-mb-(--bleed) max-h-[calc(92dvh+var(--bleed))] pb-[calc(env(safe-area-inset-bottom,0px)+var(--bleed))]",
            "transform-[translateY(var(--drawer-swipe-movement-y,0px))] transition-transform duration-(--dur-sheet) ease-soft will-change-transform",
            "data-swiping:duration-0 data-swiping:select-none",
            "data-starting-style:transform-[translateY(calc(100%-var(--bleed)))] data-ending-style:transform-[translateY(calc(100%-var(--bleed)))]",
            "data-ending-style:duration-[calc(var(--drawer-swipe-strength,1)*var(--dur-sheet))]"
            ),
            className
          )}
          {...props}
        >
          {children}
        </DrawerPrimitive.Popup>
      </DrawerViewport>
    </DrawerPortal>
  )
}

/** Scrolling body of the drawer. Swipe-to-dismiss waits until it is at the top. */
function DrawerContent({
  className,
  ...props
}: DrawerPrimitive.Content.Props) {
  return (
    <DrawerPrimitive.Content
      data-slot="drawer-content"
      className={withBase(
        "min-h-0 flex-1 touch-auto overflow-y-auto overscroll-contain",
        className
      )}
      {...props}
    />
  )
}

/**
 * Grabber strip: a 32 px tall touch row with the 40 x 5 grabber pill,
 * 10 px from the top. Decorative; the whole popup is swipeable. Takes
 * `data-testid` and other props.
 */
function DrawerHandle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      data-slot="drawer-handle"
      className={cn(
        "flex h-8 shrink-0 cursor-grab items-start justify-center pt-2.5",
        className
      )}
      {...props}
    >
      <div className="h-[5px] w-10 rounded-full bg-border" />
    </div>
  )
}

function DrawerTitle({ className, ...props }: DrawerPrimitive.Title.Props) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={withBase("text-2xl leading-7 font-bold tracking-[-0.01em] text-popover-foreground", className)}
      {...props}
    />
  )
}

function DrawerDescription({
  className,
  ...props
}: DrawerPrimitive.Description.Props) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={withBase("text-base text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Drawer,
  DrawerTrigger,
  DrawerClose,
  DrawerPortal,
  DrawerBackdrop,
  DrawerViewport,
  DrawerPopup,
  DrawerContent,
  DrawerHandle,
  DrawerTitle,
  DrawerDescription,
  drawerSurfaceClassName,
}
