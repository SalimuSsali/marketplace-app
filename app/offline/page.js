import Link from "next/link";

export const metadata = {
  title: "Offline",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-4 py-12 text-center">
      <h1 className="text-xl font-semibold text-neutral-900">You&apos;re offline</h1>
      <p className="text-sm text-neutral-600">
        Check your connection. Cached pages may still open; new data needs the internet.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
      >
        Try home
      </Link>
    </main>
  );
}
