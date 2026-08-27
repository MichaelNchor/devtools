import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg p-10">
      <p className="eyebrow">404</p>
      <h1 className="mt-2 font-ui text-[1.375rem] font-bold tracking-[-0.01em] text-fg">No such tool</h1>
      <p className="mt-2 text-[13px] text-fg-muted">
        That address does not match any tool. Press <kbd className="rounded-sm bg-surface-2 px-1 font-ui text-[11px]">⌘K</kbd> to
        search everything available, or start from the dashboard.
      </p>
      <Link href="/" className="mt-4 inline-block font-ui text-[13px] text-primary hover:underline">
        Back to all tools
      </Link>
    </main>
  );
}
