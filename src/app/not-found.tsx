import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="relative z-0 flex min-h-dvh w-full flex-col items-center justify-center gap-5 px-6 pt-[env(safe-area-inset-top)] pb-[calc(env(safe-area-inset-bottom)+72px)] text-center">
      <p className="text-heading text-fg-primary">This page does not exist.</p>
      <Link
        href="/"
        className={buttonVariants({ variant: "chrome", size: "pill" })}
      >
        Go to the feed
      </Link>
    </main>
  );
}
