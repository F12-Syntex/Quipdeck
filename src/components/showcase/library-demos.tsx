"use client";

import { useState, type ReactNode } from "react";
import { BookmarkIcon, LayersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHandle,
  DrawerPopup,
  DrawerTitle,
  DrawerTrigger,
  drawerSurfaceClassName,
} from "@/components/ui/drawer";
import { HeartToggle } from "@/components/ui/heart-toggle";
import { NavPill, NavPillItem } from "@/components/ui/nav-pill";

/*
 * P3-2: the 21st.dev ports, each shown statically (so the gate screenshot
 * carries every state) and live. Client file: the demos hold state.
 */

const FOCUS = { "data-focus-visible": "" } as const;
const PANEL = "glass-paint glass-rim relative flex flex-col gap-4 rounded-card p-5";

function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2">
      {children}
      <span className="text-caption text-fg-tertiary">{label}</span>
    </div>
  );
}

function Source({ children }: { children: ReactNode }) {
  return <p className="text-label text-fg-secondary">{children}</p>;
}

/* ---------------- nav pill ---------------- */

const NAV = [
  { key: "feed", label: "Feed", Icon: LayersIcon },
  { key: "saved", label: "Saved", Icon: BookmarkIcon },
] as const;

function StaticPill({
  active,
  focus,
  pressed,
  label,
}: {
  active: "feed" | "saved";
  focus?: "feed" | "saved";
  pressed?: "feed" | "saved";
  label: string;
}) {
  return (
    <NavPill aria-label={label} className="w-[200px]">
      {NAV.map(({ key, label: text, Icon }) => (
        <NavPillItem
          key={key}
          active={active === key}
          aria-current={active === key ? "page" : undefined}
          render={<button type="button" tabIndex={-1} />}
          className={pressed === key ? "scale-[0.97]" : undefined}
          {...(focus === key ? FOCUS : {})}
        >
          <Icon aria-hidden="true" />
          {text}
        </NavPillItem>
      ))}
    </NavPill>
  );
}

function NavPillDemo() {
  const [active, setActive] = useState<"feed" | "saved">("feed");
  return (
    <div className="flex flex-col gap-5" data-testid="library-nav-pill">
      <Source>NavPill + NavPillItem, from Bottom Nav Bar (21st.dev 8343)</Source>
      <div className="flex flex-wrap items-start justify-center gap-x-8 gap-y-5 lg:justify-start">
        <Cell label="Live: press to slide the capsule">
          <NavPill aria-label="Showcase navigation" className="w-[200px]">
            {NAV.map(({ key, label, Icon }) => (
              <NavPillItem
                key={key}
                active={active === key}
                aria-current={active === key ? "page" : undefined}
                render={<button type="button" onClick={() => setActive(key)} />}
              >
                <Icon aria-hidden="true" />
                {label}
              </NavPillItem>
            ))}
          </NavPill>
        </Cell>
        <Cell label="Saved active">
          <StaticPill label="Static, Saved active" active="saved" />
        </Cell>
        <Cell label="Focus-visible on Saved">
          <StaticPill label="Static, focus" active="feed" focus="saved" />
        </Cell>
        <Cell label="Pressed (0.97)">
          <StaticPill label="Static, pressed" active="feed" pressed="saved" />
        </Cell>
      </div>
    </div>
  );
}

/* ---------------- heart ---------------- */

function HeartDemo() {
  // Controlled, as on the card: the saves store drives `pressed`, and the S
  // key can save from outside the button.
  const [saved, setSaved] = useState(false);
  return (
    <div className={PANEL} data-testid="library-heart">
      <Source>HeartToggle, from Heart Favorite (21st.dev 10627)</Source>
      <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
        <Cell label="Off">
          <HeartToggle />
        </Cell>
        <Cell label="On">
          <HeartToggle defaultPressed />
        </Cell>
        <Cell label="Focus-visible">
          <HeartToggle {...FOCUS} />
        </Cell>
        <Cell label="Pressed (0.97)">
          <HeartToggle className="scale-[0.97] bg-control-pressed" />
        </Cell>
        <Cell label="Disabled">
          <HeartToggle disabled />
        </Cell>
        <div className="flex items-center gap-3" data-testid="library-heart-controlled">
          <HeartToggle pressed={saved} onPressedChange={setSaved} />
          <Button variant="quiet" size="pill-sm" onClick={() => setSaved((v) => !v)}>
            Save from outside (S key)
          </Button>
        </div>
      </div>
      <p className="text-caption text-fg-tertiary">
        Each one is live. The heart pops to 1.18 once on save, never on unsave,
        never on mount, and not at all under reduced motion.
      </p>
    </div>
  );
}

/* ---------------- drawer ---------------- */

function DrawerDemo() {
  return (
    <div className="flex flex-col gap-4" data-testid="library-drawer">
      <Source>Drawer, from Drawer (Base UI) (21st.dev 24837), D-SAVED-8</Source>
      <div className="ambient-frame hue-scope flex h-[280px] items-end justify-center overflow-hidden rounded-card px-3">
        <div aria-hidden="true" className="ambient-glow" />
        <div aria-hidden="true" className="ambient-grain" />
        <div className={`${drawerSurfaceClassName} pb-6`}>
          <DrawerHandle />
          <div className="flex flex-col gap-1 px-5">
            <p className="text-heading text-fg-primary">Someone uses a figure of speech</p>
            <p className="text-body text-fg-secondary">
              Static drawing of the open drawer: glass-chrome-strong,
              rounded-sheet, the grabber strip. Swipe down to dismiss.
            </p>
          </div>
        </div>
      </div>
      <Drawer>
        <DrawerTrigger
          data-testid="drawer-demo-trigger"
          render={<Button variant="glass" size="pill" className="self-start" />}
        >
          Open drawer
        </DrawerTrigger>
        <DrawerPopup data-testid="drawer-demo-popup">
          <DrawerHandle data-testid="drawer-demo-handle" />
          <DrawerContent className="flex flex-col gap-3 px-5 pb-4">
            <DrawerTitle>Someone uses a figure of speech</DrawerTitle>
            <DrawerDescription>
              Swipe down, press Escape, tap the scrim or use Close. Focus
              returns to the button that opened it.
            </DrawerDescription>
            {Array.from({ length: 6 }, (_, i) => (
              <p key={i} className="text-body text-fg-secondary">
                Long content scrolls inside the drawer. A downward swipe only
                dismisses once this area is scrolled to the top, so reading
                never closes the sheet by accident.
              </p>
            ))}
            <DrawerClose render={<Button variant="glass" size="pill" className="self-start" />}>
              Close
            </DrawerClose>
          </DrawerContent>
        </DrawerPopup>
      </Drawer>
    </div>
  );
}

export function LibraryDemos() {
  return (
    <div className="flex flex-col gap-10">
      <NavPillDemo />
      <HeartDemo />
      <DrawerDemo />
      <div className={PANEL} data-testid="library-dropped">
        <Source>Dropped: Glass Card (21st.dev 28259)</Source>
        <p className="max-w-[70ch] text-body text-fg-secondary">
          Its signature parts (backdrop refraction, pointer-tracked specular,
          chromatic rim, hover lift) are banned on rotating faces. What is
          left is a full-perimeter inner ring at 55% white, louder than the
          top-left rim at 32%, and a bottom shade that cannot be seen at a calm
          strength. This panel is the P2 glass-paint and glass-rim, which stay.
        </p>
      </div>
    </div>
  );
}
