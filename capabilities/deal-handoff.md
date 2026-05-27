---
capability: ai.dmc12.automotive.deal_handoff
version: 0.1.2
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
| `consent` | object | no | OPTIONAL channel-scoped consent (v0.1.2) — see below. |
| `consent.allowed_channels` | array | yes (within `consent`) | Non-empty, unique subset of `email` \| `phone` \| `sms`. Advisory. |
| `consent.expires_at` | string | yes (within `consent`) | Timezone-aware ISO-8601. Enforced — see below. |
| `consent.consent_text` | string | no | Verbatim authorization language (max 2000). Hashed before audit/persistence. |

The whole `trade_in` object is optional, and every field inside is optional.
An empty `trade_in: {}` is valid but a no-op. If any `trade_in` field is
supplied, implementations MUST treat disclosure as implicit
(`trade_in_disclosed = true`) regardless of the boolean. The partner-supplied
`appraised_value_partner` is a hint only; the dealer re-appraises on intake.

The `consent` object (v0.1.2) is **optional and additive**. A caller that
sends only the bare `customer_consent: true` boolean leaves `consent` absent
and behaves exactly as it did pre-v0.1.2. When present, `consent` records
WHICH contact channels the customer authorized (`allowed_channels`) and WHEN
that authorization lapses (`expires_at`). `expires_at` is **enforced**:
implementations MUST reject a hand-off whose consent has expired with
`error_code = CONSENT_INVALID` (see [`errors.md`](./errors.md)) before sending
any email. `allowed_channels` are **advisory** — they are recorded and
surfaced to dealer-ops, never used to gate contact (the dealer follows up
through its own workflow). `consent_text` is unconstrained free text and is
hashed before audit/persistence, exactly like `notes`. *Design credit:
channel-scoped consent is informed by the Auto Agent Protocol (AAP,
<https://autoagentprotocol.org>); DMC-12 uses its own field names and keeps
the bare boolean working unchanged. See `SPEC.md §13`.*

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
   calling agent. If a `consent` object is supplied, reject the hand-off
   with `CONSENT_INVALID` when `consent.expires_at` has already passed —
   before composing or sending anything.
2. Compose a deal-intent email to the merchant's configured hand-off
   address containing:
   - VIN, stock #, year/make/model, asking price
   - Reservation token + expiry
   - Agent ID + trace ID (for audit cross-reference)
   - Customer contact
   - Financing preference + trade disclosure (and structured trade-in
     details when supplied)
   - Agent notes
   - Customer consent block (authorized channels + expiry), when supplied
3. Send the email.
4. Persist a hand-off record keyed by a new `handoff_token`, with
   customer contact stored only as a SHA-256 hash. Structured trade-in
   fields (VIN, year, make, model, mileage, condition, partner-supplied
   appraisal), when supplied, MAY be persisted in plaintext — they
   describe a vehicle, not a person. `trade_in.description`, however, is
   unconstrained free text; implementations SHOULD hash it the same way
   they hash `notes` (a partner could otherwise plant PII inside the
   description). When a `consent` object is supplied, `allowed_channels`
   and `expires_at` MAY be persisted in plaintext (they are not PII), while
   `consent_text` MUST be hashed like `notes`.
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

Likewise, the `consent.allowed_channels` and `consent.expires_at` fields are
**not** PII and MAY be persisted in plaintext. `consent.consent_text`, however,
is unconstrained free text — implementations MUST treat it like `notes`
(hash before storing; plaintext only on the outbound dealer-ops surface).

## Status transitions

`sent` → `acknowledged` → `closed`
              ↘
               `cancelled`

Only `sent` is set by the tool; the remaining transitions are set by the
dealer's sales workflow (manual today; DMS integration v0.2+).

## Relationship to AP2

v0.1 used a bare `customer_consent` boolean. v0.1.2 enriches that —
additively — with an OPTIONAL channel-scoped `consent` object (authorized
channels + expiry + verbatim text); the bare boolean remains the floor and
its behavior is unchanged. An AP2 Intent Mandate + Cart Mandate artifact set
remains the **future** direction for a cryptographically-attestable consent
record. Channel-scoped consent is the v0.1.2 step in that direction, not a
replacement for AP2.

## Relationship to `trade_intake`

The reserved `ai.dmc12.automotive.trade_intake` capability (v0.3+) is a
**separate** flow: a partner calls `trade_intake` first to receive a
`trade_token`, then references that token from `deal_handoff`. The
`trade_in` object on `deal_handoff` is the "disclose alongside the
deal" surface and remains useful even after `trade_intake` ships.

## Changelog

- **0.1.2** (2026-05-26): Added optional channel-scoped `consent` object —
  `allowed_channels` (non-empty, unique subset of `email`/`phone`/`sms`),
  `expires_at` (timezone-aware, enforced — expired consent is rejected with
  `CONSENT_INVALID`), and optional `consent_text` (hashed before
  audit/persistence). Backward-compatible additive change: the bare
  `customer_consent` boolean is unchanged and remains the floor.
  Channel-scoped consent design is informed by AAP (autoagentprotocol.org);
  see `SPEC.md §13`.
- **0.1.1** (2026-05-20): Added optional `trade_in` object — `description`,
  `appraised_value_partner` (Money), `vin`, `year`, `make`, `model`,
  `mileage`, `condition`. Backward-compatible additive change. Partner-
  supplied appraisal is a hint, not authoritative; the dealer re-appraises
  on intake. Implicit-disclosure rule: any populated `trade_in` field
  forces `trade_in_disclosed = true`.
- **0.1.0** (2026-04-21): Initial release.
