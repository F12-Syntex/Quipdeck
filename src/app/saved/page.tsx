import { Suspense } from "react";
import { Saved, SavedFallback } from "@/components/saved/saved";

export default function SavedPage() {
  return (
    <main className="min-h-dvh w-full">
      {/* This fallback is the prerendered static shell (R-2). */}
      <Suspense fallback={<SavedFallback />}>
        <Saved />
      </Suspense>
    </main>
  );
}
