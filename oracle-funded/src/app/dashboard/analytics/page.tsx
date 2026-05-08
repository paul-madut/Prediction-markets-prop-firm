import { StubPage } from "@/components/StubPage";

export default function Page() {
  return (
    <StubPage
      title="Analytics"
      subtitle="Win rate, profit factor, and drawdown analytics are coming soon."
      hint="Backend stores every trade — UI just needs to render the aggregates."
      ctaHref="/dashboard"
      ctaLabel="Back to dashboard"
    />
  );
}
