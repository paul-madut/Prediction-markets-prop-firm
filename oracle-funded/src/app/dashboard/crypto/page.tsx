import { StubPage } from "@/components/StubPage";

export default function Page() {
  return (
    <StubPage
      title="Crypto markets"
      subtitle="Crypto-only filtered market view is coming."
      hint="All Polymarket crypto markets show up in /dashboard/markets today."
      ctaHref="/dashboard/markets"
      ctaLabel="Browse markets"
    />
  );
}
