import { StubPage } from "@/components/StubPage";

export default function Page() {
  return (
    <StubPage
      title="Portfolio"
      subtitle="Open positions, allocation, and P&L breakdown will land here."
      hint="Live equity and balance are already on your dashboard home."
      ctaHref="/dashboard"
      ctaLabel="Back to dashboard"
    />
  );
}
