"use client";

import { FlaskConical } from "lucide-react";

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

export const DemoBanner = () => {
  if (!isDemoMode) return null;

  return (
    <div className="w-full bg-amber-500 text-black px-4 py-2 text-center text-sm font-semibold flex items-center justify-center gap-2">
      <FlaskConical size={16} />
      <span>
        DEMO ENVIRONMENT — This is a preview. No real funds or trades.
      </span>
      <FlaskConical size={16} />
    </div>
  );
};
