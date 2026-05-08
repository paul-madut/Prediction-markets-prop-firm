import { StubPage } from "@/components/StubPage";

export default function Page() {
  return (
    <StubPage
      title="Trader detail"
      subtitle="Per-trader profile, history, and admin actions coming soon."
      hint="Use /admin/payouts to act on payouts; admin action API routes are live."
      ctaHref="/admin"
      ctaLabel="Back to admin home"
    />
  );
}
