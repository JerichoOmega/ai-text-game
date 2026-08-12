/**
 * In-memory rate/cost-control hook. This is the abstraction the gateway calls
 * on every request; production billing/quota infrastructure would replace the
 * storage behind it without changing callers. Limits are configurable and
 * enforced per session id.
 */
export interface RateLimitConfig {
  windowMs: number;
  maxRequestsPerWindow: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reason?: string;
}

export class RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly cfg: RateLimitConfig) {}

  check(sessionId: string, now: number): RateLimitResult {
    const recent = (this.hits.get(sessionId) ?? []).filter((t) => now - t < this.cfg.windowMs);
    if (recent.length >= this.cfg.maxRequestsPerWindow) {
      this.hits.set(sessionId, recent);
      return { allowed: false, remaining: 0, reason: "rate limit exceeded" };
    }
    recent.push(now);
    this.hits.set(sessionId, recent);
    return { allowed: true, remaining: this.cfg.maxRequestsPerWindow - recent.length };
  }

  reset(): void {
    this.hits.clear();
  }
}
