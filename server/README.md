# Chronicle AI Gateway (server/)

A **separate** server application that is the ONLY place a privileged AI
provider key could ever live. The Expo client never holds a provider key; it
talks to this gateway over HTTPS through the shared wire contract in
`src/systems/ai/gateway/GatewayContract.ts`.

```
Expo client -> RemoteProvider -> (HTTPS) -> AI Gateway -> provider adapter -> model
```

## Status (Phase 3C-1)
Infrastructure only. No real provider is wired: the gateway uses
`NullGatewayProvider`, so every request returns `unconfigured` and the client
falls back to deterministic gameplay. **No API key is present or committed.**

## Security pipeline (server/gateway.ts)
`auth -> rate limit -> request validation -> prompt serialize -> provider (hard deadline) -> output validation -> response`

- **Auth**: public client id + opaque session id (non-secret prototype scheme).
- **Request validation**: accepts only the bounded `GmContext` DTO, rejects raw
  WorldState, enforces max serialized size and per-string length, checks schema.
- **Prompt serialization**: server-side only, versioned, system instructions
  kept separate from game context; never emits raw WorldState.
- **Output validation**: strict runtime checks for NarrationOutput /
  DialogueOutput / GmProposalBatch (string limits, proposal limits, allowed
  kinds, entity allow-list); malformed output is rejected, never passed through.
- **Timeout**: hard `AbortController` deadline; timeouts/failures map into the
  client's `GmResult` fallback model.
- **Rate/cost hooks**: configurable per-session limits + max context/output size.
- **Correlation id**: on every response and log line. Secrets/payloads are
  never logged.

## Configuration
See `.env.example`. All values are non-secret prototype defaults. A real model
key would be provided at runtime via `PROVIDER_API_KEY` (never committed) and
consumed only by a future concrete `GatewayProvider` adapter.

## Run (optional)
```
npx tsx server/index.ts
```
