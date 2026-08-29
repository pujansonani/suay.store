import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, Clock, ShieldCheck, XCircle } from "lucide-react";

import { Logo } from "@/components/marketing/logo";
import { SignOutButton } from "@/components/account/sign-out-button";
import { PageTransition } from "@/components/ui/motion";
import { ProviderStatusPill } from "@/components/ui/status";
import { requireClinicOnboardingPage } from "@/lib/auth/routes";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/i18n/format";
import { getTranslations } from "@/lib/i18n/server";

export const metadata = { title: "Application status" };
export const dynamic = "force-dynamic";

export default async function ClinicStatusPage() {
  const session = await requireClinicOnboardingPage("/clinic/status");
  if (!session.providerId) redirect("/clinic/register");
  if (session.providerStatus === "APPROVED") redirect("/clinic/dashboard");

  const { locale } = await getTranslations();

  const provider = await prisma.provider.findUnique({
    where: { id: session.providerId },
    select: {
      name: true,
      status: true,
      submittedAt: true,
      reviewedAt: true,
      reviewNote: true,
      suspensionReason: true,
    },
  });
  if (!provider) redirect("/clinic/register");

  const copy = {
    DRAFT: {
      icon: Clock,
      tone: "text-ink-muted",
      title: "Your registration is not finished",
      body: "Complete the remaining steps and submit your clinic for verification.",
      action: { href: "/clinic/onboarding", label: "Continue registration" },
    },
    PENDING_REVIEW: {
      icon: Clock,
      tone: "text-warning",
      title: "Your clinic application has been submitted and is awaiting review",
      body: "A Suay administrator is checking your business and licence details. We will email you as soon as there is a decision. You can keep editing your details in the meantime.",
      action: { href: "/clinic/onboarding", label: "Review my details" },
    },
    CHANGES_REQUESTED: {
      icon: AlertTriangle,
      tone: "text-warning",
      title: "We need a few changes before we can approve your clinic",
      body: "Update the details noted below and submit again.",
      action: { href: "/clinic/onboarding", label: "Update and resubmit" },
    },
    REJECTED: {
      icon: XCircle,
      tone: "text-danger",
      title: "Your application was not approved",
      body: "You can update your details and submit again.",
      action: { href: "/clinic/onboarding", label: "Update and resubmit" },
    },
    SUSPENDED: {
      icon: AlertTriangle,
      tone: "text-danger",
      title: "This clinic has been suspended",
      body: "Your clinic is not listed and cannot take new bookings. Existing records are preserved. Please contact Suay support.",
      action: null,
    },
    DEACTIVATED: {
      icon: XCircle,
      tone: "text-ink-muted",
      title: "This clinic account has been deactivated",
      body: "Please contact Suay support if you believe this is a mistake.",
      action: null,
    },
  } as const;

  const state = copy[(provider.status as keyof typeof copy) ?? "DRAFT"] ?? copy.DRAFT;
  const Icon = state.icon;
  const note = provider.suspensionReason ?? provider.reviewNote;

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="border-b border-line bg-surface">
        <div className="container-page flex h-16 items-center justify-between">
          <Link href="/" aria-label="Suay.store home">
            <Logo />
          </Link>
          <SignOutButton />
        </div>
      </header>

      <main id="main" className="flex flex-1 items-start justify-center px-5 py-12 md:py-16">
        <PageTransition className="w-full max-w-xl">
          <div className="rounded-lg border border-line bg-surface p-6 md:p-8">
            <div className="flex items-start gap-4">
              <Icon aria-hidden className={`mt-0.5 size-6 shrink-0 ${state.tone}`} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg font-semibold text-navy-600">{provider.name}</h1>
                  <ProviderStatusPill status={provider.status} />
                </div>
                <h2 className="mt-3 text-[0.9375rem] font-medium text-navy-600">{state.title}</h2>
                <p className="mt-1.5 text-[0.875rem] leading-relaxed text-ink-muted">{state.body}</p>

                {note && (
                  <div className="mt-4 rounded-md border border-line bg-surface-muted/60 p-3.5">
                    <p className="text-[0.75rem] font-medium text-navy-600">Note from Suay</p>
                    <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-muted">{note}</p>
                  </div>
                )}

                <dl className="mt-5 space-y-1.5 border-t border-line pt-4 text-[0.8125rem]">
                  {provider.submittedAt && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-ink-muted">Submitted</dt>
                      <dd className="text-ink">{formatDate(provider.submittedAt, locale)}</dd>
                    </div>
                  )}
                  {provider.reviewedAt && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-ink-muted">Last reviewed</dt>
                      <dd className="text-ink">{formatDate(provider.reviewedAt, locale)}</dd>
                    </div>
                  )}
                </dl>

                {state.action && (
                  <Link
                    href={state.action.href}
                    className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-teal-500 px-5 text-sm font-medium text-white transition-colors hover:bg-teal-600"
                  >
                    {state.action.label}
                  </Link>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-start gap-2.5 rounded-md border border-line bg-surface p-4">
            <ShieldCheck aria-hidden className="mt-px size-4 shrink-0 text-teal-500" />
            <p className="text-[0.75rem] leading-relaxed text-ink-muted">
              Review exists so the verified badge on a clinic profile means something to patients.
              Nothing about your clinic is visible on the marketplace until it is approved and you
              choose to publish.
            </p>
          </div>
        </PageTransition>
      </main>
    </div>
  );
}
