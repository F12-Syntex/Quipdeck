"use client";

import type { ReactNode } from "react";
import { HeartIcon, SearchIcon } from "lucide-react";
import { movesSortedAZ } from "@/content";
import { Badge, MOVE_BADGE } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { moveColorStyle } from "@/lib/move-color";

/*
 * Showcase (R-6, D-THEME-8). The Soft Pop tokens the screens use and the
 * stock components they are built from. Nothing else: no demo screens.
 */

/** REDESIGN_V2 section 2, dark palette: the 13 colour tokens and their use. */
const TOKENS: { name: string; use: string; text?: string }[] = [
  { name: "background", use: "Page, nav gutter, footer panel on the cue card" },
  { name: "card", use: "Card back, list groups, drawer, nav pill (= popover)" },
  {
    name: "muted",
    use: "Trigger bubble, skeleton, hover rows, fallback notice",
  },
  { name: "border", use: "Hairlines" },
  { name: "input", use: "Outline-button and input borders" },
  { name: "foreground", use: "Primary text" },
  { name: "muted-foreground", use: "Secondary text, 14 px or larger" },
  {
    name: "primary",
    use: "Primary button, active nav, saved heart (= chart-1)",
    text: "primary-foreground",
  },
  {
    name: "secondary",
    use: "Teal (= chart-2). Not used as a button",
    text: "secondary-foreground",
  },
  {
    name: "accent",
    use: "Yellow (= chart-3). Not used as a fill on controls",
    text: "accent-foreground",
  },
  { name: "chart-4", use: "Pink move colour", text: "chart-4-foreground" },
  { name: "chart-5", use: "Green move colour", text: "chart-5-foreground" },
  { name: "destructive", use: "Errors only", text: "destructive-foreground" },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-2xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

export function Showcase() {
  return (
    <div className="flex flex-col gap-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold tracking-[-0.02em]">
          Quipdeck design system
        </h1>
        <p className="max-w-[60ch] text-base text-muted-foreground">
          Soft Pop from tweakcn (Apache-2.0), dark. DM Sans, radius 1rem, flat
          surfaces, five chart colours for the moves. Stock shadcn components.
        </p>
      </header>

      <Section title="Colour tokens">
        <ul
          data-testid="showcase-tokens"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {TOKENS.map((t) => (
            <li
              key={t.name}
              data-token={t.name}
              className="flex items-center gap-4 rounded-3xl border border-border bg-card p-3"
            >
              <span
                aria-hidden="true"
                className="flex size-16 shrink-0 items-center justify-center rounded-2xl border border-border text-lg font-bold"
                style={{
                  backgroundColor: `var(--${t.name})`,
                  color: t.text ? `var(--${t.text})` : undefined,
                }}
              >
                {t.text ? "Aa" : null}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="font-mono text-sm font-bold">--{t.name}</span>
                <span className="text-sm text-muted-foreground">{t.use}</span>
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Button">
        <div className="flex flex-wrap items-center gap-3">
          <Button size="pill">Default</Button>
          <Button size="pill" variant="outline">
            Outline
          </Button>
          <Button size="pill" variant="ghost">
            Ghost
          </Button>
          <Button size="circle-lg" variant="outline" aria-label="Save">
            <HeartIcon aria-hidden="true" />
          </Button>
          <Button size="circle-lg" aria-label="Saved">
            <HeartIcon aria-hidden="true" fill="currentColor" />
          </Button>
          <Button size="pill" disabled>
            Disabled
          </Button>
        </div>
      </Section>

      <Section title="Badge in the five move colours">
        <div className="flex flex-wrap gap-3">
          {movesSortedAZ.slice(0, 5).map((m) => (
            <span key={m.id} style={moveColorStyle(m.id)}>
              <Badge className={MOVE_BADGE}>{m.label}</Badge>
            </span>
          ))}
        </div>
      </Section>

      <Section title="Input">
        <div className="relative max-w-[480px]">
          <SearchIcon
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-4 z-10 size-5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            aria-label="Search (sample)"
            placeholder="Search saved"
            className="h-13 rounded-full pr-12 pl-12 text-base md:text-base"
          />
        </div>
      </Section>
    </div>
  );
}
