export const MarketCardSkeleton = () => {
 return (
 <div className="bg-[#180630] rounded-lg shadow-sm border border-white/10 p-4 sm:p-6 animate-pulse">
 <div className="flex flex-col gap-3 sm:gap-4">
 {/* Image and Category Row */}
 <div className="flex items-start gap-3">
 <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-white/10 flex-shrink-0" />
 <div className="flex-1 flex items-center justify-between">
 <div className="h-5 w-16 rounded bg-white/10" />
 <div className="h-4 w-14 rounded bg-white/[0.06]" />
 </div>
 </div>

 {/* Title */}
 <div className="space-y-2">
 <div className="h-5 w-full rounded bg-white/10" />
 <div className="h-5 w-3/4 rounded bg-white/10" />
 </div>

 {/* Probability */}
 <div>
 <div className="h-8 w-28 rounded bg-white/10 mb-2" />
 <div className="w-full bg-white/10 rounded-full h-2" />
 </div>

 {/* Info */}
 <div className="space-y-2">
 <div className="flex justify-between">
 <div className="h-4 w-14 rounded bg-white/10" />
 <div className="h-4 w-16 rounded bg-white/10" />
 </div>
 <div className="flex justify-between">
 <div className="h-4 w-12 rounded bg-white/10" />
 <div className="h-4 w-14 rounded bg-white/10" />
 </div>
 </div>
 </div>
 </div>
 );
};
