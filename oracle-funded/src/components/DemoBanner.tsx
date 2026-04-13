"use client";

import { BeakerIcon } from "@heroicons/react/16/solid";

export const DemoBanner = () => {
  return (
    <div className="w-full bg-amber-500 text-black px-4 py-2 text-center text-sm font-semibold flex items-center justify-center gap-2">
      <BeakerIcon className="w-4 h-4" />
      <span>
        DEMO ENVIRONMENT — This is a preview. No real funds or trades.
      </span>
      <BeakerIcon className="w-4 h-4" />
    </div>
  );
};
