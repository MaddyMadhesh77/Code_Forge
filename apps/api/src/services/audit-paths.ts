import path from "node:path";

import { BadRequestError } from "../common/errors/app-error.js";

/**
 * Tenant identifiers are used to build a filename, so they are restricted to a
 * conservative character set. This rejects `..`, `/`, `\`, NUL bytes, absolute
 * paths, and URL-encoded variants before they ever reach the filesystem.
 */
const TENANT_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/;

export function isValidTenantId(tenant: unknown): tenant is string {
  return typeof tenant === "string" && TENANT_PATTERN.test(tenant);
}

/** Normalises a tenant id or throws a 400. */
export function assertValidTenantId(tenant: unknown): string {
  // Decode first: a caller sending `%2e%2e%2f` must be rejected, not accepted
  // because the raw string happened to look clean.
  let candidate = typeof tenant === "string" ? tenant : "";

  try {
    candidate = decodeURIComponent(candidate);
  } catch {
    throw new BadRequestError("Invalid tenant identifier", undefined, "INVALID_TENANT");
  }

  if (!isValidTenantId(candidate)) {
    throw new BadRequestError(
      "Tenant identifier must be 1-64 characters of [A-Za-z0-9_-] starting alphanumeric",
      undefined,
      "INVALID_TENANT",
    );
  }

  return candidate;
}

/**
 * Resolves the audit log path for a tenant.
 *
 * Two independent defences: the tenant id is validated against an allowlist
 * pattern, and the resolved path is then verified to sit inside `baseDir`. The
 * containment check is what catches anything the pattern might miss — this
 * endpoint previously allowed `/operator/audit/../../etc/passwd`.
 */
export function resolveAuditLogPath(baseDir: string, tenant: unknown): string {
  const safeTenant = assertValidTenantId(tenant);
  const root = path.resolve(baseDir);
  const resolved = path.resolve(root, `${safeTenant}.log`);

  // `path.relative` gives '..'-prefixed output when the target escapes root.
  const relative = path.relative(root, resolved);

  if (relative.startsWith("..") || path.isAbsolute(relative) || relative.includes(path.sep)) {
    throw new BadRequestError("Invalid tenant identifier", undefined, "INVALID_TENANT");
  }

  return resolved;
}
