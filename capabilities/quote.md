---
capability: org.dmc12.automotive.quote
version: 0.1.0
status: implemented
extends: dev.ucp.shopping.checkout
authors:
  - ben-reuling
  - chris-hudson
---

# org.dmc12.automotive.quote

Issues a time-bounded price quote for a specific VIN at the merchant's
listed asking price. **No negotiation** — `quoted_price` is always equal
to `asking_price` at the moment the quote is written.

## Tool surface

| Tool | Scope |
|---|---|
| `request_quote` | `quote:write` |

## Input

See [`schemas/quote.json`](../schemas/quote.json).

| Field | Type | Required | Notes |
|---|---|---|---|
| `vin` | string | yes | 17 chars |
| `buyer_ref` | string | no | opaque agent-side reference, max 200 chars — MUST NOT contain PII |

## Output

| Field | Type |
|---|---|
| `quote_id` | string (UUID) |
| `vin` | string |
| `quoted_price` | number |
| `currency` | string (ISO 4217) |
| `created_at` | string (ISO 8601) |
| `expires_at` | string (ISO 8601) |
| `terms` | string (human-readable) |

## TTL

Default TTL is 30 minutes. Merchants MAY publish a shorter TTL but not a
longer one — a quote older than 30 minutes no longer accurately reflects
floor-assist or OEM program changes.

## Invariants

1. `quoted_price == asking_price(vin, quote.created_at)`. No parameter
   accepts a proposed price.
2. A quote is tied to the issuing `agent_id`. Another agent cannot
   convert it to a reservation.
3. Calling `request_quote` on an unavailable VIN returns
   `{"error": "vehicle_not_available"}` without writing a quote row.

## No-negotiation rationale

Dealers cannot legally commit an agent to a below-floor price; agents
cannot negotiate for a human consumer in v0.1 because there is no
protocol-level way to attest the consumer authorized the negotiation
bound. Until AP2 Intent Mandates land, `org.dmc12.automotive.quote` is
strictly an asking-price quote.
