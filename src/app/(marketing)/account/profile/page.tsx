import { LogOut } from "lucide-react";

import { ProfileForm } from "@/components/account/profile-form";
import { SignOutButton } from "@/components/account/sign-out-button";
import { PageTransition } from "@/components/ui/motion";
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { requireCustomerPage } from "@/lib/auth/routes";
import { prisma } from "@/lib/db";

export const metadata = { title: "Profile" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await requireCustomerPage("/account/profile");

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      name: true,
      email: true,
      phone: true,
      locale: true,
      lineUserId: true,
      createdAt: true,
    },
  });

  if (!user) return null;

  return (
    <PageTransition className="max-w-2xl space-y-5">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Your details</CardTitle>
            <CardDescription>
              Clinics see your name and contact details for appointments you book with them.
            </CardDescription>
          </div>
        </CardHeader>
        <CardBody>
          <ProfileForm
            defaults={{ name: user.name, email: user.email, phone: user.phone ?? "" }}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Sign-in methods</CardTitle>
            <CardDescription>How you sign in to Suay.</CardDescription>
          </div>
        </CardHeader>
        <CardBody>
          <dl className="space-y-2.5 text-[0.8125rem]">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Email</dt>
              <dd className="text-ink">{user.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">LINE</dt>
              <dd className="text-ink">
                {user.lineUserId ? "Connected" : "Not connected"}
              </dd>
            </div>
          </dl>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Sign out</CardTitle>
            <CardDescription>End your session on this device.</CardDescription>
          </div>
          <LogOut aria-hidden className="size-4 shrink-0 text-ink-subtle" />
        </CardHeader>
        <CardBody>
          <SignOutButton />
        </CardBody>
      </Card>
    </PageTransition>
  );
}
