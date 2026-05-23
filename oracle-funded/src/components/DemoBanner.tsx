"use client";

import Link from "next/link";

export const DemoBanner = () => {
 if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") return null;
 return (
 <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-[#FFB539]/30 rounded-lg px-3 sm:px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
 <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
 <div className="flex items-center gap-2 px-2.5 py-1 bg-[#FFB539]/15 rounded-full">
 <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
 <span className="text-xs font-semibold text-[#FFB539] uppercase tracking-wide">
 Demo
 </span>
 </div>
 <span className="text-xs sm:text-sm text-amber-800">
 Sample data. Fully customizable for your brand.
 </span>
 </div>
 <Link
 href="/"
 className="text-xs sm:text-sm font-medium text-[#FFB539] hover:text-amber-900 underline underline-offset-2 flex-shrink-0"
 >
 Learn more
 </Link>
 </div>
 );
};
