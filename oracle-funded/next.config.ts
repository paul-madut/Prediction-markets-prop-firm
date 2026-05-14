import type { NextConfig } from "next";

// Production-config guard: fail loudly if a build (or runtime) is attempted
// with NODE_ENV=production AND NEXT_PUBLIC_DEMO_MODE=true. DEMO_MODE bypasses
// the AAL2/MFA check in `requireAdmin()` and the admin layout — useful for
// local testing, catastrophic in production (every admin endpoint becomes
// single-factor). The check runs at module load so `next build` and
// `next start` both fail fast.
if (
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PUBLIC_DEMO_MODE === "true"
) {
  throw new Error(
    "[next.config] Refusing to build/run: NEXT_PUBLIC_DEMO_MODE is 'true' in a production environment. " +
      "This disables MFA enforcement on every admin endpoint. " +
      "Set NEXT_PUBLIC_DEMO_MODE=false (or unset it) in the production env, then redeploy.",
  );
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "polymarket-upload.s3.us-east-2.amazonaws.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.polymarket.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
