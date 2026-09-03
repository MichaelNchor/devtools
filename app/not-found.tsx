import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-8 py-16">
      <p className="eyebrow">404</p>
      <h1 className="mt-2 font-display text-[2rem] font-extrabold tracking-[-0.04em] text-fg">No such tool</h1>
      <p className="mt-3 text-[14px] leading-relaxed text-fg-muted">
        That address does not match any tool. Press{" "}
        <kbd className="rounded-full bg-inset px-2 py-0.5 font-ui text-[11px]">⌘K</kbd>{" "}
        to search, or go back to the dashboard.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-full bg-primary px-4 py-2 font-ui text-[13px] font-semibold text-on-primary hover:bg-primary-hover"
      >
        All tools
      </Link>
    </main>
  );
}
