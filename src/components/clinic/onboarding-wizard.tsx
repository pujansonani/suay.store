"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, Plus, Send, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormError, Input, Select, Textarea } from "@/components/ui/field";
import { StepTransition } from "@/components/ui/motion";
import { cn } from "@/lib/utils";

export interface OnboardingState {
  clinicName: string;
  legalName: string;
  specialty: string;
  description: string;
  email: string;
  phone: string;
  website: string;
  addressLine1: string;
  district: string;
  city: string;
  postalCode: string;
  cancellationPolicy: string;
  bookingPolicy: string;
  services: { id: string; name: string; durationMinutes: number; priceMinor: number; active: boolean }[];
  staff: { id: string; name: string; role: string; serviceIds: string[] }[];
  resources: { id: string; name: string; type: "ROOM" | "EQUIPMENT"; tag: string | null }[];
  hours: { dayOfWeek: number; startMinute: number; endMinute: number }[];
  verification: {
    businessRegistrationNo: string;
    taxId: string;
    medicalLicenseNo: string;
    licenceAuthority: string;
    contactPersonName: string;
    contactPersonRole: string;
    contactPersonPhone: string;
    contactPersonEmail: string;
    notes: string;
  };
  status: string;
  reviewNote: string | null;
}

const STEPS = [
  "Business information",
  "Clinic details",
  "Treatments",
  "Practitioners",
  "Rooms & equipment",
  "Working hours",
  "Verification",
  "Review & submit",
];

const DAYS = [
  { index: 1, label: "Mon" },
  { index: 2, label: "Tue" },
  { index: 3, label: "Wed" },
  { index: 4, label: "Thu" },
  { index: 5, label: "Fri" },
  { index: 6, label: "Sat" },
  { index: 0, label: "Sun" },
];

/**
 * Clinic onboarding, steps 2–9.
 *
 * Each step saves through the same API the portal uses, so a clinic can stop
 * at any point and come back. Nothing here can set the clinic's status to
 * APPROVED — the final step submits it for review, and an administrator
 * decides.
 */
