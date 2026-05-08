import { StubPage } from "@/components/StubPage";

export default function Page() {
  return (
    <StubPage
      title="Firm settings"
      subtitle="Brand, enabled venues, and tenant settings will live here."
      hint="Edit via Supabase Studio for now."
      ctaHref="/admin"
      ctaLabel="Back to admin home"
    />
  );
}
