import { ClinicPortalShell } from "@/components/clinic/portal-shell";
import { requireClinicPage } from "@/lib/auth/routes";

/**
 * Every page inside this group requires an approved clinic. The page guard
 * redirects; the API guards refuse independently, so hiding the navigation is
 * never the only thing standing between a caller and the data.
 */
export default async function ClinicPortalLayout({ children }: { children: React.ReactNode }) {
  const session = await requireClinicPage("/clinic/dashboard");

  return (
    <ClinicPortalShell
      clinic={{
        name: session.providerName ?? "Your clinic",
        slug: session.providerSlug ?? "",
        status: session.providerStatus ?? "DRAFT",
        published: session.providerPublished,
      }}
      userName={session.name}
    >
      {children}
    </ClinicPortalShell>
  );
}
