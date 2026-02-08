# Carrier Integration Service

A minimal TypeScript service for fetching shipping rate quotes from carriers. It uses a **carrier-agnostic domain model** and **pluggable carrier implementations**, so you can add new carriers without changing call-site code.

## Project purpose

- **Single interface** for rate quotes: callers pass a `RateRequest` (origin, destination, packages) and receive normalized `RateQuote[]` (service name, price, optional delivery days).
- **Carrier-specific logic is isolated**: request building, response parsing, and auth live in per-carrier modules (e.g. `src/carriers/ups/`).
- **No real HTTP in tests**: HTTP is abstracted; tests use stubs and realistic payloads only.

## Architecture and folder structure

```
src/
├── domain/           # Shared types and validation (Zod)
│   ├── address.ts
│   ├── money.ts
│   ├── package.ts
│   ├── rate-request.ts
│   └── rate-quote.ts
├── carriers/         # Carrier interface + implementations
│   ├── carrier.ts    # Carrier interface
│   └── ups/         # UPS: mapper, parser, UpsCarrier
├── auth/             # Per-carrier auth (e.g. OAuth token manager)
│   └── ups-token-manager.ts
├── http/             # HTTP client abstraction
│   ├── client.ts
│   └── types.ts
└── errors/           # Structured carrier errors (auth, rate limit, network, invalid response)

tests/
├── helpers/          # Stub HTTP client (no real requests)
└── carriers/ups/     # UPS carrier integration tests
```

- **Domain** defines `RateRequest`, `RateQuote`, `Address`, `Package`, `Money` with Zod schemas.
- **Carriers** implement the `Carrier` interface; each carrier has its own folder (e.g. `ups/`) with request mapping, response parsing, and the carrier class.
- **Auth** is per-carrier (e.g. UPS OAuth); the carrier uses it internally so callers never see tokens.
- **HTTP** is behind an `HttpClient` interface so production can use a real client and tests use stubs.

## Domain vs carrier separation

- **Domain** (`src/domain/`): Types and validation only. No carrier names, no API shapes. Used everywhere as the single source of truth for “a rate request” and “a rate quote.”
- **Carriers** (`src/carriers/<carrier>/`): All carrier-specific logic stays here:
  - Map `RateRequest` → carrier API request body.
  - Parse carrier API response → `RateQuote[]`.
  - Use carrier auth and HTTP; throw shared errors from `src/errors/`.

Callers depend only on the `Carrier` interface and domain types; they never import UPS (or any carrier) request/response types.

## Authentication approach

- **Transparent to callers**: You call `carrier.getRates(request)`; the carrier obtains and attaches credentials (e.g. OAuth token) internally.
- **UPS**: `UpsTokenManager` uses the HTTP client abstraction to call the UPS OAuth token endpoint with client credentials. It caches the token in memory, tracks expiry, and refreshes when needed. Config comes from env (see `.env.example`) or constructor options for tests.
- Other carriers would have their own auth module (e.g. API keys, different OAuth flows) behind the same idea: auth is an implementation detail of the carrier.

## Testing strategy

- **No real HTTP**: All tests use a **stub HTTP client** (`tests/helpers/stub-http-client.ts`) that records calls and returns configured responses per URL (auth vs rating).
- **Realistic payloads**: Integration tests use realistic UPS OAuth and Rating API response shapes (e.g. `RateResponse` with `RatedShipment`, `TotalCharges`, `Service`).
- **Coverage**:
  - Request construction (payload shape, headers, Bearer token).
  - Response normalization (service name, price, currency, optional delivery days).
  - OAuth token reuse (auth called once for two `getRates`) and refresh (expired token triggers a second auth call).
  - Error handling: 4xx (e.g. 401, 429), 5xx, timeouts, malformed/invalid response (e.g. `InvalidResponseError`).

## How to add a new carrier

1. **Implement the `Carrier` interface** in `src/carriers/<name>/`:
   - `readonly id: string` (e.g. `"fedex"`).
   - `getRates(request: RateRequest): Promise<RateQuote[]>`.

2. **In that folder, add**:
   - Request types and a **mapper**: `RateRequest` → carrier API request body.
   - Response types/schemas and a **parser**: carrier API response → `RateQuote[]` (validate with Zod or similar; use `InvalidResponseError` for bad data).
   - A **carrier class** that takes an `HttpClient` and (if needed) an auth helper, calls the mapper, POSTs with auth, then the parser.

3. **Auth** (if needed): Add an auth module (e.g. under `src/auth/` or next to the carrier) that returns credentials; the carrier calls it inside `getRates` so callers stay unaware.

4. **Errors**: Use the shared errors (`AuthenticationError`, `RateLimitError`, `NetworkError`, `InvalidResponseError`) so callers can handle them uniformly.

5. **Tests**: Reuse the stub HTTP client; queue auth and rating responses and assert on request construction, normalized quotes, token reuse/refresh, and error cases.

6. **Export** the new carrier (and optional types) from `src/carriers/<name>/index.ts` and from `src/carriers/index.ts` if desired.

## How to run tests

```bash
npm install
npm test
```

Run a specific file:

```bash
npx vitest run tests/carriers/ups/ups-carrier.integration.test.ts
```

Watch mode:

```bash
npx vitest
```

## What would be improved with more time

- **Real HTTP client**: Implement a production HTTP client (e.g. using `fetch` or `axios`) behind the `HttpClient` interface, with configurable timeouts and retries.
- **Retries and backoff**: Retry on 5xx and (with care) on rate limit (e.g. using `Retry-After`), with exponential backoff.
- **Logging and observability**: Structured logs (request id, carrier, latency, errors) and metrics (success/error counts, latency percentiles).
- **Configuration**: Load base URLs and timeouts from config/env per carrier instead of hardcoding.
- **More carriers**: FedEx, DHL, etc., following the same pattern (mapper, parser, auth, carrier class).
- **Unit tests**: Focused tests for mappers and parsers in isolation with minimal fixtures.
- **E2E / sandbox**: Optional tests against carrier sandboxes with real credentials in CI (secrets in env, not in repo).
- **Validation at the edge**: Validate `RateRequest` with the domain Zod schema at API boundaries before calling carriers.
- **Type-safe env**: Validate required env (e.g. `UPS_CLIENT_ID`, `UPS_CLIENT_SECRET`) at startup with a small schema instead of failing on first use.