export function OnboardingWizard({ initial }: { initial: OnboardingState }) {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [direction, setDirection] = React.useState<1 | -1>(1);
  const [state, setState] = React.useState(initial);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [missing, setMissing] = React.useState<string[]>([]);

  function go(next: number) {
    setDirection(next > step ? 1 : -1);
    setStep(next);
    setError(null);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function post(url: string, method: string, body: unknown): Promise<boolean> {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error?.message ?? "We could not save this.");
        if (payload?.error?.details?.missing) setMissing(payload.error.details.missing);
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("We could not reach the server. Please try again.");
      return false;
    } finally {
      setPending(false);
    }
  }

  async function saveProfile(next?: number) {
    const ok = await post("/api/clinic/profile", "PATCH", {
      name: state.clinicName,
      legalName: state.legalName,
      specialty: state.specialty,
      tagline: "",
      description: state.description,
      email: state.email,
      phone: state.phone,
      website: state.website,
      lineId: "",
      addressLine1: state.addressLine1,
      district: state.district,
      city: state.city,
      postalCode: state.postalCode,
      cancellationPolicy: state.cancellationPolicy,
      bookingPolicy: state.bookingPolicy,
      cancellationWindowHours: null,
    });
    if (ok && next !== undefined) go(next);
  }

  async function saveHours(next?: number) {
    const ok = await post("/api/clinic/schedule", "PUT", {
      rules: state.hours.map((h) => ({ ...h, staffId: null })),
    });
    if (ok && next !== undefined) go(next);
  }

  async function saveVerification(next?: number) {
    const ok = await post("/api/clinic/verification", "PUT", {
      ...state.verification,
      documentRefs: [],
    });
    if (ok && next !== undefined) go(next);
  }

  async function submit() {
    setMissing([]);
    const ok = await post("/api/clinic/submit", "POST", {});
    if (ok) {
      router.push("/clinic/status");
      router.refresh();
    }
  }

  return (
    <div className="container-page max-w-3xl py-8">
      <ol className="mb-8 flex flex-wrap gap-x-1 gap-y-2" aria-label="Registration progress">
        {STEPS.map((label, index) => {
          const done = index < step;
          const active = index === step;
          return (
            <li key={label}>
              <button
                type="button"
                onClick={() => index <= step && go(index)}
                disabled={index > step}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2 py-1 text-[0.75rem] font-medium transition-colors",
                  active && "bg-teal-50 text-teal-700",
                  done && "text-ink-muted hover:bg-surface-muted",
                  !active && !done && "cursor-not-allowed text-ink-subtle",
                )}
              >
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-full text-[0.625rem] font-semibold",
                    active && "bg-teal-500 text-white",
                    done && "bg-success text-white",
                    !active && !done && "border border-line-strong text-ink-subtle",
                  )}
                >
                  {done ? <Check aria-hidden className="size-2.5" /> : index + 2}
                </span>
                {label}
              </button>
            </li>
          );
        })}
      </ol>

      {state.status === "CHANGES_REQUESTED" && state.reviewNote && (
        <div className="mb-6 rounded-md border border-[#e8d7b9] bg-warning-bg p-4">
          <p className="text-[0.8125rem] font-medium text-warning">Changes requested by Suay</p>
          <p className="mt-1 text-[0.8125rem] leading-relaxed text-warning/90">{state.reviewNote}</p>
        </div>
      )}

      <StepTransition stepKey={step} direction={direction}>
        <div className="rounded-lg border border-line bg-surface p-6">
          {error && (
            <div className="mb-4">
              <FormError>{error}</FormError>
            </div>
          )}

          {step === 0 && (
            <Section
              title="Business information"
              description="The registered details of the business operating the clinic."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Clinic name" required>
                  {(p) => (
                    <Input
                      {...p}
                      value={state.clinicName}
                      onChange={(e) => setState({ ...state, clinicName: e.target.value })}
                      data-autofocus
                    />
                  )}
                </Field>
                <Field label="Registered legal name" optional>
                  {(p) => (
                    <Input
                      {...p}
                      value={state.legalName}
                      onChange={(e) => setState({ ...state, legalName: e.target.value })}
                    />
                  )}
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Contact email" required>
                  {(p) => (
                    <Input
                      {...p}
                      type="email"
                      value={state.email}
                      onChange={(e) => setState({ ...state, email: e.target.value })}
                    />
                  )}
                </Field>
                <Field label="Clinic phone" required>
                  {(p) => (
                    <Input
                      {...p}
                      type="tel"
                      value={state.phone}
                      onChange={(e) => setState({ ...state, phone: e.target.value })}
                    />
                  )}
                </Field>
              </div>

              <Field label="Street address" required>
                {(p) => (
                  <Input
                    {...p}
                    value={state.addressLine1}
                    onChange={(e) => setState({ ...state, addressLine1: e.target.value })}
                  />
                )}
              </Field>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="District" optional>
                  {(p) => (
                    <Input
                      {...p}
                      value={state.district}
                      onChange={(e) => setState({ ...state, district: e.target.value })}
                    />
                  )}
                </Field>
                <Field label="City" required>
                  {(p) => (
                    <Input
                      {...p}
                      value={state.city}
                      onChange={(e) => setState({ ...state, city: e.target.value })}
                    />
                  )}
                </Field>
                <Field label="Postal code" optional>
                  {(p) => (
                    <Input
                      {...p}
                      value={state.postalCode}
                      onChange={(e) => setState({ ...state, postalCode: e.target.value })}
                    />
                  )}
                </Field>
              </div>

              <Footer
                onBack={null}
                onNext={() => void saveProfile(1)}
                pending={pending}
                nextLabel="Save and continue"
              />
            </Section>
          )}

          {step === 1 && (
            <Section
              title="Clinic details"
              description="What patients read on your public profile."
            >
              <Field label="Speciality" hint="Shown under your clinic name." optional>
                {(p) => (
                  <Input
                    {...p}
                    value={state.specialty}
                    onChange={(e) => setState({ ...state, specialty: e.target.value })}
                    placeholder="Skin & Aesthetic Care"
                    data-autofocus
                  />
                )}
              </Field>

              <Field
                label="About your clinic"
                hint="How you work and what patients can expect. Avoid claims about guaranteed results."
                required
              >
                {(p) => (
                  <Textarea
                    {...p}
                    rows={5}
                    value={state.description}
                    onChange={(e) => setState({ ...state, description: e.target.value })}
                  />
                )}
              </Field>

              <Field label="Cancellation policy" hint="Shown before a patient confirms a booking.">
                {(p) => (
                  <Textarea
                    {...p}
                    rows={3}
                    value={state.cancellationPolicy}
                    onChange={(e) => setState({ ...state, cancellationPolicy: e.target.value })}
                    placeholder="Free cancellation up to 24 hours before the appointment…"
                  />
                )}
              </Field>

              <Field label="Before the appointment" hint="Arrival time, consultation, what to bring.">
                {(p) => (
                  <Textarea
                    {...p}
                    rows={3}
                    value={state.bookingPolicy}
                    onChange={(e) => setState({ ...state, bookingPolicy: e.target.value })}
                  />
                )}
              </Field>

              <Footer onBack={() => go(0)} onNext={() => void saveProfile(2)} pending={pending} />
            </Section>
          )}

          {step === 2 && (
            <TreatmentsStep
              services={state.services}
              onChange={(services) => setState({ ...state, services })}
              onBack={() => go(1)}
              onNext={() => go(3)}
            />
          )}

          {step === 3 && (
            <StaffStep
              staff={state.staff}
              services={state.services}
              onChange={(staff) => setState({ ...state, staff })}
              onBack={() => go(2)}
              onNext={() => go(4)}
            />
          )}

          {step === 4 && (
            <ResourcesStep
              resources={state.resources}
              onChange={(resources) => setState({ ...state, resources })}
              onBack={() => go(3)}
              onNext={() => go(5)}
            />
          )}

          {step === 5 && (
            <Section
              title="Working hours"
              description="When your clinic is open. Add two periods for a split shift."
            >
              <div className="space-y-2">
                {DAYS.map((day) => {
                  const periods = state.hours.filter((h) => h.dayOfWeek === day.index);
                  return (
                    <div key={day.index} className="flex flex-wrap items-center gap-2">
                      <span className="w-12 shrink-0 text-[0.8125rem] font-medium text-navy-600">
                        {day.label}
                      </span>
                      {periods.length === 0 && (
                        <span className="text-[0.8125rem] text-ink-subtle">Closed</span>
                      )}
                      {periods.map((period, index) => (
                        <span key={index} className="flex items-center gap-1.5">
                          <Input
                            type="time"
                            aria-label={`${day.label} period ${index + 1} start`}
                            value={toLabel(period.startMinute)}
                            onChange={(e) =>
                              setState({
                                ...state,
                                hours: state.hours.map((h) =>
                                  h === period ? { ...h, startMinute: toMinutes(e.target.value) } : h,
                                ),
                              })
                            }
                            className="h-9 w-28 text-[0.8125rem]"
                          />
                          <span aria-hidden className="text-ink-subtle">–</span>
                          <Input
                            type="time"
                            aria-label={`${day.label} period ${index + 1} end`}
                            value={toLabel(period.endMinute)}
                            onChange={(e) =>
                              setState({
                                ...state,
                                hours: state.hours.map((h) =>
                                  h === period ? { ...h, endMinute: toMinutes(e.target.value) } : h,
                                ),
                              })
                            }
                            className="h-9 w-28 text-[0.8125rem]"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Remove ${day.label} period ${index + 1}`}
                            onClick={() =>
                              setState({ ...state, hours: state.hours.filter((h) => h !== period) })
                            }
                          >
                            <Trash2 aria-hidden className="size-3.5 text-danger" />
                          </Button>
                        </span>
                      ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-ink-muted"
                        onClick={() =>
                          setState({
                            ...state,
                            hours: [
                              ...state.hours,
                              { dayOfWeek: day.index, startMinute: 10 * 60, endMinute: 19 * 60 },
                            ],
                          })
                        }
                      >
                        <Plus aria-hidden className="size-3.5" />
                        Add
                      </Button>
                    </div>
                  );
                })}
              </div>

              <Footer onBack={() => go(4)} onNext={() => void saveHours(6)} pending={pending} />
            </Section>
          )}

          {step === 6 && (
            <Section
              title="Verification"
              description="Suay checks these details before your clinic can be listed. This is what the verified badge on your profile stands for."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Business registration number" required>
                  {(p) => (
                    <Input
                      {...p}
                      value={state.verification.businessRegistrationNo}
                      onChange={(e) =>
                        setState({
                          ...state,
                          verification: { ...state.verification, businessRegistrationNo: e.target.value },
                        })
                      }
                      data-autofocus
                    />
                  )}
                </Field>
                <Field label="Tax ID" optional>
                  {(p) => (
                    <Input
                      {...p}
                      value={state.verification.taxId}
                      onChange={(e) =>
                        setState({ ...state, verification: { ...state.verification, taxId: e.target.value } })
                      }
                    />
                  )}
                </Field>
                <Field label="Clinic licence number" optional>
                  {(p) => (
                    <Input
                      {...p}
                      value={state.verification.medicalLicenseNo}
                      onChange={(e) =>
                        setState({
                          ...state,
                          verification: { ...state.verification, medicalLicenseNo: e.target.value },
                        })
                      }
                    />
                  )}
                </Field>
                <Field label="Issuing authority" optional>
                  {(p) => (
                    <Input
                      {...p}
                      value={state.verification.licenceAuthority}
                      onChange={(e) =>
                        setState({
                          ...state,
                          verification: { ...state.verification, licenceAuthority: e.target.value },
                        })
                      }
                    />
                  )}
                </Field>
              </div>

              <fieldset className="space-y-4">
                <legend className="text-[0.8125rem] font-semibold text-navy-600">
                  Person responsible
                </legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Name" required>
                    {(p) => (
                      <Input
                        {...p}
                        value={state.verification.contactPersonName}
                        onChange={(e) =>
                          setState({
                            ...state,
                            verification: { ...state.verification, contactPersonName: e.target.value },
                          })
                        }
                      />
                    )}
                  </Field>
                  <Field label="Role" optional>
                    {(p) => (
                      <Input
                        {...p}
                        value={state.verification.contactPersonRole}
                        onChange={(e) =>
                          setState({
                            ...state,
                            verification: { ...state.verification, contactPersonRole: e.target.value },
                          })
                        }
                        placeholder="Clinic Director"
                      />
                    )}
                  </Field>
                  <Field label="Phone" optional>
                    {(p) => (
                      <Input
                        {...p}
                        type="tel"
                        value={state.verification.contactPersonPhone}
                        onChange={(e) =>
                          setState({
                            ...state,
                            verification: { ...state.verification, contactPersonPhone: e.target.value },
                          })
                        }
                      />
                    )}
                  </Field>
                  <Field label="Email" optional>
                    {(p) => (
                      <Input
                        {...p}
                        type="email"
                        value={state.verification.contactPersonEmail}
                        onChange={(e) =>
                          setState({
                            ...state,
                            verification: { ...state.verification, contactPersonEmail: e.target.value },
                          })
                        }
                      />
                    )}
                  </Field>
                </div>
              </fieldset>

              <Field label="Anything else we should know?" optional>
                {(p) => (
                  <Textarea
                    {...p}
                    rows={3}
                    value={state.verification.notes}
                    onChange={(e) =>
                      setState({ ...state, verification: { ...state.verification, notes: e.target.value } })
                    }
                  />
                )}
              </Field>

              <p className="rounded-md border border-line bg-surface-muted/60 px-3 py-2.5 text-[0.75rem] leading-relaxed text-ink-muted">
                Suay does not collect patient records or identity documents through this form. Enter
                business registration references only.
              </p>

              <Footer onBack={() => go(5)} onNext={() => void saveVerification(7)} pending={pending} />
            </Section>
          )}

          {step === 7 && (
            <Section
              title="Review and submit"
              description="Check everything below, then send your clinic for verification."
            >
              {missing.length > 0 && (
                <div className="rounded-md border border-[#e6cccc] bg-danger-bg p-3.5">
                  <p className="text-[0.8125rem] font-medium text-danger">
                    A few things are still needed
                  </p>
                  <ul className="mt-1.5 list-inside list-disc text-[0.8125rem] text-danger/90">
                    {missing.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              <dl className="divide-y divide-line rounded-md border border-line">
                <Summary label="Clinic" value={state.clinicName} />
                <Summary
                  label="Address"
                  value={[state.addressLine1, state.district, state.city, state.postalCode]
                    .filter(Boolean)
                    .join(", ")}
                />
                <Summary label="Contact" value={`${state.email} · ${state.phone}`} />
                <Summary
                  label="Treatments"
                  value={`${state.services.length} ${state.services.length === 1 ? "treatment" : "treatments"}`}
                />
                <Summary
                  label="Practitioners"
                  value={`${state.staff.length} ${state.staff.length === 1 ? "practitioner" : "practitioners"}`}
                />
                <Summary
                  label="Rooms & equipment"
                  value={`${state.resources.filter((r) => r.type === "ROOM").length} rooms, ${state.resources.filter((r) => r.type === "EQUIPMENT").length} devices`}
                />
                <Summary
                  label="Opening hours"
                  value={`${new Set(state.hours.map((h) => h.dayOfWeek)).size} days a week`}
                />
                <Summary
                  label="Business registration"
                  value={state.verification.businessRegistrationNo || "Not provided"}
                />
              </dl>

              <div className="rounded-md border border-line bg-surface-muted/60 p-4">
                <p className="text-[0.8125rem] leading-relaxed text-ink-muted">
                  When you submit, your clinic moves to <strong className="text-navy-600">pending review</strong>.
                  A Suay administrator checks your registration and licence references. You will be
                  told the outcome, and you can keep editing in the meantime — your clinic stays
                  invisible to patients until it is approved and you publish it.
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
                <Button variant="ghost" onClick={() => go(6)} disabled={pending}>
                  <ChevronLeft aria-hidden className="size-3.5" />
                  Back
                </Button>
                <Button size="lg" loading={pending} onClick={() => void submit()}>
                  <Send aria-hidden className="size-3.5" />
                  Submit for verification
                </Button>
              </div>
            </Section>
          )}
        </div>
      </StepTransition>
    </div>
  );
}

// --- step helpers ----------------------------------------------------------

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-navy-600">{title}</h1>
        <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-muted">{description}</p>
      </div>
      {children}
    </section>
  );
}

function Footer({
  onBack,
  onNext,
  pending,
  nextLabel = "Save and continue",
}: {
  onBack: (() => void) | null;
  onNext: () => void;
  pending: boolean;
  nextLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
      {onBack ? (
        <Button variant="ghost" onClick={onBack} disabled={pending}>
          <ChevronLeft aria-hidden className="size-3.5" />
          Back
        </Button>
      ) : (
        <span />
      )}
      <Button loading={pending} onClick={onNext}>
        {nextLabel}
      </Button>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-3 px-4 py-2.5 text-[0.8125rem]">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-right font-medium text-ink">{value || "—"}</dd>
    </div>
  );
}

function TreatmentsStep({
  services,
  onChange,
  onBack,
  onNext,
}: {
  services: OnboardingState["services"];
  onChange: (services: OnboardingState["services"]) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [name, setName] = React.useState("");
  const [duration, setDuration] = React.useState("60");
  const [price, setPrice] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function add() {
    if (!name.trim()) {
      setError("Enter a treatment name.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/clinic/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          serviceClass: "AESTHETIC",
          isMedicalAesthetic: false,
          durationMinutes: Number(duration) || 60,
          bufferBeforeMinutes: 0,
          bufferAfterMinutes: 10,
          priceMinor: Math.round(Number(price || 0) * 100),
          requiresStaff: true,
          active: true,
          staffIds: [],
          requirements: [],
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "We could not add this treatment.");
        return;
      }
      onChange([
        ...services,
        {
          id: body.service.id,
          name,
          durationMinutes: Number(duration) || 60,
          priceMinor: Math.round(Number(price || 0) * 100),
          active: true,
        },
      ]);
      setName("");
      setPrice("");
    } catch {
      setError("We could not reach the server. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Section
      title="Treatments"
      description="Add at least one treatment. You can set turnaround times, rooms and equipment later in the portal."
    >
      {error && <FormError>{error}</FormError>}

      {services.length > 0 && (
        <ul className="divide-y divide-line rounded-md border border-line">
          {services.map((service) => (
            <li key={service.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="text-[0.8125rem] font-medium text-ink">{service.name}</span>
              <span className="text-[0.8125rem] text-ink-muted tabular">
                {service.durationMinutes} min ·{" "}
                {service.priceMinor === 0 ? "Free" : `฿${(service.priceMinor / 100).toLocaleString()}`}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="grid items-end gap-3 sm:grid-cols-[1fr_7rem_8rem_auto]">
        <Field label="Treatment name">
          {(p) => (
            <Input {...p} value={name} onChange={(e) => setName(e.target.value)} data-autofocus />
          )}
        </Field>
        <Field label="Minutes">
          {(p) => (
            <Input {...p} type="number" min={5} step={5} value={duration} onChange={(e) => setDuration(e.target.value)} />
          )}
        </Field>
        <Field label="Price (฿)">
          {(p) => <Input {...p} type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />}
        </Field>
        <Button variant="secondary" loading={pending} onClick={() => void add()}>
          <Plus aria-hidden className="size-3.5" />
          Add
        </Button>
      </div>

      <Footer onBack={onBack} onNext={onNext} pending={false} nextLabel="Continue" />
    </Section>
  );
}

function StaffStep({
  staff,
  services,
  onChange,
  onBack,
  onNext,
}: {
  staff: OnboardingState["staff"];
  services: OnboardingState["services"];
  onChange: (staff: OnboardingState["staff"]) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [name, setName] = React.useState("");
  const [role, setRole] = React.useState("");
  const [serviceIds, setServiceIds] = React.useState<string[]>([]);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function add() {
    if (!name.trim() || !role.trim()) {
      setError("Enter a name and a role.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/clinic/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          role,
          credentials: [],
          qualifications: [],
          specializations: [],
          languages: [],
          active: true,
          serviceIds,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "We could not add this practitioner.");
        return;
      }
      onChange([...staff, { id: body.staff.id, name, role, serviceIds }]);
      setName("");
      setRole("");
      setServiceIds([]);
    } catch {
      setError("We could not reach the server. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Section
      title="Practitioners"
      description="Add at least one. Suay cannot offer a time unless a qualified practitioner is free."
    >
      {error && <FormError>{error}</FormError>}

      {staff.length > 0 && (
        <ul className="divide-y divide-line rounded-md border border-line">
          {staff.map((member) => (
            <li key={member.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="text-[0.8125rem] font-medium text-ink">{member.name}</span>
              <span className="text-[0.8125rem] text-ink-muted">{member.role}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name">
          {(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} data-autofocus />}
        </Field>
        <Field label="Role">
          {(p) => (
            <Input {...p} value={role} onChange={(e) => setRole(e.target.value)} placeholder="Dermatologist" />
          )}
        </Field>
      </div>

      {services.length > 0 && (
        <fieldset className="rounded-md border border-line p-3.5">
          <legend className="px-1 text-[0.8125rem] font-medium text-navy-600">
            Treatments they perform
          </legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {services.map((service) => (
              <Checkbox
                key={service.id}
                label={service.name}
                checked={serviceIds.includes(service.id)}
                onChange={(e) =>
                  setServiceIds(
                    e.target.checked
                      ? [...serviceIds, service.id]
                      : serviceIds.filter((id) => id !== service.id),
                  )
                }
              />
            ))}
          </div>
        </fieldset>
      )}

      <Button variant="secondary" loading={pending} onClick={() => void add()}>
        <Plus aria-hidden className="size-3.5" />
        Add practitioner
      </Button>

      <Footer onBack={onBack} onNext={onNext} pending={false} nextLabel="Continue" />
    </Section>
  );
}

function ResourcesStep({
  resources,
  onChange,
  onBack,
  onNext,
}: {
  resources: OnboardingState["resources"];
  onChange: (resources: OnboardingState["resources"]) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<"ROOM" | "EQUIPMENT">("ROOM");
  const [tag, setTag] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function add() {
    if (!name.trim()) {
      setError("Enter a name.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/clinic/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type, tag, notes: "", active: true }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "We could not add this.");
        return;
      }
      onChange([...resources, { id: body.resource.id, name, type, tag: tag || null }]);
      setName("");
      setTag("");
    } catch {
      setError("We could not reach the server. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Section
      title="Rooms & equipment"
      description="Optional, but this is what stops two appointments being offered the same room or laser."
    >
      {error && <FormError>{error}</FormError>}

      {resources.length > 0 && (
        <ul className="divide-y divide-line rounded-md border border-line">
          {resources.map((resource) => (
            <li key={resource.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="text-[0.8125rem] font-medium text-ink">{resource.name}</span>
              <Badge tone="neutral">{resource.type === "ROOM" ? "Room" : "Equipment"}</Badge>
            </li>
          ))}
        </ul>
      )}

      <div className="grid items-end gap-3 sm:grid-cols-[1fr_9rem_9rem_auto]">
        <Field label="Name">
          {(p) => (
            <Input
              {...p}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Treatment Room 1"
              data-autofocus
            />
          )}
        </Field>
        <Field label="Type">
          {(p) => (
            <Select {...p} value={type} onChange={(e) => setType(e.target.value as "ROOM" | "EQUIPMENT")}>
              <option value="ROOM">Room</option>
              <option value="EQUIPMENT">Equipment</option>
            </Select>
          )}
        </Field>
        <Field label="Tag" hint="Optional">
          {(p) => <Input {...p} value={tag} onChange={(e) => setTag(e.target.value)} placeholder="treatment" />}
        </Field>
        <Button variant="secondary" loading={pending} onClick={() => void add()}>
          <Plus aria-hidden className="size-3.5" />
          Add
        </Button>
      </div>

      <Footer onBack={onBack} onNext={onNext} pending={false} nextLabel="Continue" />
    </Section>
  );
}

function toLabel(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function toMinutes(label: string): number {
  const [h, m] = label.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}
