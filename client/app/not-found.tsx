import Link from "next/link";
import { Compass, House, LayoutGrid } from "lucide-react";

export default function NotFound() {
  return (
    <div className="ui-page-mid flex min-h-[60vh] flex-col items-center justify-center text-center ui-fade-up">
      <div className="page-missing-icon" aria-hidden>
        <Compass size={28} strokeWidth={1.85} />
      </div>
      <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
        404
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
        Page not found
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[var(--muted)] sm:text-base">
        That link does not match any page in The AI Prep Kit. It may have been moved, deleted, or
        typed incorrectly.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className="ui-btn ui-btn-primary">
          <House size={16} strokeWidth={1.85} aria-hidden />
          Home
        </Link>
        <Link href="/dashboard" className="ui-btn ui-btn-secondary">
          <LayoutGrid size={16} strokeWidth={1.85} aria-hidden />
          My kits
        </Link>
      </div>
    </div>
  );
}
