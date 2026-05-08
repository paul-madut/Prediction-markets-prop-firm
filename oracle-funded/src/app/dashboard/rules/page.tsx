import { StubPage } from "@/components/StubPage";

export default function Page() {
  return (
    <StubPage
      title="Trading Rules"
      subtitle="A full rulebook page is in design."
      hint="Your account's actual drawdown thresholds appear on the dashboard."
      ctaHref="/dashboard"
      ctaLabel="See your account"
    />
  );
}
