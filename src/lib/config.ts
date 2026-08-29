import { prisma } from "@/lib/db";

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Values read from the environment at startup. Commercial policy lives in
 * `PlatformSetting` instead (see `getPolicy`) so it can change without a
 * deploy — the environment only supplies the defaults.
 */
export const config = {
  timezone: process.env.PLATFORM_TIMEZONE ?? "Asia/Bangkok",
  currency: process.env.PLATFORM_CURRENCY ?? "THB",
  demoMode: process.env.NEXT_PUBLIC_DEMO_MODE !== "false",

  session: {
    cookieName: "suay_session",
    ttlSeconds: num(process.env.AUTH_SESSION_TTL_SECONDS, 60 * 60 * 24 * 7),
  },

  booking: {
    holdMinutes: num(process.env.BOOKING_HOLD_MINUTES, 10),
    slotIntervalMinutes: num(process.env.BOOKING_SLOT_INTERVAL_MINUTES, 15),
    maxAdvanceDays: num(process.env.BOOKING_MAX_ADVANCE_DAYS, 60),
    minNoticeMinutes: num(process.env.BOOKING_MIN_NOTICE_MINUTES, 60),
  },

  payments: {
    provider: process.env.PAYMENT_GATEWAY_PROVIDER ?? "mock",
    webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET ?? "dev-webhook-secret",
  },

  line: {
    mode: process.env.LINE_LOGIN_MODE ?? "mock",
    channelId: process.env.LINE_CHANNEL_ID ?? "",
    liffId: process.env.LINE_LIFF_ID ?? "",
  },

  notifications: {
    transport: process.env.NOTIFICATION_TRANSPORT ?? "mock",
    emailFrom: process.env.EMAIL_FROM ?? "no-reply@suay.store",
  },
} as const;

/**
 * Commercial policy. Defaults come from the environment; a platform admin can
 * override any of them at runtime through Settings, which writes to
 * `PlatformSetting`. Nothing in the booking or payment code hard-codes these.
 */
export interface PlatformPolicy {
  commissionBps: number;
  depositPercent: number;
  cancellationFreeHours: number;
  cancellationLateFeePercent: number;
  holdMinutes: number;
  slotIntervalMinutes: number;
  maxAdvanceDays: number;
  minNoticeMinutes: number;
  allowCustomerReschedule: boolean;
  rescheduleFreeHours: number;
  maxReschedulesPerBooking: number;
}

export const POLICY_SETTING_KEY = "platform.policy";

export const defaultPolicy: PlatformPolicy = {
  commissionBps: num(process.env.PLATFORM_COMMISSION_BPS, 1200),
  depositPercent: num(process.env.BOOKING_DEPOSIT_PERCENT, 100),
  cancellationFreeHours: num(process.env.CANCELLATION_FREE_HOURS, 24),
  cancellationLateFeePercent: num(process.env.CANCELLATION_LATE_FEE_PERCENT, 50),
  holdMinutes: config.booking.holdMinutes,
  slotIntervalMinutes: config.booking.slotIntervalMinutes,
  maxAdvanceDays: config.booking.maxAdvanceDays,
  minNoticeMinutes: config.booking.minNoticeMinutes,
  allowCustomerReschedule: true,
  rescheduleFreeHours: 24,
  maxReschedulesPerBooking: 2,
};

export async function getPolicy(): Promise<PlatformPolicy> {
  const row = await prisma.platformSetting.findUnique({ where: { key: POLICY_SETTING_KEY } });
  if (!row) return defaultPolicy;
  return { ...defaultPolicy, ...(row.value as Partial<PlatformPolicy>) };
}

export async function setPolicy(
  patch: Partial<PlatformPolicy>,
  updatedById?: string,
): Promise<PlatformPolicy> {
  const current = await getPolicy();
  const next = { ...current, ...patch };
  await prisma.platformSetting.upsert({
    where: { key: POLICY_SETTING_KEY },
    create: {
      key: POLICY_SETTING_KEY,
      value: next,
      description: "Commission, deposit, cancellation and booking-window policy.",
      updatedById,
    },
    update: { value: next, updatedById },
  });
  return next;
}
