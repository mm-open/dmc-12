---
capability: ai.dmc12.automotive.errors
version: 0.1.0
status: implemented
extends: dev.ucp.shopping
authors:
  - ben-reuling
  - chris-hudson
---

# ai.dmc12.automotive.errors

A documented, cross-cutting **error taxonomy** for DMC-12 endpoints. Unlike
the other capabilities, `errors` has no tool surface of its own — it defines
the shape every tool uses when a call fails, so an agent can branch on a
stable code and a `retryable` hint instead of pattern-matching free-text
strings.

> **Prior art / credit.** The taxonomy *structure* here — a compact code set
> paired with a `retryable` flag and a per-error correlation `error_id` — is
> informed by the **Auto Agent Protocol** (AAP,
> <https://autoagentprotocol.org>, Apache-2.0), a strict A2A profile for
> automotive agents. DMC-12 adopts the **pattern**, not the names: the codes
> below are DMC-12's own, chosen to line up with DMC-12's capability
> vocabulary. We credit AAP because the design is good and the
> cross-pollination is principled.

## Error object

See [`schemas/error.json`](https://dmc12.ai/schemas/error.json). When a tool
call fails, the response envelope's `data` member is an error object:

| Field | Type | Required | Notes |
|---|---|---|---|
| `error` | string | yes | **Legacy** machine-readable string, stable per implementation. Preserved for backward compatibility — pre-taxonomy consumers read this. |
| `error_code` | enum (`ErrorCode`) | yes | The DMC-12 code. **The recommended field to branch on.** |
| `retryable` | boolean | yes | `true` if retrying the identical request could plausibly succeed later. |
| `error_id` | string | yes | Opaque per-occurrence correlation id (`err_<uuid4hex>`). Safe to quote to the merchant for log lookup. |
| `message` | string | no | Human-readable, non-sensitive detail. Never PII or secrets. |

Implementations MAY include additional context keys (e.g. `vin`, `status`,
`quote_id`) on the error object; consumers MUST ignore keys they don't
recognize.

### Non-breaking guarantee

`error_code` / `retryable` / `error_id` are **additive**. The legacy `error`
string is never removed or repurposed, so a consumer written against the
pre-taxonomy shape keeps working byte-for-byte. New consumers SHOULD prefer
`error_code`.

## Error codes

`retryable: true` marks the transient classes; everything else is
deterministic (retrying the identical request will fail the same way).

| `error_code` | retryable | Meaning |
|---|---|---|
| `VEHICLE_NOT_FOUND` | no | No vehicle matches the supplied VIN. |
| `VEHICLE_UNAVAILABLE` | no | The vehicle exists but is not in a sellable state (sold / pending / in-transit). |
| `QUOTE_NOT_FOUND` | no | No quote matches the supplied `quote_id`. |
| `QUOTE_EXPIRED` | no | The quote's TTL has elapsed. |
| `QUOTE_STATE` | no | The quote is not in a state that permits the requested action (e.g. already converted/closed). |
| `RESERVATION_NOT_FOUND` | no | No reservation matches the supplied token. |
| `RESERVATION_EXPIRED` | no | The reservation's soft-hold TTL has elapsed. |
| `RESERVATION_STATE` | no | The reservation is not in a state that permits the action (e.g. not active). |
| `RESERVATION_CONFLICT` | no | The VIN already has an active reservation (one active hold per VIN). |
| `RESERVATION_LIMIT` | no | The caller's reservation budget (e.g. per-day) is exhausted. |
| `OFFER_NOT_FOUND` | no | No negotiation offer/thread matches the supplied id. |
| `OFFER_EXPIRED` | no | The offer or its negotiation thread has expired. |
| `OFFER_STATE` | no | The offer/thread is not in a state that permits the action (not acceptable / not counterable / closed). |
| `CONSENT_REQUIRED` | no | A consent artifact is required and absent. |
| `CONSENT_INVALID` | no | A supplied consent is present but invalid (e.g. expired). |
| `NOT_AUTHORIZED` | no | The caller lacks the scope, ownership, or active status for the action. |
| `VALIDATION_FAILED` | no | Input failed schema/semantic validation. |
| `RATE_LIMITED` | **yes** | The caller exceeded a rate limit; retry after the window resets. |
| `NOT_CONFIGURED` | no | A required server-side configuration (e.g. a fee schedule, a hand-off destination) is absent. |
| `UPSTREAM_UNAVAILABLE` | **yes** | A dependency the call needs (e.g. the outbound email relay) failed transiently. |
| `INTERNAL_ERROR` | **yes** | An unclassified server error. The default for any error string the server hasn't mapped. |

## Mapping guidance (normative)

1. Every error a tool returns MUST carry an `error_code` drawn from the enum
   above and a `retryable` boolean.
2. An implementation maps its own internal error strings onto these codes; the
   mapping is an implementation detail, but every internal string MUST resolve
   to exactly one code. Unmapped strings MUST resolve to
   `INTERNAL_ERROR` / `retryable: true` so a new error never escapes
   unclassified.
3. `error_id` MUST be unique per occurrence and free of PII.
4. The legacy `error` string MUST be preserved (see the non-breaking
   guarantee).

## Reference implementation

Mark Miller Subaru's `mm-inventory-mcp` enriches centrally at the dispatcher
boundary: each tool keeps returning its `{ "error": "<string>" }` payload, and
the dispatch layer looks up the `(error_code, retryable)` pair and attaches
`error_id` before wrapping the response — so the ~30 internal strings map onto
the table above without touching individual tool call sites.

## Changelog

- **0.1.0** (2026-05-26): Initial release. Documents the cross-cutting error
  object (`error_code` / `retryable` / `error_id`) layered additively over the
  legacy `error` string. Taxonomy structure credited to AAP.
