"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Sparkles, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormError, Input, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/states";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import type { Locale } from "@/lib/i18n";
import { formatMoneyShort } from "@/lib/money";

export interface TreatmentRow {
  id: string;
  name: string;
  description: string | null;
  importantInfo: string | null;
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  priceMinor: number;
  currency: string;
  serviceClass: string;
  isMedicalAesthetic: boolean;
  requiresStaff: boolean;
  active: boolean;
  categoryId: string | null;
  categoryName: string | null;
  staffIds: string[];
  requirements: { resourceType: "ROOM" | "EQUIPMENT"; resourceTag: string | null; quantity: number }[];
  bookingCount: number;
}

interface FormState {
  name: string;
  description: string;
  importantInfo: string;
  categoryId: string;
  serviceClass: string;
  isMedicalAesthetic: boolean;
  durationMinutes: string;
  bufferBeforeMinutes: string;
  bufferAfterMinutes: string;
  price: string;
  requiresStaff: boolean;
  active: boolean;
  staffIds: string[];
  requirements: { resourceType: "ROOM" | "EQUIPMENT"; resourceTag: string; quantity: string }[];
}

const EMPTY: FormState = {
  name: "",
  description: "",
  importantInfo: "",
  categoryId: "",
  serviceClass: "AESTHETIC",
  isMedicalAesthetic: false,
  durationMinutes: "60",
  bufferBeforeMinutes: "0",
  bufferAfterMinutes: "10",
  price: "",
  requiresStaff: true,
  active: true,
  staffIds: [],
  requirements: [],
};

