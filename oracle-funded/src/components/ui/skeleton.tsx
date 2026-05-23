import { cn } from "@/lib/utils";

export const Skeleton = ({
 className,
 ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
 return (
 <div
 className={cn("animate-pulse rounded-md bg-white/10", className)}
 {...props}
 />
 );
};

/** 4-column stat cards skeleton */
export const StatsGridSkeleton = ({ count = 4 }: { count?: number }) => (
 <div className={cn("grid gap-4", count === 4 ? "grid-cols-2 lg:grid-cols-4" : `grid-cols-1 sm:grid-cols-2 lg:grid-cols-${count}`)}>
 {Array.from({ length: count }).map((_, i) => (
 <div key={i} className="bg-[#180630] rounded-lg shadow-sm border border-white/10 p-4 sm:p-5 animate-pulse">
 <div className="flex items-center gap-3 mb-3">
 <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-white/10" />
 <div className="h-4 w-20 rounded bg-white/10" />
 </div>
 <div className="h-7 w-28 rounded bg-white/10 mb-1" />
 <div className="h-3 w-16 rounded bg-white/[0.06] mt-2" />
 </div>
 ))}
 </div>
);

/** Chart area skeleton */
export const ChartSkeleton = ({ height = "h-[280px]" }: { height?: string }) => (
 <div className="bg-[#180630] rounded-lg shadow-sm border border-white/10 p-5 animate-pulse">
 <div className="flex items-center justify-between mb-4">
 <div className="h-5 w-36 rounded bg-white/10" />
 <div className="h-4 w-24 rounded bg-white/[0.06]" />
 </div>
 <div className={cn(height, "bg-white/[0.06] rounded-lg")} />
 </div>
);

/** Table skeleton with header and rows */
export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
 <div className="bg-[#180630] rounded-lg shadow-sm border border-white/10 overflow-hidden animate-pulse">
 <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
 <div className="h-5 w-32 rounded bg-white/10" />
 <div className="flex gap-1">
 <div className="h-6 w-14 rounded-md bg-white/[0.06]" />
 <div className="h-6 w-14 rounded-md bg-white/[0.06]" />
 <div className="h-6 w-14 rounded-md bg-white/[0.06]" />
 </div>
 </div>
 {/* Header row */}
 <div className="hidden md:flex px-6 py-3 bg-[#0C0319] gap-6">
 {Array.from({ length: 5 }).map((_, i) => (
 <div key={i} className="h-3 rounded bg-white/10" style={{ width: `${i === 0 ? 60 : 80 + i * 10}px` }} />
 ))}
 </div>
 {/* Rows */}
 {Array.from({ length: rows }).map((_, i) => (
 <div key={i} className="px-6 py-4 border-b border-white/10 flex items-center gap-6">
 <div className="h-4 w-16 rounded bg-white/10" />
 <div className="h-4 w-20 rounded bg-white/10" />
 <div className="h-4 w-24 rounded bg-white/10" />
 <div className="h-5 w-16 rounded-full bg-white/[0.06]" />
 <div className="h-4 w-20 rounded bg-white/[0.06]" />
 </div>
 ))}
 </div>
);

/** Card section skeleton (e.g. form section, settings block) */
export const CardSkeleton = ({ lines = 3 }: { lines?: number }) => (
 <div className="bg-[#180630] rounded-lg shadow-sm border border-white/10 overflow-hidden animate-pulse">
 <div className="px-6 py-4 border-b border-white/10">
 <div className="h-5 w-40 rounded bg-white/10" />
 </div>
 <div className="p-6 space-y-4">
 {Array.from({ length: lines }).map((_, i) => (
 <div key={i} className="h-4 rounded bg-white/[0.06]" style={{ width: `${85 - i * 15}%` }} />
 ))}
 </div>
 </div>
);

