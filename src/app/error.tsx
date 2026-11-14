"use client";

import { Button } from "@/components/ui/button";

export default function Error({ retry }: { error: unknown; retry: () => void }) {
  return (
    <main className="relative z-0 flex min-h-dvh w-full flex-col items-center justify-center gap-5 px-6 pt-[env(safe-area-inset-top)] pb-[calc(env(safe-area-inset-bottom)+72px)] text-center">
      <p className="text-2xl font-bold text-foreground">Something went wrong.</p>
      <Button size="pill" onClick={() => retry()}>
        Reload
      </Button>
    </main>
  );
}
