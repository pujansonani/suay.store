import { PageHeader } from "@/components/clinic/page-header";
import { PolicyForm } from "@/components/admin/policy-form";
import { PageTransition } from "@/components/ui/motion";
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { requireAdminPage } from "@/lib/auth/routes";
import { config, getPolicy } from "@/lib/config";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireAdminPage("/admin/settings");
  const policy = await getPolicy();

  return (
    <PageTransition className="max-w-3xl space-y-6">
      <PageHeader
        title="Platform settings"
        description="Commercial and booking policy. The booking and payment code reads these at runtime, so changes apply immediately without a deploy."
      />

      <PolicyForm policy={policy} />

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Environment</CardTitle>
            <CardDescription>
              Set at deploy time, shown here for reference. These are not editable from the interface.
            </CardDescription>
          </div>
        </CardHeader>
        <CardBody>
          <dl className="divide-y divide-line text-[0.8125rem]">
            {[
              ["Timezone", config.timezone],
              ["Currency", config.currency],
              ["Payment gateway", config.payments.provider],
              ["Notification transport", config.notifications.transport],
              ["LINE mode", config.line.mode],
              ["Demo mode", config.demoMode ? "on" : "off"],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 py-2.5">
                <dt className="text-ink-muted">{label}</dt>
                <dd className="font-medium text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </CardBody>
      </Card>
    </PageTransition>
  );
}
