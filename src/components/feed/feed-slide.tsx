import type { ReactNode } from "react";

export type FeedSlideProps = {
  /** Card id; absent for the skeleton slide. */
  id?: string;
  children: ReactNode;
};

/**
 * One viewport-tall snap slide and the card frame inside it (LAYOUT_PLAN
 * sections 3 and 4). The skeleton uses the same frame, so it has the exact
 * box of a real card.
 * - Phone: padding clears the safe areas and the bottom nav (8 + 60 + 8);
 *   the card fills the rest, capped at 480 x 780 and centred. In short
 *   landscape the width cap is lifted.
 * - Desktop (>= 1024 px): a landscape card min(1120, 100vw - 200) wide whose
 *   height hugs its content (REDESIGN_V2 5.10), centred in the viewport.
 */
export function FeedSlide({ id, children }: FeedSlideProps) {
  return (
    <div
      data-slide-id={id}
      className="flex h-dvh w-full snap-start snap-always items-center justify-center pt-[calc(env(safe-area-inset-top)+8px)] pr-[max(8px,env(safe-area-inset-right))] pb-[calc(env(safe-area-inset-bottom)+76px)] pl-[max(8px,env(safe-area-inset-left))] lg:p-0"
    >
      <div className="h-full max-h-[780px] w-full max-w-[480px] [@media(orientation:landscape)_and_(max-height:599px)]:max-w-none lg:h-auto lg:max-h-none lg:w-[min(1120px,100vw_-_200px)] lg:max-w-none">
        {children}
      </div>
    </div>
  );
}
