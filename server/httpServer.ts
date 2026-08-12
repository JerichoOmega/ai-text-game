import http from "node:http";
import { handleGatewayRequest, type GatewayDeps } from "./gateway";

/**
 * Thin transport wrapper around the pure gateway handler. All security logic
 * lives in handleGatewayRequest; this only reads the POST body (with a hard
 * transport-level size guard), normalizes headers, and writes the JSON result.
 * Route: POST /gm.
 */
export function createGatewayServer(deps: GatewayDeps): http.Server {
  const hardLimit = deps.config.maxRequestBytes * 2;

  return http.createServer((req, res) => {
    if (req.method !== "POST" || req.url !== "/gm") {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, reason: "not_found" }));
      return;
    }

    const chunks: Buffer[] = [];
    let size = 0;
    let aborted = false;

    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > hardLimit) {
        aborted = true;
        res.writeHead(413, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, reason: "invalid_request", detail: "request too large" }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", async () => {
      if (aborted) return;
      const body = Buffer.concat(chunks).toString("utf8");
      const headers: Record<string, string | undefined> = {};
      for (const [k, v] of Object.entries(req.headers)) headers[k.toLowerCase()] = Array.isArray(v) ? v[0] : v;

      const result = await handleGatewayRequest(body, headers, deps);
      res.writeHead(result.status, {
        "Content-Type": "application/json",
        "x-correlation-id": result.body.correlationId,
      });
      res.end(JSON.stringify(result.body));
    });
  });
}
