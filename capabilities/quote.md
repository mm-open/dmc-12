---
capability: ai.dmc12.automotive.quote
version: 0.4.0
status: implemented
extends: dev.ucp.shopping.checkout
authors:
  - ben-reuling
  - chris-hudson
---

> **v0.4 capability bump (DMC-12 v0.5 cut).** The `out_the_door` field is now
> **itemized**: its `$ref` changes from `Money` to `OutTheDoorEstimate`,
> carrying `price_lines` (vehicle price + each fee/tax line), `fees_total`,
> `taxes_total`, and disclosure metadata (`estimate`, `jurisdiction`, `as_of`,
> `disclosure_form_url`) alongside the OTD `amount`/`currency` total. No input
> change. `subtotal` is omitted — derivable as `amount - taxes_total.amount`.
> **Compatibility:** the field stays OPTIONAL and the `out_the_door_estimate:
> true` pairing is unchanged, so any payload that *omits* the OTD still
> validates — but a payload that *carried* the old bare-`Money` OTD no longer
> validates against this schema. That is a breaking change to this one optional
> field (permitted pre-1.0), deliberately **field-access compatible**:
> `amount`/`currency` stay at the top level where the bare total used to sit.
>
> **v0.3 capability bump (DMC-12 v0.4 cut).** Added two OPTIONAL output fields —
> `out_the_door` (then a bare `Money` total) and the `out_the_door_estimate:
> true` flag. Both absent unless the merchant has pricing disclosure enabled
> with a live fee schedule.
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
| `out_the_door` | `OutTheDoorEstimate` — **optional**, itemized (see below) |
| `out_the_door_estimate` | `true` — **optional**, present iff `out_the_door` is |

### Out-the-door estimate (optional, itemized as of v0.4)

When the merchant has pricing disclosure enabled and a live fee schedule for
the VIN's store, the quote output MAY carry an `out_the_door` object plus
`out_the_door_estimate: true`. This is a **best-effort, non-binding estimate**
derived from `quoted_price` plus the merchant's published fee schedule — it is
*not* a second firm price. `quoted_price` remains the only committed figure.
Both fields are **omitted** when pricing disclosure is off (the Mark Miller
reference deployment toggles this per dealer) or when the fee schedule is
missing/malformed; their absence is valid under the schema.

As of v0.4 the estimate is **itemized** — it carries the same line-item
breakdown as `ai.dmc12.automotive.pricing_disclosure`, flattened so the OTD
total sits at the top level:

#### `out_the_door` object (`OutTheDoorEstimate`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `amount` | number | yes | OTD total = sum of every `price_lines` amount (vehicle price + fees + taxes) |
| `currency` | string (ISO 4217) | yes | e.g. `USD` |
| `price_lines` | `PriceLine[]` | yes | Itemized lines bridging `quoted_price` → `amount` (see sub-table) |
| `fees_total` | `Money` | yes | Sum of dealer-payee, non-vehicle fee lines (e.g. the doc fee) |
| `taxes_total` | `Money` | yes | Sum of all `tax`-kind lines |
| `estimate` | `true` | yes | Always `true` — the OTD is non-binding |
| `jurisdiction` | string | yes | Tax jurisdiction, `^[A-Z]{2}-[A-Z0-9]+$` (e.g. `US-UT`) |
| `as_of` | string (ISO 8601) | yes | When the estimate was composed |
| `disclosure_form_url` | string (URI) | no | Link to the jurisdiction's official OTD disclosure form |

`subtotal` is intentionally **omitted** — derivable as `amount - taxes_total.amount`.

#### `PriceLine` (one per item in `price_lines`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `label` | string (≤80) | yes | Human-readable line label, e.g. "Documentation fee" |
| `kind` | `FeeKind` | yes | One of `vehicle_price`, `tax`, `title`, `registration`, `doc`, `addon`, `transport`, `rebate`, `discount`, `trade_credit`, `down_payment`, `lien_payoff`, `interest`. **Not** the free-form string `"fee"` |
| `payee` | `FeePayee` | yes | One of `government`, `dealer`, `manufacturer`, `third_party` |
| `amount` | `Money` | yes | `{amount, currency}` for this line |
| `statutory_basis` | string | no | Legal basis for a tax/government line, e.g. "Utah motor-vehicle sales tax" |
| `negotiable` | boolean | no | Defaults `false`; the vehicle line tracks the deployment's negotiation toggle |

For the standalone, full disclosure (including `subtotal` and optional
`trade_in_credit`), call `ai.dmc12.automotive.pricing_disclosure`.

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
