import { StubPage } from "@/components/StubPage";

export default function Page() {
  return (
    <StubPage
      title="Challenge Progress"
      subtitle="Per-phase progress + transition history coming soon."
      hint="Top-line phase + drawdown floor are on the dashboard home."
      ctaHref="/dashboard"
      ctaLabel="Back to dashboard"
    />
  );
}
