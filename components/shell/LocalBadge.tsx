import { ShieldCheck } from "lucide-react";

export function LocalBadge() {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full bg-up-tint px-2.5 py-1"
      title="Every tool runs in your browser. Nothing you paste is uploaded, logged, or sent anywhere."
    >
      <ShieldCheck size={12} className="text-up" aria-hidden />
      <span className="font-ui text-[10.5px] font-semibold uppercase tracking-[.14em] text-up">
        Runs locally
      </span>
    </span>
  );
}
