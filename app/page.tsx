export default function Home() {
  return (
    <main className="mx-auto max-w-3xl p-10">
      <p className="eyebrow">Scaffold</p>
      <h1 className="mt-2 font-ui text-[1.375rem] font-bold tracking-[-0.01em] text-fg">DevTools</h1>
      <p className="mt-2 max-w-prose text-sm text-fg-muted">
        Local-first developer utilities. Nothing leaves your browser.
      </p>
      <div className="mt-6 rounded-lg bg-surface p-5 shadow-sm">
        <p className="font-ui text-[13px] text-fg">Token check: this card is surface on bg.</p>
      </div>
    </main>
  );
}
