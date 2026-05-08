import { StubPage } from "@/components/StubPage";

export default function Page() {
  return (
    <StubPage
      title="Trade history"
      subtitle="Your full trade ledger is on the way."
      hint="Recent fills are visible from each market detail page."
      ctaHref="/dashboard"
      ctaLabel="Back to dashboard"
    />
  );
}
