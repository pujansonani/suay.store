/**
 * Tests run against a real PostgreSQL database, not a mock.
 *
 * The booking engine's central guarantee is a PostgreSQL exclusion
 * constraint; a mocked data layer would test the wrong thing entirely.
 * TEST_DATABASE_URL points at a separate database that these suites own and
 * truncate between files.
 */
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://suay:suay@127.0.0.1:5432/suay_test?schema=public";

// Vitest sets NODE_ENV=test itself.
process.env.AUTH_SECRET =
  process.env.AUTH_SECRET ?? "test-only-secret-value-that-is-long-enough-0123456789";
process.env.PAYMENT_GATEWAY_PROVIDER = "mock";
process.env.PAYMENT_WEBHOOK_SECRET = "test-webhook-secret";
process.env.NOTIFICATION_TRANSPORT = "mock";
process.env.PLATFORM_TIMEZONE = "Asia/Bangkok";
