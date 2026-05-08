import { StubPage } from "@/components/StubPage";

export default function Page() {
  return (
    <StubPage
      title="Traders"
      subtitle="Trader directory + per-trader actions panel coming soon."
      hint="Backend /api/accounts already exposes firm-scoped trader data; UI ready when prioritised."
      ctaHref="/admin"
      ctaLabel="Back to admin home"
    />
  );
}
