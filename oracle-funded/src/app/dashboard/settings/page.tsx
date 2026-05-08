import { StubPage } from "@/components/StubPage";

export default function Page() {
  return (
    <StubPage
      title="Settings"
      subtitle="Profile, notifications, and security preferences will live here."
      hint="Sign out via the top bar; password reset via Supabase email."
      ctaHref="/dashboard"
      ctaLabel="Back to dashboard"
    />
  );
}
