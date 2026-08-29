import Link from "next/link";
import { CalendarRange, ClipboardCheck, DoorOpen, LineChart, Users, Wrench } from "lucide-react";

import { PageTransition } from "@/components/ui/motion";

export const metadata = { title: "For clinics" };

const CAPABILITIES = [
  { icon: CalendarRange, title: "One calendar", body: "Day, week and month views across every practitioner, with blocked time, breaks and holidays." },
  { icon: Users, title: "Practitioners", body: "Shifts, leave, and which treatments each person is qualified to perform." },
  { icon: DoorOpen, title: "Rooms", body: "Treatment rooms are real capacity. A time is not offered when the room is taken." },
  { icon: Wrench, title: "Equipment", body: "Lasers and devices are booked alongside the practitioner and the room." },
  { icon: ClipboardCheck, title: "Your own patients", body: "Walk-in, phone and LINE bookings sit in the same calendar as marketplace bookings." },
  { icon: LineChart, title: "Your numbers", body: "Appointments, revenue, cancellation rate and reviews — for your clinic only." },
];

const STEPS = [
  { title: "Create your clinic account", body: "One account for your clinic, with your own login." },
  { title: "Tell us about the clinic", body: "Business details, treatments, practitioners, rooms and opening hours." },
  { title: "Submit for verification", body: "We check your registration and licence references." },
  { title: "Get approved and publish", body: "Once approved you choose when to appear on the marketplace." },
];

export default function ForClinicsPage() {
  return (
    <PageTransition>
      <section className="border-b border-line bg-navy-600">
        <div className="container-page py-14 md:py-20">
          <div className="max-w-2xl">
            <p className="text-[0.8125rem] font-medium tracking-wide text-teal-200">For clinics</p>
            <h1 className="mt-3 text-[2rem] font-semibold leading-[1.15] text-white md:text-[2.5rem]">
              Run your clinic, and be found by patients who trust it.
            </h1>
            <p className="mt-4 text-[0.9375rem] leading-relaxed text-navy-100">
              Suay is a booking system for your practitioners, rooms and equipment — and a
              marketplace where verified clinics are listed. You control your calendar, your prices
              and whether you appear publicly.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/clinic/register"
                className="inline-flex h-11 items-center justify-center rounded-md bg-teal-500 px-5 text-sm font-medium text-white transition-colors hover:bg-teal-400"
              >
                Register your clinic
              </Link>
              <Link
                href="/clinic/login"
                className="inline-flex h-11 items-center justify-center rounded-md border border-navy-400 px-5 text-sm font-medium text-white transition-colors hover:bg-navy-500"
              >
                Clinic sign in
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-12 md:py-16">
        <h2 className="text-xl font-semibold text-navy-600">What you get</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((item) => (
            <article key={item.title} className="rounded-lg border border-line bg-surface p-5">
              <item.icon aria-hidden className="size-5 text-teal-500" />
              <h3 className="mt-3 text-[0.9375rem] font-semibold text-navy-600">{item.title}</h3>
              <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-muted">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-surface-muted/40">
        <div className="container-page py-12 md:py-16">
          <h2 className="text-xl font-semibold text-navy-600">Getting listed</h2>
          <p className="mt-1.5 max-w-2xl text-[0.8125rem] text-ink-muted">
            Every clinic is reviewed before it appears publicly. That review is what the verified
            badge on your profile actually stands for.
          </p>
          <ol className="mt-6 grid gap-6 md:grid-cols-4">
            {STEPS.map((step, index) => (
              <li key={step.title} className="border-t-2 border-teal-500 pt-4">
                <span className="text-[0.75rem] font-semibold text-teal-600 tabular">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-1.5 text-[0.9375rem] font-semibold text-navy-600">{step.title}</h3>
                <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-muted">{step.body}</p>
              </li>
            ))}
          </ol>

          <div className="mt-8">
            <Link
              href="/clinic/register"
              className="inline-flex h-11 items-center justify-center rounded-md bg-teal-500 px-5 text-sm font-medium text-white transition-colors hover:bg-teal-600"
            >
              Start registration
            </Link>
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
