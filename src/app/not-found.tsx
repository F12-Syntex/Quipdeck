import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh w-full flex-col items-center justify-center gap-3 p-6 text-center">
      <p>This page does not exist.</p>
      <Link href="/" className="underline">
        Go to the feed
      </Link>
    </main>
  );
}
