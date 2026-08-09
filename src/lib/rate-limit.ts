// Minimal in-memory sliding-window rate limiter.
//
// Deliberately not backed by Redis/a DB table: this app is a single Node
// process today (local dev, and the near-term single-EC2 deploy target —
// see BACKLOG.md Part 3). A module-level Map is fine for that and adds
// zero infrastructure. It stops working correctly the moment there's more
// than one app replica (each instance would track its own counts,
// effectively multiplying the real limit by replica count) — revisit with
// a shared store (a Postgres table, since one already exists regardless of
// hosting choice, or Redis) if/when this app is ever horizontally scaled.
const requestLog = new Map<string, number[]>();

/**
 * Returns true if `key` is allowed another request right now, false if it's
 * currently rate-limited. Records the attempt either way isn't quite right —
 * only successful (allowed) checks record a new timestamp, so a limited
 * caller doesn't get to "use up" a slot it was denied.
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;

  const recent = (requestLog.get(key) ?? []).filter((ts) => ts > windowStart);

  if (recent.length >= maxRequests) {
    requestLog.set(key, recent);
    return false;
  }

  recent.push(now);
  requestLog.set(key, recent);
  return true;
}
