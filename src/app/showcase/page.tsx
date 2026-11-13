import type { Metadata } from "next";
import { Showcase } from "@/components/showcase/showcase";

export const metadata: Metadata = {
  title: "Quipdeck showcase",
  robots: { index: false, follow: false },
};

/** Design-system showcase (R-6). Not linked from the nav; noindex. */
export default function ShowcasePage() {
  // The card-mock frames are full-bleed (100vw); clip the scrollbar width
  // so they never cause horizontal scroll.
  return (
    <div className="w-full overflow-x-clip">
      <main
        data-testid="showcase"
        className="mx-auto w-full max-w-[1100px] px-4 pt-[calc(env(safe-area-inset-top)+24px)] pb-[calc(env(safe-area-inset-bottom)+96px)] lg:px-6 lg:pt-[88px]"
      >
        <Showcase />
      </main>
    </div>
  );
}
