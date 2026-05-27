---
capability: ai.dmc12.automotive.quote
version: 0.3.0
status: implemented
extends: dev.ucp.shopping.checkout
authors:
  - ben-reuling
  - chris-hudson
---

> **v0.3 capability bump (DMC-12 v0.4 cut, additive/non-breaking).** Adds two
> OPTIONAL output fields — `out_the_door` (a non-binding OTD estimate) and the
> `out_the_door_estimate: true` flag. Both are absent unless the merchant has
> pricing disclosure enabled with a live fee schedule, so a v0.1/v0.2 quote
> payload (no OTD) still validates against the v0.3 schema. No input change.
>
> **v0.2 capability bump (schema unchanged).** The 0.1.0 → 0.2.0 bump signaled
> only that the surrounding policy contract changed: VINs may declare a
> non-`fixed` `negotiation_policy`, and the manifest reflects that.

# ai.dmc12.automotive.quote

Issues a time-bounded price quote for a specific VIN at the merchant's
listed asking price. **No negotiation** — `quoted_price` is always equal
to `asking_price` at the moment the quote is written.

## Tool surface

| Tool | Scope |
|---|---|
| `request_quote` | `quote:write` |

## Input

See [`schemas/quote.json`](https://dmc12.ai/schemas/quote.json).

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
| `out_the_door` | `Money` ({amount, currency}) — **optional** |
| `out_the_door_estimate` | `true` — **optional**, present iff `out_the_door` is |

### Out-the-door estimate (optional, v0.3)

When the merchant has pricing disclosure enabled and a live fee schedule for
the VIN's store, the quote output MAY carry an `out_the_door` `Money` value
plus `out_the_door_estimate: true`. This is a **best-effort, non-binding
estimate** derived from `quoted_price` plus the merchant's published fee
schedule (tax + doc + title + registration) — it is *not* a second firm price.
`quoted_price` remains the only committed figure. Both fields are **omitted**
when pricing disclosure is off (the Mark Miller reference deployment's current
state) or when the fee schedule is missing/malformed; their absence is valid
under the v0.3 schema. For the itemized line-item breakdown, see
`ai.dmc12.automotive.pricing_disclosure`.

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
bound. Until AP2 Intent Mandates land, `ai.dmc12.automotive.quote` is
strictly an asking-price quote.
