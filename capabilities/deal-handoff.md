---
capability: org.dmc12.automotive.deal_handoff
version: 0.1.0
status: implemented
extends: dev.ucp.shopping.checkout
authors:
  - ben-reuling
  - chris-hudson
---

# org.dmc12.automotive.deal_handoff

Hands an agent-initiated reservation to a live sales manager at the
dealer as a "deal intent package." Completes the human-in-the-loop step
that turns a 30-minute soft hold into a real sale.

This is the **only** DMC-12 capability that accepts customer PII.

## Tool surface

| Tool | Scope |
|---|---|
| `initiate_deal_handoff` | `deal:handoff` |

## Input

See [`schemas/deal-handoff.json`](../schemas/deal-handoff.json).

| Field | Type | Required | Notes |
|---|---|---|---|
| `reservation_token` | string | yes | Active reservation owned by the calling agent. |
| `customer_contact.name` | string | yes | Customer name. |
| `customer_contact.phone` | string | yes | E.164 format (`+15555551234`). |
| `customer_contact.email` | string | yes | RFC 5322 email. |
| `financing_preference` | enum | yes | `cash` \| `finance` \| `lease` \| `unknown` |
| `trade_in_disclosed` | boolean | yes | `true` if customer is bringing a trade. |
| `notes` | string | no | Agent-provided context, max 500 chars. |
| `customer_consent` | boolean | yes | The customer explicitly authorized contact transfer to the dealer. |

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
   - Financing preference + trade disclosure
   - Agent notes
3. Send the email.
4. Persist a hand-off record keyed by a new `handoff_token`, with
   customer contact stored only as a SHA-256 hash.
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

## Status transitions

`sent` → `acknowledged` → `closed`
              ↘
               `cancelled`

Only `sent` is set by the tool; the remaining transitions are set by the
dealer's sales workflow (manual today; DMS integration v0.2+).

## Relationship to AP2

v0.1 uses a simple `customer_consent` boolean. v0.2 will require an AP2
Intent Mandate + Cart Mandate artifact set as the consent record.
