import type { CSSProperties, ReactNode } from "react";
import { HeartIcon, Volume2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { SheetGrabber } from "@/components/ui/sheet";
import { cards, getMove } from "@/content";
import { MOVE_HUE_RING, moveHue, moveHueStyle } from "@/lib/move-hue";
import { MotionDemos } from "./motion-demos";
import { OverlayDemos } from "./overlay-demos";

/*
 * Showcase (R-6, P2-2). Built only from the tokens in globals.css and the
 * primitives in components/ui. Forced states use the same token classes the
 * primitives use for :hover, :active and :focus-visible, so a state reads
 * the same here as in the product.
 */

/*
 * Forced focus-visible: the primitives reset `outline` and draw the ring
 * through the `focus-ring` recipe, which also answers to the
 * `data-focus-visible` attribute. A class here would lose to `outline-none`.
 */
const FOCUS = { "data-focus-visible": "" } as const;
const focusProps = (state: string) => (state === "focus" ? FOCUS : {});
const PRESSED = "scale-[0.97]";

function Section({
  id,
  title,
  note,
  children,
}: {
  id: string;
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section data-section={id} aria-labelledby={`sc-${id}`} className="mt-14">
      <h2 id={`sc-${id}`} className="text-heading text-fg-primary">
        {title}
      </h2>
      {note ? (
        <p className="mt-1 max-w-[70ch] text-body text-fg-secondary">{note}</p>
      ) : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Caption({ children }: { children: ReactNode }) {
  return <span className="text-caption text-fg-tertiary">{children}</span>;
}

/* ---------------- tokens ---------------- */

const SURFACES: { token: string; className: string; style?: CSSProperties }[] = [
  { token: "--surface-base", className: "bg-surface-base" },
  { token: "--surface-base-top", className: "", style: { background: "var(--surface-base-top)" } },
  { token: "--surface-base-bottom", className: "", style: { background: "var(--surface-base-bottom)" } },
  { token: "--surface-raised", className: "bg-surface-raised" },
  { token: "--surface-scrim", className: "bg-surface-scrim" },
  { token: "--hairline", className: "bg-hairline" },
];

const TEXTS = [
  { token: "--fg-primary", cls: "text-fg-primary", use: "Cue, lines, titles" },
  { token: "--fg-secondary", cls: "text-fg-secondary", use: "Move label, breakdown, helpers" },
  { token: "--fg-tertiary", cls: "text-fg-tertiary", use: "Hint, key hints, source, placeholder" },
] as const;

const RADII = [
  ["rounded-card", "32 px", "rounded-card"],
  ["rounded-stage", "40 px", "rounded-stage"],
  ["rounded-sheet", "32 px", "rounded-sheet"],
  ["rounded-pane", "32 px", "rounded-pane"],
  ["rounded-group", "24 px", "rounded-group"],
  ["rounded-bubble", "20 px", "rounded-bubble"],
  ["rounded-clip", "20 px", "rounded-clip"],
  ["rounded-pill", "full", "rounded-pill"],
] as const;

const TYPE = [
  ["text-cue-stage", "56 / 1.06 / 600", "text-cue-stage"],
  ["text-cue", "34 / 1.12 / 600", "text-cue"],
  ["text-title", "28 / 1.15 / 600", "text-title"],
  ["text-heading", "18 / 1.3 / 600", "text-heading"],
  ["text-line", "16 / 20", "text-line"],
  ["text-line-compact", "15 / 18", "text-line-compact"],
  ["text-body", "15 / 1.4", "text-body"],
  ["text-label", "13 / 1.2 / 500", "text-label"],
  ["text-eyebrow", "12 / 1.2 / 0.08em / 600", "text-eyebrow uppercase"],
  ["text-caption", "13 / 1.3", "text-caption"],
] as const;

function Tokens() {
  return (
    <>
      <Section id="surfaces" title="Surfaces" note="Page canvas, raised fill, scrim and hairline. The ambient layer sits behind this whole page.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {SURFACES.map((s) => (
            <div key={s.token} className="flex flex-col gap-2">
              <div
                className={`h-16 rounded-bubble border border-hairline ${s.className}`}
                style={s.style}
              />
              <code className="text-caption text-fg-secondary">{s.token}</code>
            </div>
          ))}
        </div>
      </Section>

      <Section id="text" title="Text" note="Three tiers plus the inverse. The contrast script checks each on the surfaces it sits on.">
        <div className="glass-paint glass-rim relative flex flex-col gap-3 rounded-card p-5">
          {TEXTS.map((t) => (
            <p key={t.token} className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className={`text-body ${t.cls}`}>Read the situation, flip the card</span>
              <code className="text-caption text-fg-tertiary">
                {t.token}, {t.use}
              </code>
            </p>
          ))}
          <p className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="rounded-pill bg-fg-primary px-4 py-1 text-label text-fg-inverse">
              Inverse on a solid light fill
            </span>
            <code className="text-caption text-fg-tertiary">--fg-inverse</code>
          </p>
        </div>
      </Section>

      <Section id="glass" title="Glass recipes" note="Each recipe on the ambient layer. Painted glass has no backdrop blur; chrome does.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["glass-paint glass-rim", "glass-paint glass-rim relative", "Rotating card faces"],
            ["glass-chrome", "glass-chrome", "Nav pill, search, prev / next"],
            ["glass-chrome-strong", "glass-chrome-strong", "Sheet, pane, dialog"],
            ["glass-control", "glass-control", "Heart, mute, field"],
            ["glass-bubble", "glass-bubble", "Trigger line"],
            ["hue-bubble", "hue-bubble", "Response line"],
            ["hue-tag", "hue-tag", "Move tag"],
            ["glass-rim (on chrome)", "glass-chrome glass-rim relative", "Optional nav pill rim"],
          ].map(([name, cls, use]) => (
            <div
              key={name}
              style={name === "hue-bubble" || name === "hue-tag" ? moveHueStyle("escalation") : undefined}
              className={`flex h-28 flex-col justify-between rounded-bubble p-4 ${cls}`}
            >
              <code className="text-label text-fg-primary">{name}</code>
              <span className="text-caption text-fg-secondary">{use}</span>
            </div>
          ))}
        </div>
        <p className="mt-6 text-label text-fg-secondary">
          Move hue ring: hue-tag and hue-bubble per slot ({MOVE_HUE_RING.length} hues)
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {MOVE_HUE_RING.map((h) => (
            <div
              key={h}
              style={{ "--move-hue": String(h) } as CSSProperties}
              className="glass-paint glass-rim relative flex flex-col gap-2 rounded-bubble p-3"
            >
              <span className="hue-tag w-fit rounded-pill px-3 py-1 text-label">{h} deg</span>
              <span className="hue-bubble rounded-bubble px-3 py-2 text-caption text-fg-primary">
                Response
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section id="radii" title="Radii">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {RADII.map(([name, size, cls]) => (
            <div key={name} className={`glass-control flex h-20 flex-col justify-end p-3 ${cls}`}>
              <code className="text-label text-fg-primary">{name}</code>
              <Caption>{size}</Caption>
            </div>
          ))}
        </div>
      </Section>

      <Section id="type" title="Type scale" note="Geist. The cue is the largest text in the product.">
        <div className="glass-paint glass-rim relative flex flex-col divide-y divide-hairline rounded-card px-5 py-2">
          {TYPE.map(([name, spec, cls]) => (
            <div key={name} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3">
              <span className={`${cls} text-fg-primary`}>
                {name === "text-cue" || name === "text-cue-stage"
                  ? "Someone uses a figure of speech"
                  : name === "text-title"
                    ? "Saved"
                    : "Took 'I could eat a horse' at face value"}
              </span>
              <code className="text-caption text-fg-tertiary">
                {name}, {spec}
              </code>
            </div>
          ))}
        </div>
      </Section>

      <Section
        id="motion"
        title="Motion"
        note="Live demos. Under prefers-reduced-motion the flip becomes a 150 ms crossfade, the heart only changes state, the pulse, shimmer and drift stop, and the hue still fades (400 ms, no movement). Sheet rise and the ready fade drop to opacity or nothing."
      >
        <MotionDemos />
      </Section>
    </>
  );
}

/* ---------------- primitives ---------------- */

const STATES = [
  ["default", ""],
  ["hover", "hover"],
  ["focus-visible", "focus"],
  ["pressed", "pressed"],
  ["disabled", "disabled"],
] as const;

type StateKey = (typeof STATES)[number][1];

/** Classes that force a state, mirroring each variant's own :hover / :active rules. */
function forced(variant: string, state: StateKey): string {
  if (state === "focus") return "";
  if (state === "pressed") {
    return variant === "tint" ? PRESSED : `${PRESSED} bg-control-pressed`;
  }
  if (state === "hover") {
    return variant === "tint" ? "brightness-125" : variant === "quiet" ? "bg-control text-fg-primary" : "bg-control-hover";
  }
  return "";
}

function ButtonMatrix() {
  const variants = ["glass", "chrome", "tint", "quiet"] as const;
  return (
    <div className="glass-paint glass-rim relative overflow-x-auto rounded-card p-5">
      <table className="w-full min-w-[640px] border-separate border-spacing-x-3 border-spacing-y-4 text-left">
        <thead>
          <tr>
            <th className="text-eyebrow uppercase text-fg-tertiary">Variant</th>
            {STATES.map(([label]) => (
              <th key={label} className="text-eyebrow uppercase text-fg-tertiary">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {variants.map((v) => (
            <tr key={v} style={moveHueStyle("escalation")}>
              <th scope="row" className="text-label text-fg-secondary">
                {v}
              </th>
              {STATES.map(([label, state]) => (
                <td key={label}>
                  <Button
                    variant={v}
                    size="pill-sm"
                    disabled={state === "disabled"}
                    {...focusProps(state)}
                    className={forced(v, state)}
                  >
                    Button
                  </Button>
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <th scope="row" className="text-label text-fg-secondary">
              glass circle
            </th>
            {STATES.map(([label, state]) => (
              <td key={label}>
                <Button
                  variant="glass"
                  size="circle"
                  aria-label={`Heart, ${label}`}
                  disabled={state === "disabled"}
                  {...focusProps(state)}
                  className={forced("glass", state)}
                >
                  <HeartIcon />
                </Button>
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row" className="text-label text-fg-secondary">
              chrome circle-lg
            </th>
            {STATES.map(([label, state]) => (
              <td key={label}>
                <Button
                  variant="chrome"
                  size="circle-lg"
                  aria-label={`Volume, ${label}`}
                  disabled={state === "disabled"}
                  {...focusProps(state)}
                  className={forced("chrome", state)}
                >
                  <Volume2Icon />
                </Button>
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row" className="text-label text-fg-secondary">
              glass pill (44)
            </th>
            {STATES.map(([label, state]) => (
              <td key={label}>
                <Button
                  variant="glass"
                  size="pill"
                  disabled={state === "disabled"}
                  {...focusProps(state)}
                  className={forced("glass", state)}
                >
                  Pill
                </Button>
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row" className="text-label text-fg-secondary">
              glass, pressed (aria-pressed)
            </th>
            <td>
              <Button variant="glass" size="circle" aria-pressed aria-label="Heart, on">
                <HeartIcon fill="currentColor" />
              </Button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function FieldMatrix() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {(["field", "chrome"] as const).map((variant) => (
        <div
          key={variant}
          className="glass-paint glass-rim relative flex flex-col gap-3 rounded-card p-5"
        >
          <code className="text-label text-fg-secondary">Input variant=&quot;{variant}&quot;</code>
          {STATES.map(([label, state]) => (
            <div key={label} className="flex flex-col gap-1">
              <Caption>{label}</Caption>
              <Input
                variant={variant}
                aria-label={`${variant} ${label}`}
                placeholder="Search saved"
                disabled={state === "disabled"}
                {...focusProps(state)}
                className={
                  state === "hover" || state === "pressed" ? "bg-control-hover" : ""
                }
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function Primitives() {
  return (
    <>
      <Section id="buttons" title="Button" note="Default, hover, focus-visible, pressed and disabled for every Quipdeck variant. Hover and press are forced with the same token classes the variants use. The first column is live: hover, tab to and press it.">
        <ButtonMatrix />
      </Section>

      <Section id="badge" title="Badge">
        <div className="glass-paint glass-rim relative flex flex-wrap items-center gap-4 rounded-card p-5">
          <Badge variant="move" style={moveHueStyle("escalation")}>
            Escalation
          </Badge>
          <Badge variant="move" style={moveHueStyle("callback")}>
            Callback
          </Badge>
          <Badge variant="glass">Glass</Badge>
          <Badge variant="move" style={moveHueStyle("escalation")} tabIndex={0} className="focus-ring" {...FOCUS}>
            Focus-visible
          </Badge>
          <Caption>Badges are labels, not controls: no hover or pressed state.</Caption>
        </div>
      </Section>

      <Section id="input" title="Input">
        <FieldMatrix />
      </Section>

      <Section id="skeleton" title="Skeleton" note="Faint glass fill with a slow shimmer. Stops under reduced motion.">
        <div className="glass-paint glass-rim relative flex flex-col gap-3 rounded-card p-5">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-16 w-full rounded-clip" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </Section>

      <Section id="overlays" title="Sheet and Dialog" note="Modal, so they open on press. The sheet grabber is shown inline below.">
        <div className="flex flex-col gap-4">
          <div className="glass-chrome-strong flex flex-col items-center gap-3 rounded-sheet p-4">
            <SheetGrabber />
            <Caption>SheetGrabber, 36 x 5</Caption>
          </div>
          <OverlayDemos />
        </div>
      </Section>
    </>
  );
}

/* ---------------- card mock ---------------- */

/*
 * Card mock (Gate 2 fix 4): front and back, each in a full-bleed,
 * viewport-height frame with its own ambient base, glow, vignette and grain,
 * lit in the card's move hue (hue-scope + moveHueStyle). One cool card and
 * one warm. Phone frames use the feed slide padding and the portrait card;
 * desktop frames use the landscape stage (LAYOUT_PLAN sections 4 and 5).
 */
type MockCard = (typeof cards)[number];

const MOCK_CARDS: MockCard[] = [
  cards.find((c) => c.id === "c01") ?? cards[0],
  cards.find((c) => c.id === "c13") ?? cards[1],
];

const FRAME =
  "ambient-frame hue-scope ml-[calc(50%-50vw)] flex h-dvh w-screen items-center justify-center px-2 pt-[calc(env(safe-area-inset-top)+8px)] pb-[calc(env(safe-area-inset-bottom)+68px)] lg:px-0 lg:py-[88px]";
const FACE =
  "glass-paint glass-rim relative flex h-full max-h-[780px] w-full max-w-[480px] rounded-card lg:h-[min(620px,calc(100dvh-176px))] lg:w-[min(1040px,calc(100vw-192px))] lg:max-w-none lg:rounded-stage";

function MockFrame({
  card,
  face,
  children,
}: {
  card: MockCard;
  face: "front" | "back";
  children: ReactNode;
}) {
  return (
    <div
      data-mock-frame={`${face}-${moveHue(card.move)}`}
      style={moveHueStyle(card.move)}
      className={FRAME}
    >
      <div aria-hidden="true" className="ambient-glow" />
      <div aria-hidden="true" className="ambient-vignette" />
      <div aria-hidden="true" className="ambient-grain" />
      {children}
    </div>
  );
}

function MockFront({ card }: { card: MockCard }) {
  const label = getMove(card.move)?.label ?? card.move;
  return (
    <div
      data-testid="mock-front"
      className={`${FACE} flex-col px-6 pt-8 pb-5 lg:px-14 lg:pt-14 lg:pb-12`}
    >
      <div className="flex flex-1 flex-col justify-center pb-[12%] lg:pb-[4%]">
        <h3 className="max-w-[18ch] text-cue text-balance text-fg-primary lg:text-cue-stage">
          {card.cue}
        </h3>
        <p className="mt-3 text-body text-fg-secondary lg:mt-5">{label}</p>
      </div>
      <p className="animate-hint-pulse self-center text-caption text-fg-tertiary motion-reduce:animate-none lg:self-start">
        Tap to reveal
      </p>
    </div>
  );
}

function MockBack({ card }: { card: MockCard }) {
  const label = getMove(card.move)?.label ?? card.move;
  return (
    <div
      data-testid="mock-back"
      className={`${FACE} flex-col gap-3 px-4 pt-4 pb-3 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-10 lg:p-10`}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3 lg:h-full">
        <Badge variant="move" className="self-start">
          {label}
        </Badge>
        <div className="flex flex-1 flex-col justify-center gap-3">
          <div className="flex max-w-[85%] flex-col items-start gap-1 self-start">
            <span className="text-label text-fg-secondary">{card.trigger.speaker}</span>
            <p className="glass-bubble rounded-bubble px-3.5 py-2 text-line text-fg-primary">
              {card.trigger.line}
            </p>
          </div>
          <div className="flex max-w-[85%] flex-col items-end gap-1 self-end">
            <span className="text-label text-fg-secondary">{card.response.speaker}</span>
            <p className="hue-bubble rounded-bubble px-3.5 py-2 text-line text-fg-primary">
              {card.response.line}
            </p>
          </div>
          <p className="text-body text-fg-secondary">{card.breakdown}</p>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="aspect-video min-h-[200px] w-full rounded-clip" />
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-caption text-fg-tertiary">{card.source}</p>
          <Button variant="glass" size="circle" aria-label="Mute">
            <Volume2Icon />
          </Button>
          <Button variant="glass" size="circle" aria-label="Save">
            <HeartIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}

function CardMocks() {
  return (
    <div className="flex flex-col">
      {MOCK_CARDS.map((card) => (
        <div key={card.id} className="contents">
          <MockFrame card={card} face="front">
            <MockFront card={card} />
          </MockFrame>
          <MockFrame card={card} face="back">
            <MockBack card={card} />
          </MockFrame>
        </div>
      ))}
    </div>
  );
}

export function Showcase() {
  return (
    <>
      <header>
        <p className="text-eyebrow uppercase text-fg-tertiary">Design system</p>
        <h1 className="mt-2 text-title text-fg-primary">Showcase</h1>
        <p className="mt-2 max-w-[70ch] text-body text-fg-secondary">
          Every token group and primitive in every state, on the ambient layer.
          Not linked from the app.
        </p>
      </header>
      <Tokens />
      <Primitives />
      <Section
        id="card"
        title="Card, front and back"
        note={`Static mock built only from tokens and primitives. Each face sits in a viewport-height frame over the glow, in two move hues: ${MOCK_CARDS.map((c) => `${getMove(c.move)?.label ?? c.move} (${moveHue(c.move)} deg)`).join(" and ")}. The clip slot is a Skeleton.`}
      >
        <CardMocks />
      </Section>
    </>
  );
}
