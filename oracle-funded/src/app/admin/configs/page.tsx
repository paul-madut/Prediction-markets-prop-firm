import { StubPage } from "@/components/StubPage";

export default function Page() {
  return (
    <StubPage
      title="Challenge configs"
      subtitle="Manage configs from the admin UI — coming soon."
      hint="Configs live in the DB and can be edited via Supabase Studio for now."
      ctaHref="/admin"
      ctaLabel="Back to admin home"
    />
  );
}
