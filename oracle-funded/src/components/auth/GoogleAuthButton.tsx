"use client";

// Continue with Google — Blueberry secondary button.
// - Rest: bg-white/4 / border-white/10 / text white.
// - Hover: ascend to bg-white/8 + border-white/18 (canvas ascent rule).
// - Press: scale 0.97 (snappy spring on whileTap).
// - Loading: swap glyph for spinner, label remains, width preserved.

import { useState } from "react";
import { motion } from "framer-motion";
import { Loader } from "@/components/ui/loader";
import { createClient } from "@/lib/supabase/client";

const SNAPPY = { type: "spring" as const, stiffness: 500, damping: 35 };

export function GoogleAuthButton({
  label = "Continue with Google",
  redirectTo,
  onError,
}: {
  label?: string;
  redirectTo?: string;
  onError?: (message: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function start(): Promise<void> {
    setLoading(true);
    const supabase = createClient();
    const next = redirectTo ?? "/dashboard";
    const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    console.log("[GoogleAuth] starting", { callbackUrl, next });
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callbackUrl },
      });
      console.log("[GoogleAuth] signInWithOAuth returned", {
        hasUrl: !!data?.url,
        url: data?.url,
        provider: data?.provider,
        error: error?.message ?? null,
      });
      if (error) {
        setLoading(false);
        onError?.(`signInWithOAuth: ${error.message}`);
        return;
      }
      if (!data?.url) {
        setLoading(false);
        onError?.(
          "Supabase returned no redirect URL. Google provider may not be enabled in the Supabase dashboard.",
        );
        return;
      }
      // The browser should auto-navigate to data.url. If we're still here in 2s,
      // something blocked the navigation — make it loud.
      setTimeout(() => {
        if (document.visibilityState === "visible") {
          console.warn(
            "[GoogleAuth] still on the page 2s after signInWithOAuth — navigation may have been blocked",
          );
        }
      }, 2000);
    } catch (e) {
      setLoading(false);
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[GoogleAuth] threw", e);
      onError?.(`Unexpected: ${msg}`);
    }
  }

  return (
    <motion.button
      type="button"
      onClick={start}
      disabled={loading}
      whileHover={loading ? undefined : { y: 0 }}
      whileTap={loading ? undefined : { scale: 0.97 }}
      transition={SNAPPY}
      className="w-full inline-flex items-center justify-center gap-2.5 h-11 rounded-lg
                 bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.08]
                 border border-white/10 hover:border-white/[0.18]
                 text-white text-sm font-semibold
                 transition-[background-color,border-color] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7F24FF]/45
                 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <span className="inline-flex items-center justify-center w-4 h-4">
        {loading ? (
          <Loader size="sm" className="w-4 h-4" />
        ) : (
          <GoogleGlyph className="w-4 h-4" />
        )}
      </span>
      <span>{label}</span>
    </motion.button>
  );
}

function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}
