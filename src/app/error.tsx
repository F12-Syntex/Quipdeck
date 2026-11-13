"use client";

export default function Error({ retry }: { error: unknown; retry: () => void }) {
  return (
    <main className="flex min-h-dvh w-full flex-col items-center justify-center gap-3 p-6 text-center">
      <p>Something went wrong.</p>
      <button
        type="button"
        onClick={() => retry()}
        className="min-h-11 rounded border border-neutral-600 px-4"
      >
        Reload
      </button>
    </main>
  );
}
