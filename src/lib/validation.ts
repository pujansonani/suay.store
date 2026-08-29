import { z } from "zod";

/** Shared input schemas. Every route handler validates before it touches data. */

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .email("Enter a valid email address.")
  .max(254)
  .toLowerCase();

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(200)
  .refine((v) => /[a-zA-Z]/.test(v) && /[0-9]/.test(v), {
    message: "Include at least one letter and one number.",
  });

export const nameSchema = z.string().trim().min(2, "Enter your name.").max(120);
export const phoneSchema = z
  .string()
  .trim()
  .min(6, "Enter a valid phone number.")
  .max(32)
  .regex(/^[+\d][\d\s()-]*$/, "Enter a valid phone number.");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
});

export const customerRegisterSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  phone: phoneSchema.optional().or(z.literal("")),
});

export const clinicRegisterSchema = z.object({
  contactName: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  clinicName: z.string().trim().min(2, "Enter the clinic name.").max(160),
  phone: phoneSchema,
});

export const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a date in YYYY-MM-DD format.");

export const availabilityQuerySchema = z.object({
  serviceId: z.string().min(1),
  from: dateKeySchema,
  to: dateKeySchema.optional(),
  staffId: z.string().optional(),
});

export const createBookingSchema = z.object({
  providerId: z.string().min(1),
  serviceId: z.string().min(1),
  startAt: z.string().datetime({ message: "Expected an ISO timestamp." }),
  staffId: z.string().optional().nullable(),
  customerName: nameSchema,
  customerEmail: emailSchema.optional(),
  customerPhone: phoneSchema.optional().or(z.literal("")),
  customerNote: z.string().trim().max(1000).optional().or(z.literal("")),
  landingPath: z.string().max(255).optional(),
});

export const startPaymentSchema = z.object({
  bookingId: z.string().min(1),
  method: z.enum(["CARD", "PROMPTPAY"]),
  simulate: z.enum(["success", "decline", "pending"]).optional(),
});

export const cancelBookingSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export const rescheduleSchema = z.object({
  startAt: z.string().datetime(),
  staffId: z.string().optional().nullable(),
});

export const reviewSchema = z.object({
  bookingId: z.string().min(1),
  rating: z.number().int().min(1, "Choose a rating.").max(5),
  comment: z.string().trim().max(2000).optional().or(z.literal("")),
});

// --- Clinic portal ---------------------------------------------------------

export const serviceSchema = z.object({
  name: z.string().trim().min(2, "Enter a treatment name.").max(160),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
  importantInfo: z.string().trim().max(4000).optional().or(z.literal("")),
  categoryId: z.string().optional().nullable(),
  serviceClass: z.enum(["WELLNESS", "AESTHETIC", "MEDICAL_AESTHETIC", "MEDICAL"]),
  isMedicalAesthetic: z.boolean().default(false),
  durationMinutes: z.coerce.number().int().min(5, "Minimum 5 minutes.").max(600),
  bufferBeforeMinutes: z.coerce.number().int().min(0).max(120).default(0),
  bufferAfterMinutes: z.coerce.number().int().min(0).max(120).default(10),
  priceMinor: z.coerce.number().int().min(0, "Price cannot be negative.").max(100_000_000),
  requiresStaff: z.boolean().default(true),
  active: z.boolean().default(true),
  staffIds: z.array(z.string()).default([]),
  requirements: z
    .array(
      z.object({
        resourceType: z.enum(["ROOM", "EQUIPMENT"]),
        resourceTag: z.string().trim().max(64).optional().nullable(),
        quantity: z.coerce.number().int().min(1).max(10).default(1),
      }),
    )
    .default([]),
});

