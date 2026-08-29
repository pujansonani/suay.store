"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Pencil, Plus, Trash2, UserSquare2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormError, Input, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/states";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";

export interface PractitionerRow {
  id: string;
  name: string;
  role: string;
  bio: string | null;
  credentials: string[];
  qualifications: string[];
  specializations: string[];
  languages: string[];
  yearsExperience: number | null;
  verified: boolean;
  active: boolean;
  serviceIds: string[];
  bookingCount: number;
}

interface FormState {
  name: string;
  role: string;
  bio: string;
  credentials: string;
  qualifications: string;
  specializations: string;
  languages: string;
  yearsExperience: string;
  active: boolean;
  serviceIds: string[];
}

const EMPTY: FormState = {
  name: "",
  role: "",
  bio: "",
  credentials: "",
  qualifications: "",
  specializations: "",
  languages: "",
  yearsExperience: "",
  active: true,
  serviceIds: [],
};

const toList = (value: string) =>
  value
    .split(/[,\n]/)
    .map((v) => v.trim())
    .filter(Boolean);

export function PractitionersManager({
  practitioners,
  services,
}: {
  practitioners: PractitionerRow[];
  services: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<PractitionerRow | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [deleting, setDeleting] = React.useState<PractitionerRow | null>(null);
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

  function openEdit(row: PractitionerRow) {
    setForm({
      name: row.name,
      role: row.role,
      bio: row.bio ?? "",
      credentials: row.credentials.join("\n"),
      qualifications: row.qualifications.join("\n"),
      specializations: row.specializations.join(", "),
      languages: row.languages.join(", "),
      yearsExperience: row.yearsExperience === null ? "" : String(row.yearsExperience),
      active: row.active,
      serviceIds: row.serviceIds,
    });
    setError(null);
    setFieldErrors({});
    setEditing(row);
  }

  async function save() {
    setPending(true);
    setError(null);
    setFieldErrors({});

    try {
      const response = await fetch(
        editing ? `/api/clinic/staff/${editing.id}` : "/api/clinic/staff",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            role: form.role,
            bio: form.bio,
            credentials: toList(form.credentials),
            qualifications: toList(form.qualifications),
            specializations: toList(form.specializations),
            languages: toList(form.languages),
            yearsExperience: form.yearsExperience ? Number(form.yearsExperience) : null,
            active: form.active,
            serviceIds: form.serviceIds,
          }),
        },
      );
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "We could not save this practitioner.");
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
      const response = await fetch(`/api/clinic/staff/${deleting.id}`, { method: "DELETE" });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "We could not remove this practitioner.");
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

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus aria-hidden className="size-3.5" />
          Add practitioner
        </Button>
      </div>

      {practitioners.length === 0 ? (
        <div className="rounded-lg border border-line bg-surface">
          <EmptyState
            icon={UserSquare2}
            title="No practitioners yet"
            description="Availability cannot be generated until at least one practitioner is on the rota."
            action={<Button onClick={openCreate}>Add your first practitioner</Button>}
          />
        </div>
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Role</Th>
                <Th>Focus</Th>
                <Th>Languages</Th>
                <Th className="text-right">Experience</Th>
                <Th>Treatments</Th>
                <Th>Status</Th>
                <Th><span className="sr-only">Actions</span></Th>
              </tr>
            </thead>
            <tbody>
              {practitioners.map((row) => (
                <Tr key={row.id}>
                  <Td>
                    <span className="flex items-center gap-1.5 text-[0.8125rem] font-medium">
                      {row.name}
                      {row.verified && (
                        <BadgeCheck aria-label="Verified by Suay" className="size-3.5 text-teal-500" />
                      )}
                    </span>
                  </Td>
                  <Td className="text-[0.8125rem] text-ink-muted">{row.role}</Td>
                  <Td className="text-[0.8125rem] text-ink-muted">
                    {row.specializations.join(", ") || "—"}
                  </Td>
                  <Td className="text-[0.8125rem] text-ink-muted">
                    {row.languages.join(", ") || "—"}
                  </Td>
                  <Td className="whitespace-nowrap text-right text-[0.8125rem] tabular">
                    {row.yearsExperience === null ? "—" : `${row.yearsExperience} yrs`}
                  </Td>
                  <Td className="text-[0.8125rem] text-ink-muted">{row.serviceIds.length}</Td>
                  <Td>
                    <Badge tone={row.active ? "success" : "neutral"}>
                      {row.active ? "On rota" : "Off rota"}
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
        open={creating || editing !== null}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? "Edit practitioner" : "Add practitioner"}
        description="These details appear on your public profile. Enter only what you can support."
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
              {editing ? "Save changes" : "Add practitioner"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <FormError>{error}</FormError>}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" error={fieldErrors.name} required>
              {(props) => (
                <Input
                  {...props}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  data-autofocus
                />
              )}
            </Field>
            <Field label="Role" hint="e.g. Dermatologist, Aesthetician" error={fieldErrors.role} required>
              {(props) => (
                <Input
                  {...props}
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                />
              )}
            </Field>
          </div>

          <Field label="Short biography" optional>
            {(props) => (
              <Textarea
                {...props}
                rows={2}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
              />
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Areas of focus" hint="Comma separated." optional>
              {(props) => (
                <Input
                  {...props}
                  value={form.specializations}
                  onChange={(e) => setForm({ ...form, specializations: e.target.value })}
                  placeholder="Acne, Pigmentation"
                />
              )}
            </Field>
            <Field label="Languages" hint="Comma separated." optional>
              {(props) => (
                <Input
                  {...props}
                  value={form.languages}
                  onChange={(e) => setForm({ ...form, languages: e.target.value })}
                  placeholder="Thai, English"
                />
              )}
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Qualifications" hint="One per line." optional>
              {(props) => (
                <Textarea
                  {...props}
                  rows={2}
                  value={form.qualifications}
                  onChange={(e) => setForm({ ...form, qualifications: e.target.value })}
                />
              )}
            </Field>
            <Field
              label="Registrations"
              hint="One per line. Suay checks these during verification."
              optional
            >
              {(props) => (
                <Textarea
                  {...props}
                  rows={2}
                  value={form.credentials}
                  onChange={(e) => setForm({ ...form, credentials: e.target.value })}
                />
              )}
            </Field>
          </div>

          <Field label="Years of experience" optional>
            {(props) => (
              <Input
                {...props}
                type="number"
                min={0}
                max={70}
                value={form.yearsExperience}
                onChange={(e) => setForm({ ...form, yearsExperience: e.target.value })}
                className="max-w-32"
              />
            )}
          </Field>

          <fieldset className="rounded-md border border-line p-3.5">
            <legend className="px-1 text-[0.8125rem] font-medium text-navy-600">
              Treatments they perform
            </legend>
            {services.length === 0 ? (
              <p className="text-[0.8125rem] text-ink-muted">Add a treatment first.</p>
            ) : (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {services.map((service) => (
                  <Checkbox
                    key={service.id}
                    label={service.name}
                    checked={form.serviceIds.includes(service.id)}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        serviceIds: e.target.checked
                          ? [...form.serviceIds, service.id]
                          : form.serviceIds.filter((id) => id !== service.id),
                      })
                    }
                  />
                ))}
              </div>
            )}
          </fieldset>

          <Checkbox
            label="On the rota"
            description="Uncheck when someone is on extended leave. Their past appointments are kept."
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
          />

          <p className="rounded-md border border-line bg-surface-muted/60 px-3 py-2.5 text-[0.75rem] leading-relaxed text-ink-muted">
            The verified mark next to a practitioner is applied by Suay after review — a clinic
            cannot set it. That is what makes it worth something to patients.
          </p>
        </div>
      </Modal>

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Remove this practitioner?"
        description={deleting?.name}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)} disabled={pending}>
              Keep them
            </Button>
            <Button variant="danger" loading={pending} onClick={() => void remove()}>
              Remove
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {error && <FormError>{error}</FormError>}
          <p className="text-[0.8125rem] leading-relaxed text-ink-muted">
            {deleting && deleting.bookingCount > 0
              ? `${deleting.name} appears on ${deleting.bookingCount} past ${deleting.bookingCount === 1 ? "appointment" : "appointments"}, so they will be taken off the rota rather than deleted. Your records stay intact.`
              : "This practitioner has no appointments, so the record will be deleted."}
          </p>
        </div>
      </Modal>
    </>
  );
}