/** Full page skeleton matching the dashboard layout */
export const DashboardSkeleton = () => (
 <div className="space-y-6">
 {/* Account bar */}
 <div className="bg-[#180630] rounded-lg shadow-sm border border-white/10 p-4 animate-pulse">
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 rounded-lg bg-white/10" />
 <div className="space-y-2">
 <div className="h-3 w-20 rounded bg-white/10" />
 <div className="h-6 w-28 rounded bg-white/10" />
 </div>
 </div>
 </div>
 {/* Welcome card */}
 <div className="bg-[#180630] rounded-lg shadow-sm border border-white/10 p-8 animate-pulse">
 <div className="flex flex-col lg:flex-row gap-8">
 <div className="flex-1 space-y-4">
 <div className="h-4 w-28 rounded bg-white/10" />
 <div className="h-8 w-44 rounded bg-white/10" />
 <div className="flex gap-3">
 <div className="h-10 w-32 rounded-lg bg-white/10" />
 <div className="h-10 w-36 rounded-lg bg-white/[0.06]" />
 </div>
 </div>
 <div className="flex-1 grid grid-cols-3 gap-6">
 {Array.from({ length: 3 }).map((_, i) => (
 <div key={i} className="text-center space-y-2">
 <div className="h-7 w-16 mx-auto rounded bg-white/10" />
 <div className="h-3 w-14 mx-auto rounded bg-white/[0.06]" />
 </div>
 ))}
 </div>
 </div>
 </div>
 {/* Metrics + chart */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 <div className="lg:col-span-2 space-y-6">
 <StatsGridSkeleton count={4} />
 <ChartSkeleton />
 </div>
 <div className="space-y-6">
 <CardSkeleton lines={4} />
 <CardSkeleton lines={2} />
 </div>
 </div>
 </div>
);

/** Analytics page skeleton */
export const AnalyticsSkeleton = () => (
 <div className="space-y-6">
 <StatsGridSkeleton count={4} />
 <StatsGridSkeleton count={4} />
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 <ChartSkeleton />
 <ChartSkeleton />
 </div>
 <CardSkeleton lines={5} />
 </div>
);

/** Payouts page skeleton */
export const PayoutsSkeleton = () => (
 <div className="space-y-6 max-w-5xl mx-auto">
 <div className="animate-pulse space-y-1">
 <div className="h-7 w-28 rounded bg-white/10" />
 <div className="h-4 w-64 rounded bg-white/[0.06]" />
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 {Array.from({ length: 4 }).map((_, i) => (
 <div key={i} className="bg-[#180630] rounded-lg shadow-sm border border-white/10 p-4 animate-pulse">
 <div className="flex items-center gap-2 mb-2">
 <div className="w-4 h-4 rounded bg-white/10" />
 <div className="h-3 w-24 rounded bg-white/10" />
 </div>
 <div className="h-6 w-28 rounded bg-white/10" />
 </div>
 ))}
 </div>
 <CardSkeleton lines={3} />
 <CardSkeleton lines={4} />
 <TableSkeleton rows={3} />
 </div>
);

/** History page skeleton */
export const HistorySkeleton = () => (
 <div className="space-y-6">
 <div className="flex gap-2">
 {Array.from({ length: 4 }).map((_, i) => (
 <div key={i} className="h-9 w-20 rounded-lg bg-white/10 animate-pulse" />
 ))}
 </div>
 <TableSkeleton rows={8} />
 </div>
);

/** Portfolio page skeleton */
export const PortfolioSkeleton = () => (
 <div className="space-y-6">
 <StatsGridSkeleton count={4} />
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 <div className="lg:col-span-2">
 <TableSkeleton rows={5} />
 </div>
 <ChartSkeleton height="h-[250px]" />
 </div>
 </div>
);

/** Settings page skeleton */
export const SettingsSkeleton = () => (
 <div className="space-y-6 max-w-4xl">
 <div className="flex justify-end animate-pulse">
 <div className="h-9 w-32 rounded-lg bg-white/10" />
 </div>
 {Array.from({ length: 4 }).map((_, i) => (
 <CardSkeleton key={i} lines={3} />
 ))}
 </div>
);

/** New Challenge page skeleton */
export const NewChallengeSkeleton = () => (
 <div className="space-y-10 max-w-7xl mx-auto">
 <div className="text-center animate-pulse space-y-3">
 <div className="h-9 w-80 mx-auto rounded bg-white/10" />
 <div className="h-4 w-96 mx-auto rounded bg-white/[0.06]" />
 </div>
 <div className="flex justify-center animate-pulse">
 <div className="h-12 w-48 rounded-xl bg-white/10" />
 </div>
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {Array.from({ length: 3 }).map((_, i) => (
 <div key={i} className="bg-[#180630] rounded-lg shadow-sm border border-white/10 p-6 animate-pulse space-y-4">
 <div className="h-5 w-24 rounded bg-white/10" />
 <div className="h-4 w-full rounded bg-white/[0.06]" />
 <div className="h-4 w-3/4 rounded bg-white/[0.06]" />
 <div className="h-10 w-full rounded-lg bg-white/10 mt-4" />
 </div>
 ))}
 </div>
 </div>
);
