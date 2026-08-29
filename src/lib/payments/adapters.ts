import type { PaymentGateway } from "@/lib/payments/gateway";

/**
 * Placeholders for the Thai gateways this platform is expected to use.
 *
 * They exist so the shape of a real integration is fixed now: construct with
 * credentials, implement the same interface, register in `registry.ts`. They
 * deliberately fail loudly rather than silently pretending to take money.
 */
function notConfigured(name: string): never {
  throw new Error(
    `The ${name} payment gateway is not configured in this build. Set PAYMENT_GATEWAY_PROVIDER=mock for local development.`,
  );
}

export function createOmiseGateway(_credentials: {
  publicKey: string;
  secretKey: string;
}): PaymentGateway {
  return notConfigured("Omise");
}

export function create2C2PGateway(_credentials: {
  merchantId: string;
  secretKey: string;
}): PaymentGateway {
  return notConfigured("2C2P");
}