export const staffSchema = z.object({
  name: nameSchema,
  role: z.string().trim().min(2, "Enter a role.").max(80),
  bio: z.string().trim().max(2000).optional().or(z.literal("")),
  credentials: z.array(z.string().trim().max(160)).max(20).default([]),
  qualifications: z.array(z.string().trim().max(160)).max(20).default([]),
  specializations: z.array(z.string().trim().max(80)).max(20).default([]),
  languages: z.array(z.string().trim().max(40)).max(10).default([]),
  yearsExperience: z.coerce.number().int().min(0).max(70).optional().nullable(),
  active: z.boolean().default(true),
  serviceIds: z.array(z.string()).default([]),
});

export const resourceSchema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(120),
  type: z.enum(["ROOM", "EQUIPMENT"]),
  tag: z.string().trim().max(64).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  active: z.boolean().default(true),
});

export const scheduleRuleSchema = z.object({
  rules: z
    .array(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        startMinute: z.number().int().min(0).max(1440),
        endMinute: z.number().int().min(0).max(1440),
        staffId: z.string().optional().nullable(),
      }),
    )
    .max(100),
});

export const scheduleExceptionSchema = z.object({
  date: dateKeySchema,
  type: z.enum(["CLOSED", "MODIFIED_HOURS", "TIME_OFF"]),
  startMinute: z.number().int().min(0).max(1440).optional().nullable(),
  endMinute: z.number().int().min(0).max(1440).optional().nullable(),
  staffId: z.string().optional().nullable(),
  reason: z.string().trim().max(200).optional().or(z.literal("")),
});

export const clinicProfileSchema = z.object({
  name: z.string().trim().min(2).max(160),
  legalName: z.string().trim().max(200).optional().or(z.literal("")),
  specialty: z.string().trim().max(120).optional().or(z.literal("")),
  tagline: z.string().trim().max(200).optional().or(z.literal("")),
  description: z.string().trim().max(6000).optional().or(z.literal("")),
  email: emailSchema.optional().or(z.literal("")),
  phone: z.string().trim().max(32).optional().or(z.literal("")),
  website: z.string().trim().max(200).optional().or(z.literal("")),
  lineId: z.string().trim().max(80).optional().or(z.literal("")),
  addressLine1: z.string().trim().max(200).optional().or(z.literal("")),
  district: z.string().trim().max(80).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  postalCode: z.string().trim().max(20).optional().or(z.literal("")),
  cancellationPolicy: z.string().trim().max(4000).optional().or(z.literal("")),
  bookingPolicy: z.string().trim().max(4000).optional().or(z.literal("")),
  cancellationWindowHours: z.coerce.number().int().min(0).max(168).optional().nullable(),
});

export const verificationSchema = z.object({
  businessRegistrationNo: z.string().trim().max(80).optional().or(z.literal("")),
  taxId: z.string().trim().max(80).optional().or(z.literal("")),
  medicalLicenseNo: z.string().trim().max(80).optional().or(z.literal("")),
  licenceAuthority: z.string().trim().max(160).optional().or(z.literal("")),
  contactPersonName: z.string().trim().max(120).optional().or(z.literal("")),
  contactPersonRole: z.string().trim().max(120).optional().or(z.literal("")),
  contactPersonPhone: z.string().trim().max(32).optional().or(z.literal("")),
  contactPersonEmail: emailSchema.optional().or(z.literal("")),
  documentRefs: z.array(z.string().trim().max(200)).max(20).default([]),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

// --- Admin -----------------------------------------------------------------

export const adminDecisionSchema = z.object({
  note: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const adminSuspendSchema = z.object({
  reason: z.string().trim().min(3, "Give a reason — it is recorded in the audit log.").max(2000),
});

export const providerManualBookingSchema = z.object({
  serviceId: z.string().min(1),
  startAt: z.string().datetime(),
  staffId: z.string().optional().nullable(),
  customerName: nameSchema,
  customerEmail: emailSchema.optional().or(z.literal("")),
  customerPhone: phoneSchema.optional().or(z.literal("")),
  customerNote: z.string().trim().max(1000).optional().or(z.literal("")),
  channel: z.enum(["PROVIDER_MANUAL", "WALK_IN", "PHONE", "LINE"]).default("PROVIDER_MANUAL"),
});
