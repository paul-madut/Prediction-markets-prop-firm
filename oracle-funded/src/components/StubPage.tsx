// StubPage — minimal placeholder for routes whose backend is wired but
// UI is still pending. DESIGN.md says: centered icon + headline + body +
// "Back to dashboard" ghost button. No card chrome, no decoration.

import Link from "next/link";
import { ArrowLeftIcon, SparklesIcon } from "@heroicons/react/24/outline";

export function StubPage({
  title,
  subtitle,
  hint,
  ctaHref,
  ctaLabel,
}: {
  title: string;
  subtitle?: string;
  hint?: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  const backHref = ctaHref ?? "/dashboard";
  const backLabel = ctaLabel ?? "Back to dashboard";

  return (
    <div className="max-w-2xl mx-auto py-20 px-6 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#7F24FF]/18 mb-6">
        <SparklesIcon className="w-6 h-6 text-[#A769FF]" />
      </div>
      <h1
        className="text-[32px] leading-[38px] font-bold tracking-[-0.02em] text-white"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {title}
      </h1>
      {subtitle && (
        <p className="mt-3 text-base text-white/65 max-w-xl mx-auto leading-relaxed">
          {subtitle}
        </p>
      )}
      {hint && (
        <p className="mt-4 text-sm text-white/45 max-w-xl mx-auto italic">
          {hint}
        </p>
      )}
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 mt-8 h-10 px-3 rounded-md text-white/65 hover:text-white hover:bg-white/[0.06] text-sm font-semibold transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        {backLabel}
      </Link>
    </div>
  );
}
