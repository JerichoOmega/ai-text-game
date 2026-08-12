import { randomUUID } from "node:crypto";

/** Opaque per-request id used to correlate a request across logs and its
 *  response. Not sensitive, safe to return to the client. */
export function newCorrelationId(): string {
  return `gw_${randomUUID()}`;
}
