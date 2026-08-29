import Link from "next/link";
import { BadgeCheck, CalendarCheck, CreditCard, FileText, RefreshCcw, ShieldCheck } from "lucide-react";

import { PageTransition } from "@/components/ui/motion";

export const metadata = { title: "How it works" };

const STEPS = [
  {
    icon: FileText,
    title: "Compare clinics on what matters",
    body: "Every clinic profile shows its treatments with full prices and durations, its practitioners and their stated qualifications, its opening hours, and its cancellation policy — before you decide anything.",
  },
  {
    icon: CalendarCheck,
    title: "See real availability",
    body: "The times you see are generated from the clinic's own calendar. A time only appears when the clinic is open, a qualified practitioner is on shift, and every treatment room and device the treatment needs is free.",
  },
  {
    icon: CreditCard,
    title: "Your slot is held while you pay",
    body: "As soon as you continue to payment, the time is reserved and nobody else can take it. If payment is not completed the hold is released and the time returns to the clinic's calendar.",
  },
  {
    icon: RefreshCcw,
    title: "Change or cancel clearly",
    body: "The clinic's cancellation window is shown before you confirm and again on your appointment. Rescheduling re-checks availability properly rather than just moving the date.",
  },
];

const TRUST = [
  {
    icon: BadgeCheck,
    title: "What “verified” means",
    body: "A verified clinic has submitted its business registration and licence references, and a Suay administrator has reviewed them before the profile was published. Verification confirms who the clinic is. It is not a clinical endorsement and it does not guarantee any treatment outcome.",
  },
  {
    icon: ShieldCheck,
    title: "What we do not do",
    body: "We do not rank clinics by how much they pay us, and we do not run promotional discounting on medical or aesthetic procedures. Sort order is stated plainly in the control at the top of the results.",
  },
];

export default function HowItWorksPage() {
  return (
    <PageTransition>
      <div className="border-b border-line bg-surface">
        <div className="container-page py-12 md:py-16">
          <h1 className="max-w-2xl text-2xl font-semibold leading-tight text-navy-600 md:text-3xl">
            How Suay works
          </h1>
          <p className="mt-3 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-muted">
            Suay exists to make one decision easier: which clinic to trust with an appointment. Here
            is exactly what happens, and what we check.
          </p>
        </div>
      </div>

      <div className="container-page py-12">
        <ol className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {STEPS.map((step, index) => (
            <li key={step.title} className="rounded-lg border border-line bg-surface p-5">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-md bg-teal-50 text-teal-600">
                  <step.icon aria-hidden className="size-4" />
                </span>
                <span className="text-[0.75rem] font-semibold text-teal-600 tabular">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <h2 className="mt-3 text-[0.9375rem] font-semibold text-navy-600">{step.title}</h2>
              <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-muted">{step.body}</p>
            </li>
          ))}
        </ol>

        <section className="mt-12">
          <h2 className="text-lg font-semibold text-navy-600">Trust and verification</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {TRUST.map((item) => (
              <article key={item.title} className="rounded-lg border border-line bg-surface p-5">
                <div className="flex items-start gap-3">
                  <item.icon aria-hidden className="mt-0.5 size-5 shrink-0 text-teal-500" />
                  <div>
                    <h3 className="text-[0.9375rem] font-semibold text-navy-600">{item.title}</h3>
                    <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-muted">{item.body}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-lg border border-line bg-surface p-6">
          <h2 className="text-lg font-semibold text-navy-600">About this environment</h2>
          <p className="mt-2 max-w-3xl text-[0.8125rem] leading-relaxed text-ink-muted">
            This is a demonstration deployment. Every clinic, practitioner, credential and review in
            it is fictional and was created for the demo. Payments run through a simulated gateway:
            no card details are collected, and no money moves. Nothing here should be taken as
            medical advice or as information about a real business.
          </p>
          <Link
            href="/clinics"
            className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-teal-500 px-5 text-sm font-medium text-white transition-colors hover:bg-teal-600"
          >
            Browse clinics
          </Link>
        </section>
      </div>
    </PageTransition>
  );
}
