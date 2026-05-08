import { StubPage } from "@/components/StubPage";

export default function Page() {
  return (
    <StubPage
      title="News events"
      subtitle="Add or schedule news cooldowns from this page — coming soon."
      hint="Order validation already enforces cooldowns once rows exist."
      ctaHref="/admin"
      ctaLabel="Back to admin home"
    />
  );
}
