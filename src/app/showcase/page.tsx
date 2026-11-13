import type { Metadata } from "next";
import { Showcase } from "@/components/showcase/showcase";

export const metadata: Metadata = {
  title: "Quipdeck showcase",
  robots: { index: false, follow: false },
};

/** Design-system showcase (R-6). Not linked from the nav; noindex. */
export default function ShowcasePage() {
  return (
    <main
      data-testid="showcase"
      className="mx-auto w-full max-w-[1100px] px-4 pt-[calc(env(safe-area-inset-top)+24px)] pb-[calc(env(safe-area-inset-bottom)+96px)] lg:px-6 lg:pt-[88px]"
    >
      <Showcase />
    </main>
  );
}
