import Link from "next/link";

export default function SafetyPage() {
  return (
    <main className="app-shell">
      <h1 className="app-title">Stay safe</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Quick tips for buying and selling in the community.
      </p>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-neutral-800">
        <li>Meet in public places when exchanging items or cash.</li>
        <li>Do not send money to strangers before you are sure the offer is real.</li>
        <li>Keep chats and payments on trusted channels when possible.</li>
        <li>Report suspicious listings or messages to support if available.</li>
      </ul>
      <Link href="/" className="app-btn-primary mt-6 inline-block no-underline">
        Back to home
      </Link>
    </main>
  );
}
