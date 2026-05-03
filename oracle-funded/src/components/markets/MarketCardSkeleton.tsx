export const MarketCardSkeleton = () => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 p-4 sm:p-6 animate-pulse">
      <div className="flex flex-col gap-3 sm:gap-4">
        {/* Image and Category Row */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gray-200 flex-shrink-0" />
          <div className="flex-1 flex items-center justify-between">
            <div className="h-5 w-16 rounded bg-gray-200" />
            <div className="h-4 w-14 rounded bg-gray-100 dark:bg-slate-800" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <div className="h-5 w-full rounded bg-gray-200" />
          <div className="h-5 w-3/4 rounded bg-gray-200" />
        </div>

        {/* Probability */}
        <div>
          <div className="h-8 w-28 rounded bg-gray-200 mb-2" />
          <div className="w-full bg-gray-200 rounded-full h-2" />
        </div>

        {/* Info */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <div className="h-4 w-14 rounded bg-gray-200" />
            <div className="h-4 w-16 rounded bg-gray-200" />
          </div>
          <div className="flex justify-between">
            <div className="h-4 w-12 rounded bg-gray-200" />
            <div className="h-4 w-14 rounded bg-gray-200" />
          </div>
        </div>
      </div>
    </div>
  );
};
