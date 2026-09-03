import { cx } from "@/lib/cx";

export function Panel({
  title, subtitle, actions, footer, className, bodyClassName, children,
}: {
  title: string;
  subtitle?: string | undefined;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string | undefined;
  bodyClassName?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <section className={cx("flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-bg/30", className)}>
      <header className="flex shrink-0 items-center gap-2 px-4 py-2.5">
        <div className="min-w-0">
          <h2 className="eyebrow">{title}</h2>
          {subtitle ? (
            <p className="mt-0.5 truncate text-[11.5px] leading-none text-fg-muted">{subtitle}</p>
          ) : null}
        </div>
        {actions ? <div className="ml-auto flex shrink-0 items-center gap-1.5">{actions}</div> : null}
      </header>

      <div className={cx("min-h-0 flex-1", bodyClassName)}>{children}</div>

      {footer ? (
        <footer className="shrink-0 border-t border-border px-4 py-2">{footer}</footer>
      ) : null}
    </section>
  );
}

export function EmptyOutput({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center px-6 py-10 text-center">
      <p className="max-w-xs text-[12.5px] leading-relaxed text-fg-muted">{children}</p>
    </div>
  );
}
