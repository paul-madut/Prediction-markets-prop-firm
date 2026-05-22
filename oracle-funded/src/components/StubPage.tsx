// StubPage — consistent "in development" placeholder for trader/admin pages
// whose backend is wired but UI is still pending. Visual style matches the
// rest of the app (TextureCard + gradient accent) so a deployed instance
// doesn't show jarring blank routes.

import Link from "next/link";
import { ArrowRightIcon } from "@heroicons/react/16/solid";
import { TextureCard, TextureCardContent } from "@/components/ui/texture-card";

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
  return (
    <div className="max-w-3xl mx-auto py-16">
      <TextureCard interactive={false}>
        <TextureCardContent className="p-12 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full mb-5">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
              In development
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
          {subtitle && (
            <p className="text-white/75 max-w-xl mx-auto">{subtitle}</p>
          )}
          {hint && (
            <p className="text-sm text-white/55 mt-4 max-w-xl mx-auto italic">{hint}</p>
          )}
          {ctaHref && ctaLabel && (
            <Link
              href={ctaHref}
              className="inline-flex items-center gap-1.5 mt-8 px-5 py-2.5 bg-[#7F24FF] text-white rounded-lg hover:bg-[#6c14ee] font-medium text-sm"
            >
              {ctaLabel}
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          )}
        </TextureCardContent>
      </TextureCard>
    </div>
  );
}
