"use client";

// Minimal top bar — just shows the user's email + a sign-out button. No
// mock context dependencies; pulls from useApp() (auth-aware).

import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { createClient } from "@/lib/supabase/client";
import { ArrowRightStartOnRectangleIcon } from "@heroicons/react/24/outline";

export const TopBar = () => {
  const { user } = useApp();
  const router = useRouter();

  async function signOut(): Promise<void> {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <div className="h-14 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-end gap-3">
      {user?.email && (
        <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">{user.email}</span>
      )}
      <button
        onClick={signOut}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg"
      >
        <ArrowRightStartOnRectangleIcon className="w-4 h-4" />
        Sign out
      </button>
    </div>
  );
};
