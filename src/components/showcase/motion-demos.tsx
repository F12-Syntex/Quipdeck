"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { HeartIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  flipCrossfade,
  flipSpring,
  heartPop,
  heartScale,
} from "@/components/ui/motion";

const CELL =
  "glass-paint glass-rim relative flex flex-col gap-3 rounded-bubble p-4";

/** Live motion demos. Each reads `useReducedMotion()` like the real screens. */
export function MotionDemos() {
  const reduced = useReducedMotion();
  const [flipped, setFlipped] = useState(false);
  const [liked, setLiked] = useState(false);
  const [readyKey, setReadyKey] = useState(0);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className={CELL} data-testid="motion-flip">
        <p className="text-label text-fg-secondary">
          flipSpring / flipCrossfade
        </p>
        <div className="flex h-20 items-center justify-center [perspective:600px]">
          <motion.div
            animate={
              reduced
                ? { opacity: flipped ? 0.45 : 1 }
                : { rotateY: flipped ? 180 : 0 }
            }
            transition={reduced ? flipCrossfade : flipSpring}
            className="glass-control flex h-14 w-24 items-center justify-center rounded-bubble text-label text-fg-primary"
          >
            {flipped ? "Back" : "Front"}
          </motion.div>
        </div>
        <Button variant="glass" size="pill-sm" onClick={() => setFlipped((f) => !f)}>
          Flip
        </Button>
      </div>

      <div className={CELL} data-testid="motion-heart">
        <p className="text-label text-fg-secondary">heartPop / heartScale</p>
        <div className="flex h-20 items-center justify-center">
          <motion.div
            key={String(liked)}
            animate={reduced ? undefined : { scale: [...heartScale] }}
            transition={heartPop}
          >
            <HeartIcon
              aria-hidden="true"
              className="size-8 text-fg-primary"
              fill={liked ? "currentColor" : "none"}
            />
          </motion.div>
        </div>
        <Button
          variant="glass"
          size="pill-sm"
          aria-pressed={liked}
          onClick={() => setLiked((l) => !l)}
        >
          Toggle heart
        </Button>
      </div>

      <div className={CELL} data-testid="motion-ready">
        <p className="text-label text-fg-secondary">animate-ready-fade (320 ms)</p>
        <div className="flex h-20 items-center justify-center">
          <div
            key={readyKey}
            className="animate-ready-fade glass-control h-14 w-24 rounded-clip"
          />
        </div>
        <Button
          variant="glass"
          size="pill-sm"
          onClick={() => setReadyKey((k) => k + 1)}
        >
          Replay
        </Button>
      </div>

      <div className={CELL}>
        <p className="text-label text-fg-secondary">animate-hint-pulse (4 s)</p>
        <p className="animate-hint-pulse text-caption text-fg-tertiary motion-reduce:animate-none">
          Tap to reveal
        </p>
      </div>

      <div className={CELL}>
        <p className="text-label text-fg-secondary">animate-shimmer (2.4 s)</p>
        <Skeleton className="h-10 w-full" />
      </div>

      <div className={CELL}>
        <p className="text-label text-fg-secondary">
          Ambient drift (56 s) and hue crossfade
        </p>
        <p className="text-caption text-fg-tertiary">
          Behind this page. 1400 ms crossfade on a hue change.
        </p>
      </div>
    </div>
  );
}
