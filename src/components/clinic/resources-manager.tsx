"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { DoorOpen, Pencil, Plus, Trash2, Wrench } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormError, Input, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/states";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";

export interface ResourceRow {
  id: string;
  name: string;
  type: "ROOM" | "EQUIPMENT";
  tag: string | null;
  notes: string | null;
  active: boolean;
  usageCount: number;
}

interface FormState {
  name: string;
  type: "ROOM" | "EQUIPMENT";
  tag: string;
  notes: string;
  active: boolean;
}

const EMPTY: FormState = { name: "", type: "ROOM", tag: "", notes: "", active: true };

export function ResourcesManager({ resources }: { resources: ResourceRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<ResourceRow | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [deleting, setDeleting] = React.useState<ResourceRow | null>(null);
  const [form, setForm] = React.useState<FormState>(EMPTY);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const rooms = resources.filter((r) => r.type === "ROOM");
  const equipment = resources.filter((r) => r.type === "EQUIPMENT");

  function openCreate(type: "ROOM" | "EQUIPMENT") {
    setForm({ ...EMPTY, type });
    setError(null);
    setFieldErrors({});
    setCreating(true);
  }

  function openEdit(row: ResourceRow) {
    setForm({
      name: row.name,
      type: row.type,
      tag: row.tag ?? "",
      notes: row.notes ?? "",
      active: row.active,
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
        editing ? `/api/clinic/resources/${editing.id}` : "/api/clinic/resources",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "We could not save this.");
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
      const response = await fetch(`/api/clinic/resources/${deleting.id}`, { method: "DELETE" });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "We could not remove this.");
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

  function section(
    title: string,
    description: string,
    rows: ResourceRow[],
    type: "ROOM" | "EQUIPMENT",
    Icon: typeof DoorOpen,
  ) {
    return (
      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-[0.9375rem] font-semibold text-navy-600">
              <Icon aria-hidden className="size-4 text-ink-subtle" />
              {title}
            </h2>
            <p className="mt-0.5 text-[0.8125rem] text-ink-muted">{description}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => openCreate(type)}>
            <Plus aria-hidden className="size-3.5" />
            Add {type === "ROOM" ? "room" : "equipment"}
          </Button>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-lg border border-line bg-surface">
            <EmptyState
              icon={Icon}
              title={type === "ROOM" ? "No rooms yet" : "No equipment yet"}
              description={
                type === "ROOM"
                  ? "Add your treatment rooms so two appointments are never offered the same room."
                  : "Add lasers and devices so a treatment is only offered when its equipment is free."
              }
              className="py-10"
            />
          </div>
        ) : (
          <TableWrap>
            <Table className="min-w-[34rem]">
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Tag</Th>
                  <Th>Notes</Th>
                  <Th>Status</Th>
                  <Th><span className="sr-only">Actions</span></Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <Tr key={row.id}>
                    <Td className="text-[0.8125rem] font-medium">{row.name}</Td>
                    <Td>
                      {row.tag ? (
                        <code className="rounded-xs bg-surface-muted px-1.5 py-0.5 text-[0.75rem] text-ink-muted">
                          {row.tag}
                        </code>
                      ) : (
                        <span className="text-[0.8125rem] text-ink-subtle">—</span>
                      )}
                    </Td>
                    <Td className="max-w-xs truncate text-[0.8125rem] text-ink-muted">
                      {row.notes ?? "—"}
                    </Td>
                    <Td>
                      <Badge tone={row.active ? "success" : "neutral"}>
                        {row.active ? "In use" : "Out of service"}
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
      </section>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {section(
          "Treatment rooms",
          "Each room is one unit of capacity. Two appointments can never hold the same room at the same time.",
          rooms,
          "ROOM",
          DoorOpen,
        )}
        {section(
          "Equipment",
          "Lasers and devices are booked alongside the practitioner and the room.",
          equipment,
          "EQUIPMENT",
          Wrench,
        )}
      </div>

      <Modal
        open={creating || editing !== null}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? "Edit" : form.type === "ROOM" ? "Add room" : "Add equipment"}
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
              {editing ? "Save changes" : "Add"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <FormError>{error}</FormError>}

          <Field label="Name" error={fieldErrors.name} required>
            {(props) => (
              <Input
                {...props}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={form.type === "ROOM" ? "Treatment Room 2" : "Diode Laser Unit A"}
                data-autofocus
              />
            )}
          </Field>

          <Field label="Type" required>
            {(props) => (
              <Select
                {...props}
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as "ROOM" | "EQUIPMENT" })}
              >
                <option value="ROOM">Room</option>
                <option value="EQUIPMENT">Equipment</option>
              </Select>
            )}
          </Field>

          <Field
            label="Tag"
            hint="A short label treatments can require, e.g. laser, treatment, infusion-chair. Units sharing a tag are interchangeable."
            optional
          >
            {(props) => (
              <Input
                {...props}
                value={form.tag}
                onChange={(e) => setForm({ ...form, tag: e.target.value })}
                placeholder="laser"
              />
            )}
          </Field>

          <Field label="Notes" hint="Visible to your team only." optional>
            {(props) => (
              <Textarea
                {...props}
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            )}
          </Field>

          <Checkbox
            label="In use"
            description="Uncheck while a room or device is out of service. It stops being offered immediately."
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
          />
        </div>
      </Modal>

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Remove this?"
        description={deleting?.name}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)} disabled={pending}>
              Keep it
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
            {deleting && deleting.usageCount > 0
              ? "This has been used by past appointments, so it will be marked out of service rather than deleted."
              : "This has never been used, so it will be deleted."}
          </p>
        </div>
      </Modal>
    </>
  );
}
