// Skeleton state for a market card. Dimensions mirror MarketCard /
// ExpandableMarketCard's grid card so there's no layout shift when real
// data fades in. Shimmer uses a 1500ms left-to-right sweep wrapped in
// `motion-safe` so reduced-motion users get a static placeholder.

export const MarketCardSkeleton = () => {
  return (
    <div className="bg-[#180630] border border-white/10 rounded-xl p-6 overflow-hidden relative h-full flex flex-col">
      {/* Shimmer sweep — single direction, 1500ms linear. The keyframe
          `@keyframes shimmer` lives in globals.css. We compose the
          animation locally and gate it on motion preferences via the
          motion-safe Tailwind variant. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.08] to-transparent motion-safe:[animation:shimmer_1.5s_linear_infinite]"
      />

      <div className="relative flex flex-col gap-4 flex-1">
        {/* Header: image + ticker chip */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-white/[0.06] flex-shrink-0" />
          <div className="flex-1 flex items-center justify-between gap-2">
            <div className="h-3 w-24 rounded bg-white/[0.06]" />
            <div className="h-3 w-16 rounded bg-white/[0.04]" />
          </div>
        </div>

        {/* Category pill */}
        <div className="h-[22px] w-20 rounded-full bg-white/[0.06]" />

        {/* Title */}
        <div className="space-y-2 min-h-[2.5rem]">
          <div className="h-4 w-full rounded bg-white/[0.06]" />
          <div className="h-4 w-3/4 rounded bg-white/[0.06]" />
        </div>

        {/* Probability block */}
        <div className="min-h-[7.5rem] flex flex-col justify-center">
          <div className="flex items-baseline justify-between mb-2">
            <div className="h-3 w-8 rounded bg-white/[0.06]" />
            <div className="h-7 w-16 rounded bg-white/[0.08]" />
          </div>
          <div className="w-full bg-white/[0.06] rounded-full h-1.5" />
        </div>

        {/* Footer rows */}
        <div className="mt-auto space-y-1.5">
          <div className="flex justify-between">
            <div className="h-3 w-14 rounded bg-white/[0.06]" />
            <div className="h-3 w-16 rounded bg-white/[0.06]" />
          </div>
          <div className="flex justify-between">
            <div className="h-3 w-12 rounded bg-white/[0.06]" />
            <div className="h-3 w-20 rounded bg-white/[0.06]" />
          </div>
        </div>
      </div>
    </div>
  );
};