export function TreatmentsManager({
  treatments,
  categories,
  staff,
  resourceTags,
  locale,
}: {
  treatments: TreatmentRow[];
  categories: { id: string; name: string }[];
  staff: { id: string; name: string; role: string }[];
  resourceTags: { tag: string; type: "ROOM" | "EQUIPMENT"; count: number }[];
  locale: Locale;
}) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<TreatmentRow | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [deleting, setDeleting] = React.useState<TreatmentRow | null>(null);
  const [form, setForm] = React.useState<FormState>(EMPTY);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  function openCreate() {
    setForm(EMPTY);
    setError(null);
    setFieldErrors({});
    setCreating(true);
  }

  function openEdit(row: TreatmentRow) {
    setForm({
      name: row.name,
      description: row.description ?? "",
      importantInfo: row.importantInfo ?? "",
      categoryId: row.categoryId ?? "",
      serviceClass: row.serviceClass,
      isMedicalAesthetic: row.isMedicalAesthetic,
      durationMinutes: String(row.durationMinutes),
      bufferBeforeMinutes: String(row.bufferBeforeMinutes),
      bufferAfterMinutes: String(row.bufferAfterMinutes),
      price: String(row.priceMinor / 100),
      requiresStaff: row.requiresStaff,
      active: row.active,
      staffIds: row.staffIds,
      requirements: row.requirements.map((r) => ({
        resourceType: r.resourceType,
        resourceTag: r.resourceTag ?? "",
        quantity: String(r.quantity),
      })),
    });
    setError(null);
    setFieldErrors({});
    setEditing(row);
  }

  async function save() {
    setPending(true);
    setError(null);
    setFieldErrors({});

    const payload = {
      name: form.name,
      description: form.description,
      importantInfo: form.importantInfo,
      categoryId: form.categoryId || null,
      serviceClass: form.serviceClass,
      isMedicalAesthetic: form.isMedicalAesthetic,
      durationMinutes: Number(form.durationMinutes),
      bufferBeforeMinutes: Number(form.bufferBeforeMinutes),
      bufferAfterMinutes: Number(form.bufferAfterMinutes),
      // Entered in baht, stored in satang.
      priceMinor: Math.round(Number(form.price || 0) * 100),
      requiresStaff: form.requiresStaff,
      active: form.active,
      staffIds: form.staffIds,
      requirements: form.requirements.map((r) => ({
        resourceType: r.resourceType,
        resourceTag: r.resourceTag || null,
        quantity: Number(r.quantity) || 1,
      })),
    };

    try {
      const response = await fetch(
        editing ? `/api/clinic/services/${editing.id}` : "/api/clinic/services",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "We could not save this treatment.");
        if (body?.error?.details) setFieldErrors(body.error.details);
        setPending(false);
        return;
      }
      setCreating(false);
      setEditing(null);
      router.refresh();
    } catch {
      setError("We could not reach the server. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (!deleting) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/clinic/services/${deleting.id}`, { method: "DELETE" });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "We could not remove this treatment.");
        setPending(false);
        return;
      }
      setDeleting(null);
      router.refresh();
    } catch {
      setError("We could not reach the server. Please try again.");
    } finally {
      setPending(false);
    }
  }

  const dialogOpen = creating || editing !== null;

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus aria-hidden className="size-3.5" />
          Add treatment
        </Button>
      </div>

      {treatments.length === 0 ? (
        <div className="rounded-lg border border-line bg-surface">
          <EmptyState
            icon={Sparkles}
            title="No treatments yet"
            description="Add the treatments you offer, with their duration and price. Patients see exactly what you enter here."
            action={<Button onClick={openCreate}>Add your first treatment</Button>}
          />
        </div>
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Treatment</Th>
                <Th>Category</Th>
                <Th className="text-right">Duration</Th>
                <Th className="text-right">Price</Th>
                <Th>Practitioners</Th>
                <Th>Needs</Th>
                <Th>Status</Th>
                <Th><span className="sr-only">Actions</span></Th>
              </tr>
            </thead>
            <tbody>
              {treatments.map((row) => (
                <Tr key={row.id}>
                  <Td>
                    <span className="block text-[0.8125rem] font-medium">{row.name}</span>
                    {row.isMedicalAesthetic && (
                      <Badge tone="navy" className="mt-1">Medical / aesthetic</Badge>
                    )}
                  </Td>
                  <Td className="text-[0.8125rem] text-ink-muted">{row.categoryName ?? "—"}</Td>
                  <Td className="whitespace-nowrap text-right text-[0.8125rem] tabular">
                    {row.durationMinutes} min
                    {row.bufferAfterMinutes > 0 && (
                      <span className="block text-[0.6875rem] text-ink-subtle">
                        +{row.bufferAfterMinutes} turnaround
                      </span>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-right text-[0.8125rem] font-medium tabular">
                    {row.priceMinor === 0
                      ? "Free"
                      : formatMoneyShort(row.priceMinor, row.currency, locale)}
                  </Td>
                  <Td className="text-[0.8125rem] text-ink-muted">
                    {row.staffIds.length === 0
                      ? "None assigned"
                      : `${row.staffIds.length} assigned`}
                  </Td>
                  <Td className="text-[0.75rem] text-ink-muted">
                    {row.requirements.length === 0
                      ? "—"
                      : row.requirements
                          .map((r) => `${r.quantity}× ${r.resourceTag || r.resourceType.toLowerCase()}`)
                          .join(", ")}
                  </Td>
                  <Td>
                    <Badge tone={row.active ? "success" : "neutral"}>
                      {row.active ? "Bookable" : "Hidden"}
                    </Badge>
                  </Td>
                  <Td className="whitespace-nowrap text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(row)} aria-label={`Edit ${row.name}`}>
                      <Pencil aria-hidden className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDeleting(row);
                        setError(null);
                      }}
                      aria-label={`Remove ${row.name}`}
                    >
                      <Trash2 aria-hidden className="size-3.5 text-danger" />
                    </Button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}

      <Modal
        open={dialogOpen}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? "Edit treatment" : "Add treatment"}
        description="Patients see the name, description, duration and price exactly as entered."
        size="lg"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setCreating(false);
                setEditing(null);
              }}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button loading={pending} onClick={() => void save()}>
              {editing ? "Save changes" : "Add treatment"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <FormError>{error}</FormError>}

          <Field label="Treatment name" error={fieldErrors.name} required>
            {(props) => (
              <Input
                {...props}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                data-autofocus
              />
            )}
          </Field>

          <Field
            label="Description"
            hint="What the appointment involves. Avoid promises about results."
            error={fieldErrors.description}
          >
            {(props) => (
              <Textarea
                {...props}
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            )}
          </Field>

          <Field
            label="Before you book"
            hint="Preparation, aftercare or who this is not suitable for. Shown before booking."
            optional
          >
            {(props) => (
              <Textarea
                {...props}
                rows={2}
                value={form.importantInfo}
                onChange={(e) => setForm({ ...form, importantInfo: e.target.value })}
              />
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category">
              {(props) => (
                <Select
                  {...props}
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                >
                  <option value="">Uncategorised</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <Field label="Treatment type" hint="Medical types are never shown with promotional styling.">
              {(props) => (
                <Select
                  {...props}
                  value={form.serviceClass}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      serviceClass: e.target.value,
                      isMedicalAesthetic: e.target.value === "MEDICAL_AESTHETIC",
                    })
                  }
                >
                  <option value="WELLNESS">Wellness</option>
                  <option value="AESTHETIC">Aesthetic</option>
                  <option value="MEDICAL_AESTHETIC">Medical aesthetic</option>
                  <option value="MEDICAL">Medical</option>
                </Select>
              )}
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Duration (min)" error={fieldErrors.durationMinutes} required>
              {(props) => (
                <Input
                  {...props}
                  type="number"
                  min={5}
                  step={5}
                  value={form.durationMinutes}
                  onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
                />
              )}
            </Field>
            <Field label="Turnaround after (min)" hint="Cleaning and reset time.">
              {(props) => (
                <Input
                  {...props}
                  type="number"
                  min={0}
                  step={5}
                  value={form.bufferAfterMinutes}
                  onChange={(e) => setForm({ ...form, bufferAfterMinutes: e.target.value })}
                />
              )}
            </Field>
            <Field label="Price (฿)" error={fieldErrors.priceMinor} required>
              {(props) => (
                <Input
                  {...props}
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="0 for a free consultation"
                />
              )}
            </Field>
          </div>

          <fieldset className="rounded-md border border-line p-3.5">
            <legend className="px-1 text-[0.8125rem] font-medium text-navy-600">
              Who can perform this
            </legend>
            <p className="mb-2.5 text-[0.75rem] text-ink-muted">
              A time is only offered when one of these practitioners is free.
            </p>
            {staff.length === 0 ? (
              <p className="text-[0.8125rem] text-ink-muted">
                Add a practitioner first — no times can be offered without one.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {staff.map((member) => (
                  <Checkbox
                    key={member.id}
                    label={member.name}
                    description={member.role}
                    checked={form.staffIds.includes(member.id)}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        staffIds: e.target.checked
                          ? [...form.staffIds, member.id]
                          : form.staffIds.filter((id) => id !== member.id),
                      })
                    }
                  />
                ))}
              </div>
            )}
          </fieldset>

          <fieldset className="rounded-md border border-line p-3.5">
            <legend className="px-1 text-[0.8125rem] font-medium text-navy-600">
              Rooms and equipment needed
            </legend>
            <p className="mb-2.5 text-[0.75rem] text-ink-muted">
              A time is only offered when every item below has a free unit.
            </p>

            <div className="space-y-2">
              {form.requirements.map((requirement, index) => (
                <div key={index} className="flex flex-wrap items-end gap-2">
                  <label className="flex-1">
                    <span className="mb-1 block text-[0.6875rem] text-ink-muted">Type</span>
                    <Select
                      value={`${requirement.resourceType}:${requirement.resourceTag}`}
                      onChange={(e) => {
                        const [type, tag] = e.target.value.split(":");
                        const next = [...form.requirements];
                        next[index] = {
                          ...requirement,
                          resourceType: type as "ROOM" | "EQUIPMENT",
                          resourceTag: tag ?? "",
                        };
                        setForm({ ...form, requirements: next });
                      }}
                      className="h-9 text-[0.8125rem]"
                    >
                      <option value="ROOM:">Any room</option>
                      <option value="EQUIPMENT:">Any equipment</option>
                      {resourceTags.map((option) => (
                        <option key={`${option.type}:${option.tag}`} value={`${option.type}:${option.tag}`}>
                          {option.tag} ({option.count} available)
                        </option>
                      ))}
                    </Select>
                  </label>
                  <label className="w-24">
                    <span className="mb-1 block text-[0.6875rem] text-ink-muted">Quantity</span>
                    <Input
                      type="number"
                      min={1}
                      value={requirement.quantity}
                      onChange={(e) => {
                        const next = [...form.requirements];
                        next[index] = { ...requirement, quantity: e.target.value };
                        setForm({ ...form, requirements: next });
                      }}
                      className="h-9 text-[0.8125rem]"
                    />
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Remove requirement"
                    onClick={() =>
                      setForm({
                        ...form,
                        requirements: form.requirements.filter((_, i) => i !== index),
                      })
                    }
                  >
                    <Trash2 aria-hidden className="size-3.5 text-danger" />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              variant="secondary"
              size="sm"
              className="mt-2.5"
              onClick={() =>
                setForm({
                  ...form,
                  requirements: [
                    ...form.requirements,
                    { resourceType: "ROOM", resourceTag: "", quantity: "1" },
                  ],
                })
              }
            >
              <Plus aria-hidden className="size-3.5" />
              Add requirement
            </Button>
          </fieldset>

          <Checkbox
            label="Bookable"
            description="Uncheck to hide this treatment without deleting it."
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
          />
        </div>
      </Modal>

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Remove this treatment?"
        description={deleting?.name}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)} disabled={pending}>
              Keep it
            </Button>
            <Button variant="danger" loading={pending} onClick={() => void remove()}>
              Remove treatment
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {error && <FormError>{error}</FormError>}
          <p className="text-[0.8125rem] leading-relaxed text-ink-muted">
            {deleting && deleting.bookingCount > 0
              ? `This treatment has ${deleting.bookingCount} past ${deleting.bookingCount === 1 ? "appointment" : "appointments"}, so it will be hidden from patients rather than deleted. Your appointment history stays intact.`
              : "This treatment has no appointments, so it will be deleted."}
          </p>
        </div>
      </Modal>
    </>
  );
}
