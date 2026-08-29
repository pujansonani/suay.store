import "server-only";

import type { NotificationChannel } from "@prisma/client";

import { config } from "@/lib/config";

export interface DeliveryRequest {
  channel: NotificationChannel;
  to: string | null;
  subject: string;
  body: string;
}

export interface DeliveryResult {
  skipped?: boolean;
  reason?: string;
  externalId?: string;
}

export interface NotificationTransport {
  readonly name: string;
  deliver(request: DeliveryRequest): Promise<DeliveryResult>;
}

/**
 * Development transport. Nothing leaves the machine: the attempt is logged and
 * the persisted `Notification` row is the record of what would have been sent.
 */
class MockTransport implements NotificationTransport {
  readonly name = "mock";

  async deliver(request: DeliveryRequest): Promise<DeliveryResult> {
    if (request.channel !== "IN_APP" && !request.to) {
      return { skipped: true, reason: "No destination address on file" };
    }
    if (process.env.NODE_ENV === "development") {
      console.info(
        `[notify:${request.channel}] -> ${request.to ?? "in-app"} :: ${request.subject}`,
      );
    }
    return { externalId: `mock_${Date.now()}` };
  }
}

let instance: NotificationTransport | null = null;

export function getTransport(): NotificationTransport {
  if (!instance) {
    // Real transports (LINE Messaging, an email provider) plug in here. The
    // rest of the application never learns which one is active.
    instance = new MockTransport();
    if (config.notifications.transport !== "mock" && process.env.NODE_ENV !== "test") {
      console.warn(
        `[notify] transport "${config.notifications.transport}" is not configured; using mock.`,
      );
    }
  }
  return instance;
}
