import { config } from "@/lib/config";
import { create2C2PGateway, createOmiseGateway } from "@/lib/payments/adapters";
import type { PaymentGateway } from "@/lib/payments/gateway";
import { MockPaymentGateway } from "@/lib/payments/mock-gateway";

let instance: PaymentGateway | null = null;

/**
 * Single place that knows which gateway is live. Everything else depends on
 * the `PaymentGateway` interface.
 */
export function getPaymentGateway(): PaymentGateway {
  if (instance) return instance;

  switch (config.payments.provider) {
    case "omise":
      instance = createOmiseGateway({
        publicKey: process.env.PAYMENT_GATEWAY_KEY ?? "",
        secretKey: process.env.PAYMENT_GATEWAY_SECRET ?? "",
      });
      break;
    case "2c2p":
      instance = create2C2PGateway({
        merchantId: process.env.PAYMENT_GATEWAY_KEY ?? "",
        secretKey: process.env.PAYMENT_GATEWAY_SECRET ?? "",
      });
      break;
    default:
      instance = new MockPaymentGateway(config.payments.webhookSecret);
  }

  return instance;
}

export function isMockGateway(gateway: PaymentGateway): gateway is MockPaymentGateway {
  return gateway.name === "mock";
}

/** Test hook: lets a suite install a stub gateway. */
export function __setPaymentGateway(gateway: PaymentGateway | null): void {
  instance = gateway;
}
