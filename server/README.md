# Chronicle AI Gateway (server/)

A **separate** server application that is the ONLY place a privileged AI
provider key could ever live. The Expo client never holds a provider key; it
talks to this gateway over HTTPS through the shared wire contract in
`src/systems/ai/gateway/GatewayContract.ts`.

```
Expo client -> RemoteProvider -> (HTTPS) -> AI Gateway -> provider adapter -> model
```

## Status (Phase 3C-3)
A real external-AI adapter now exists behind the gateway, but it stays **OFF by
default**. Provider selection is server-side via `createProvider(config)`:

- `AI_PROVIDER_MODE=null` (default) → `NullGatewayProvider` → `unconfigured`, deterministic game.
- `AI_PROVIDER_MODE=real` **and** `AI_PROVIDER_API_KEY` present → `OpenAIGatewayProvider`.
  Without a key, `real` safely falls back to `null`.
- `AI_PROVIDER_MODE=mock` → development echo only.

The Expo client never chooses the provider and never holds a key. **No API key
is present or committed.**

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
key would be provided at runtime via `AI_PROVIDER_API_KEY` (never committed) and
consumed only by the server-side `OpenAIGatewayProvider` adapter.

Real-provider variables (all server-side; never exposed to the client):

- `AI_PROVIDER_MODE` — `null` (default) | `mock` | `real`
- `AI_PROVIDER_API_KEY` — secret; leave empty; supplied only at runtime
- `AI_PROVIDER_MODEL` — non-secret model id (default `gpt-4o-mini`)
- `AI_PROVIDER_BASE_URL` — non-secret base url (default `https://api.openai.com/v1`)

The adapter reads the key only from the server env, sends it solely in the
outbound `Authorization` header, and never logs or surfaces it in errors.

## Run (optional)
```
npx tsx server/index.ts
```
