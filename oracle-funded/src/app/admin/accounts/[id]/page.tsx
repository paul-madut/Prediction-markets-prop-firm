import { StubPage } from "@/components/StubPage";

export default function Page() {
  return (
    <StubPage
      title="Admin: account detail"
      subtitle="Per-account admin actions UI coming soon."
      hint="Backend admin actions (override / force-breach / reset / force-close) already shipped — see /api/admin/accounts/[id]/*."
      ctaHref="/admin"
      ctaLabel="Back to admin home"
    />
  );
}
