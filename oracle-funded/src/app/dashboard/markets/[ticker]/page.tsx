import { StubPage } from "@/components/StubPage";

export default function Page() {
  return (
    <StubPage
      title="Market detail"
      subtitle="Per-market trade panel is being wired against the order engine."
      hint="For now use the markets list to browse + order via the API."
      ctaHref="/dashboard/markets"
      ctaLabel="Browse markets"
    />
  );
}
