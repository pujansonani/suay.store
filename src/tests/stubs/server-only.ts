/**
 * `server-only` is a build-time guard that stops server modules being pulled
 * into a client bundle. Under Vitest there is no client bundle, so it is
 * aliased to this empty module.
 */
export {};
