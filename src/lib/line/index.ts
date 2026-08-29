import { randomUUID } from "node:crypto";

import { config } from "@/lib/config";

/**
 * LINE integration boundary.
 *
 * LINE Login, LIFF and Messaging are the expected channels for a Thai
 * consumer product, but requiring real channel credentials to run the project
 * locally would be a poor trade. These interfaces fix the shape; the mock
 * implementation satisfies them without any credentials.
 */

export interface LineProfile {
  lineUserId: string;
  displayName: string;
  pictureUrl?: string;
  email?: string;
}

export interface LineLoginAdapter {
  readonly mode: "mock" | "live";
  /** URL the browser is sent to in order to start the login. */
  authorizationUrl(state: string, redirectUri: string): string;
  /** Exchange the authorization code for a profile. */
  exchange(code: string): Promise<LineProfile>;
}

export interface LineMessagingAdapter {
  readonly mode: "mock" | "live";
  push(lineUserId: string, text: string): Promise<{ delivered: boolean; reason?: string }>;
}

class MockLineLogin implements LineLoginAdapter {
  readonly mode = "mock";

  authorizationUrl(state: string, redirectUri: string): string {
    // Stays inside the app: a local screen stands in for LINE's consent page.
    const params = new URLSearchParams({ state, redirect_uri: redirectUri });
    return `/auth/line/mock?${params.toString()}`;
  }

  async exchange(code: string): Promise<LineProfile> {
    // The mock consent screen passes a demo identity through as the code.
    const [name, email] = Buffer.from(code, "base64url").toString("utf8").split("|");
    return {
      lineUserId: `Umock${randomUUID().replace(/-/g, "").slice(0, 26)}`,
      displayName: name || "LINE user",
      email: email || undefined,
    };
  }
}

class MockLineMessaging implements LineMessagingAdapter {
  readonly mode = "mock";

  async push(lineUserId: string, text: string) {
    if (process.env.NODE_ENV === "development") {
      console.info(`[line:push] ${lineUserId} :: ${text.slice(0, 80)}`);
    }
    return { delivered: true };
  }
}

export function getLineLogin(): LineLoginAdapter {
  // A live adapter is constructed here once LINE_CHANNEL_ID/SECRET are set.
  return new MockLineLogin();
}

export function getLineMessaging(): LineMessagingAdapter {
  return new MockLineMessaging();
}

export function isLineMocked(): boolean {
  return config.line.mode !== "live" || !config.line.channelId;
}

/** Encodes a demo identity into the value the mock consent screen returns. */
export function encodeMockLineCode(name: string, email: string): string {
  return Buffer.from(`${name}|${email}`, "utf8").toString("base64url");
}
