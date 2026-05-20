---
capability: ai.dmc12.automotive.deal_handoff
version: 0.1.1
status: implemented
extends: dev.ucp.shopping.checkout
authors:
  - ben-reuling
  - chris-hudson
---

# ai.dmc12.automotive.deal_handoff

Hands an agent-initiated reservation to a live sales manager at the
dealer as a "deal intent package." Completes the human-in-the-loop step
that turns a 30-minute soft hold into a real sale.

This is the **only** DMC-12 capability that accepts customer PII.

## Tool surface

| Tool | Scope |
|---|---|
| `initiate_deal_handoff` | `deal:handoff` |

## Input

See [`schemas/deal-handoff.json`](https://dmc12.ai/schemas/deal-handoff.json).

| Field | Type | Required | Notes |
|---|---|---|---|
| `reservation_token` | string | yes | Active reservation owned by the calling agent. |
| `customer_contact.name` | string | yes | Customer name. |
| `customer_contact.phone` | string | yes | E.164 format (`+15555551234`). |
| `customer_contact.email` | string | yes | RFC 5322 email. |
| `financing_preference` | enum | yes | `cash` \| `finance` \| `lease` \| `unknown` |
| `trade_in_disclosed` | boolean | yes | `true` if customer is bringing a trade. |
| `trade_in.description` | string | no | Free-text description (max 500). |
| `trade_in.appraised_value_partner` | Money (`common.json`) | no | Partner-supplied appraisal hint — NOT binding on the dealer. |
| `trade_in.vin` | string | no | 17-char VIN per ISO 3779. |
| `trade_in.year` | integer | no | 1900–2100. |
| `trade_in.make` | string | no | Max 40. |
| `trade_in.model` | string | no | Max 80. |
| `trade_in.mileage` | integer | no | 0–1,000,000. |
| `trade_in.condition` | enum | no | `excellent` \| `good` \| `fair` \| `poor` |
| `notes` | string | no | Agent-provided context, max 500 chars. |
| `customer_consent` | boolean (const `true`) | yes | The customer explicitly authorized contact transfer to the dealer. |

The whole `trade_in` object is optional, and every field inside is optional.
An empty `trade_in: {}` is valid but a no-op. If any `trade_in` field is
supplied, implementations MUST treat disclosure as implicit
(`trade_in_disclosed = true`) regardless of the boolean. The partner-supplied
`appraised_value_partner` is a hint only; the dealer re-appraises on intake.

## Output

| Field | Type |
|---|---|
| `handoff_token` | string (opaque) |
| `sent_to_masked` | string (e.g. `sa****@markmillersubaru.com`) |
| `sent_at` | string (ISO 8601) |
| `status` | enum: `sent` |
| `next_steps` | string (human-readable) |

## Behavior

1. Validate `reservation_token` is active, not expired, and owned by the
   calling agent.
2. Compose a deal-intent email to the merchant's configured hand-off
   address containing:
   - VIN, stock #, year/make/model, asking price
   - Reservation token + expiry
   - Agent ID + trace ID (for audit cross-reference)
   - Customer contact
   - Financing preference + trade disclosure (and structured trade-in
     details when supplied)
   - Agent notes
3. Send the email.
4. Persist a hand-off record keyed by a new `handoff_token`, with
   customer contact stored only as a SHA-256 hash. Structured trade-in
   fields (VIN, year, make, model, mileage, condition, partner-supplied
   appraisal), when supplied, MAY be persisted in plaintext — they
   describe a vehicle, not a person. `trade_in.description`, however, is
   unconstrained free text; implementations SHOULD hash it the same way
   they hash `notes` (a partner could otherwise plant PII inside the
   description).
5. Return a masked hand-off receipt.

## PII handling (normative)

Implementations MUST:

1. **Redact PII from all audit logs.** Store only `sha256(email)`,
   `sha256(phone)`, and `sha256(name)`. Never persist plaintext PII in
   the audit log or any log aggregation destination.
2. **Require explicit consent.** `customer_consent == true` is mandatory;
   `false` MUST return an error without sending the email.
3. **Honor deletion requests** per the merchant's privacy policy.
   Implementations SHOULD expose an admin operation to mark a hand-off
   `cancelled` and purge plaintext PII.

The structured `trade_in.*` fields are **not** PII (they describe a
vehicle, not a person) and fall outside the consent gate.
`trade_in.description` is unconstrained free text — implementations
SHOULD treat it like `notes` for audit/persistence (hash before storing,
keep plaintext only in the outbound dealer-ops surface).

## Status transitions

`sent` → `acknowledged` → `closed`
              ↘
               `cancelled`

Only `sent` is set by the tool; the remaining transitions are set by the
dealer's sales workflow (manual today; DMS integration v0.2+).

## Relationship to AP2

v0.1 uses a simple `customer_consent` boolean. v0.2 will require an AP2
Intent Mandate + Cart Mandate artifact set as the consent record.

## Relationship to `trade_intake`

The reserved `ai.dmc12.automotive.trade_intake` capability (v0.3+) is a
**separate** flow: a partner calls `trade_intake` first to receive a
`trade_token`, then references that token from `deal_handoff`. The
`trade_in` object on `deal_handoff` is the "disclose alongside the
deal" surface and remains useful even after `trade_intake` ships.

## Changelog

- **0.1.1** (2026-05-20): Added optional `trade_in` object — `description`,
  `appraised_value_partner` (Money), `vin`, `year`, `make`, `model`,
  `mileage`, `condition`. Backward-compatible additive change. Partner-
  supplied appraisal is a hint, not authoritative; the dealer re-appraises
  on intake. Implicit-disclosure rule: any populated `trade_in` field
  forces `trade_in_disclosed = true`.
- **0.1.0** (2026-04-21): Initial release.
