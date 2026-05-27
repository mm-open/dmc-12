# DMC-12 Specification

**Version:** 0.3.0
**Date:** 2026-05-26
**Status:** Reference implementation at Mark Miller Subaru Midtown.

DMC-12 is an automotive extension set to the
[Universal Commerce Protocol (UCP)](https://developers.googleblog.com/en/under-the-hood-universal-commerce-protocol-ucp/).
UCP standardizes agent discovery (`/.well-known/ucp`), transport (MCP +
A2A), and payment mandates (AP2). DMC-12 defines the capabilities a
dealership agent surface needs on top of that base: VIN-level inventory,
asking-price quotes, soft reservations, and deal hand-off to a live sales
manager. v0.2 adds per-VIN negotiation policies and itemized pricing
disclosure on top of that base. v0.3 adds two additive, non-breaking
refinements — a cross-cutting error taxonomy
(`ai.dmc12.automotive.errors`, §8) and channel-scoped consent on deal
hand-off (`deal_handoff` v0.1.2) — both informed by the Auto Agent
Protocol (AAP); see §13. It also stubs the automotive-specific
capabilities (trade intake, test-drive, F&I menu, return policy) that
require DMS writes to implement but can be declared on a manifest as
capabilities are brought online.

## 1. Scope

DMC-12 covers **dealer-side agent commerce for new, used, CPO, and demo
passenger vehicle retail**.

Out of scope for v0.1 and deferred to future extensions:

- Wholesale / fleet transactions.
- Service-drive (RO) scheduling and billing.
- OEM-direct reservations (Subaru Solterra reservations, Ford Mustang
  Mach-E reservations, etc.).
- Parts e-commerce (covered by core UCP shopping — no automotive extension
  required).

Agents interacting with a DMC-12 endpoint should treat the manifest as
authoritative: a dealer only honors the capabilities it declares.

## 2. Relationship to UCP

DMC-12 capabilities extend two UCP core capabilities:

| UCP core | DMC-12 extension (status) | Relationship |
|---|---|---|
| `dev.ucp.shopping.catalog` | `ai.dmc12.automotive.inventory` *(implemented v0.1)* | Adds VIN, stock #, condition, mileage, drivetrain, body_style, days_on_lot. |
| `dev.ucp.shopping.checkout` | `ai.dmc12.automotive.quote` + `.reservation` + `.deal_handoff` *(all implemented; `.deal_handoff` at v0.1.2 adds optional structured `trade_in` and optional channel-scoped `consent`)* | Automotive checkout is a human-closes-the-deal flow — the reservation + handoff pair replaces direct payment capture in v0.1. |
| `dev.ucp.shopping.checkout` | `ai.dmc12.automotive.negotiation` + `.pricing_disclosure` *(implemented v0.2)* | Negotiation publishes per-VIN policy types (`fixed` / `stepwise` / `bestoffer`) and offer/counter/acceptance/rejection envelopes. Pricing disclosure publishes itemized price lines with `kind` × `payee` tagging plus an OTD estimate. |
| `dev.ucp.shopping.checkout` | `ai.dmc12.automotive.trade_intake` *(stub — v0.3+)* | Trade-in intake also extends checkout. Schema is published as a stub so it shows up in capability indexing; `additionalProperties: false` prevents accidental PII leakage through an undefined surface. |
| *(none — new namespace)* | `ai.dmc12.automotive.test_drive` + `.fni_menu` + `.return_policy` *(stub — v0.3+)* | Out-of-band from UCP checkout; they describe the retail wrapper around the vehicle sale rather than the transaction itself. |
| *(cross-cutting — every capability)* | `ai.dmc12.automotive.errors` *(implemented v0.3)* | A shared error taxonomy — every tool error carries `error_code` + `retryable` + `error_id`. No tool surface of its own; see §8. |

AP2 Intent / Cart / Payment mandates are **not** implemented in v0.1. A
DMC-12 `deal_handoff` call records a Boolean `customer_consent` artifact
as a stand-in until AP2 is available in production.

### 2.1 Payment handlers and AP2 posture

DMC-12 v0.1 implementations declare `payment.handlers: []` on their UCP
manifest. This is the compliant signal — per the UCP manifest contract —
that no protocol-level payment path is available; an agent that requires
an AP2-backed checkout MUST NOT attempt one against a v0.1 endpoint and
SHOULD fall back to the `deal_handoff` capability.

Deferring AP2 is deliberate, not an oversight:

1. Automotive checkout is not a single-mandate transaction. A real car
   deal layers an out-the-door calculation (taxes + doc fee + DMV +
   add-ons), an optional trade-in credit, and an optional F&I menu
   attach on top of the vehicle asking price. Those line items have to
   be defined before a Cart Mandate over them is meaningful.
2. Intent Mandates for negotiation (below-asking offers) require a
   dealer-side policy engine that can attest to a floor price and any
   OEM program constraints. v0.1 keeps negotiation out of scope
   (`quoted_price == asking_price`), so no Intent Mandate is yet
   required.

v0.2 introduces `ai.dmc12.automotive.pricing_disclosure` as the
itemized line-item schema an AP2 Cart Mandate can reference (replacing
v0.1's `otd_pricing` stub) and `ai.dmc12.automotive.negotiation` as the
per-VIN policy + offer/counter/acceptance shape an AP2 Intent Mandate
can reference. v0.3+ will define `ai.dmc12.automotive.trade_intake` and
clarify which DMC-12 capabilities require which AP2 mandate types. AP2
canonical URL: <http://goo.gle/ap2>.

## 3. Capability Namespace Rules

- `ai.dmc12.automotive.*` is reserved for this specification. Only the
  capabilities listed in [`capabilities/`](./capabilities/) may claim this
  prefix. New capabilities require a PR to this repo.
- Dealer- or vendor-specific capabilities SHOULD use a
  `com.<dealer-or-vendor>.*` prefix. Example:
  `com.markmillersubaru.service_scheduling`.
- Manifests MAY advertise both a UCP core capability and its DMC-12
  extension. Agents SHOULD prefer the DMC-12 extension when available.

### 3.1 Spec and schema URLs

DMC-12 capability documents and JSON Schemas are served from
`dmc12.ai`. Capability manifests SHOULD reference these canonical
URLs (not raw GitHub URLs):

- Capability spec: `https://dmc12.ai/specification/<capability>.md`
- Capability schema: `https://dmc12.ai/schemas/<capability>.json`

The serving origin is a Cloudflare Worker proxy that resolves to this
repo's `main` branch. The GitHub repo
(<https://github.com/mm-open/dmc-12>) remains the source of truth and
the place to file PRs.

## 4. Data Contracts

### 4.1 Vehicle identity

- **`vin`** — 17-character VIN per ISO 3779. Letters `I`, `O`, and `Q`
  are excluded. Validated via regex `^[A-HJ-NPR-Z0-9]{17}$`. NHTSA VIN
  pattern validation is RECOMMENDED for v0.2.
- **`stock_number`** — dealer-internal stock number. Non-normative, but
  typically used as a human-friendly secondary identifier.
- **`store_code`** — dealer-internal rooftop identifier (one dealer may
  operate multiple rooftops). Three-letter uppercase code (`MMS`, `MMU`).

### 4.2 Condition

Enumerated: `new`, `used`, `certified`, `rental`, `demo`. The UCP core
`catalog.condition` field is an open string; DMC-12 constrains it to this
enumeration.

### 4.3 Mileage

Integer miles. Implementations SHOULD return `null` for new vehicles
(rather than `0` or a synthetic "in-transit mileage").

### 4.4 Pricing

- **`asking_price`** — required, in the merchant's declared currency.
- **`msrp`** — optional, decimal. Manufacturer's suggested retail price.
- DMC-12 v0.1 does NOT represent OTD pricing (tax + doc fee + DMV fees +
  add-ons). v0.2 introduces
  `ai.dmc12.automotive.pricing_disclosure` as the itemized line-item
  schema (replacing v0.1's `otd_pricing` stub).

## 5. Inventory Accuracy Declaration

Merchants MUST declare inventory freshness at the manifest level:

```json
"merchant": {
  "inventory_accuracy": {
    "freshness_sla_seconds": 3600,
    "source": "<DMS name> via <ingest-path>"
  }
}
```

`freshness_sla_seconds` is the merchant's commitment to how old inventory
data can be before a search response is considered stale. `source` is a
human-readable description so an agent (or an auditor) can verify the
dealer is not scraping a stale third-party feed.

Dealers who cannot commit to an SLA MUST NOT advertise any DMC-12
capability — an agent that reserves a vehicle that was sold 12 hours ago
is a worse outcome than no agent integration at all.

## 6. Response SLA (optional)

Capabilities MAY publish a `response_sla_ms` hint at the manifest level:

```json
"capabilities": [
  {
    "name": "ai.dmc12.automotive.inventory",
    "version": "0.1.0",
    "response_sla_ms": 2000
  }
]
```

Agents MAY use this hint to size their timeouts. The hint is advisory, not
contractual.

## 7. PII Handling

DMC-12 v0.1 follows UCP's "opaque refs only" default for most capabilities.
`buyer_ref` and `customer_ref` fields in the quote and reservation
capabilities are opaque strings (max 200 chars) that the agent may use to
correlate a UCP transaction with its own internal record. Agents MUST NOT
place customer PII in these fields.

`ai.dmc12.automotive.deal_handoff` is the **single exception**. By
construction, a deal hand-off transfers customer contact information
(name, phone, email) to the dealer's sales team for human follow-up.
Implementations MUST:

1. Accept the PII only inside the `customer_contact` block of the
   `deal_handoff` tool input, never in other DMC-12 capabilities.
2. Redact the PII before writing to any audit log (hash + last-4 of phone
   only).
3. Record a `customer_consent` boolean (v0.1) alongside the hand-off,
   OPTIONALLY enriched with a channel-scoped `consent` object (v0.1.2:
   `allowed_channels` + `expires_at` + optional `consent_text`). The bare
   boolean remains the floor; an AP2 Intent Mandate artifact is the future
   direction. `consent_text` is unconstrained free text and MUST be hashed
   before audit/persistence (treat it like `notes`).
4. Honor deletion requests per the merchant's privacy policy.

## 8. Error Taxonomy

DMC-12 defines a cross-cutting **error taxonomy** so an agent can branch on a
stable code and a `retryable` hint instead of pattern-matching free-text
strings. It is published as the `ai.dmc12.automotive.errors` capability
(no tool surface of its own); the full code table lives in
[`capabilities/errors.md`](./capabilities/errors.md) and the shape in
[`schemas/error.json`](./schemas/error.json).

When a tool call fails, the response envelope's data member is an error
object with four required fields:

- **`error`** — the legacy machine-readable string, **preserved** for
  backward compatibility. Pre-taxonomy consumers read this.
- **`error_code`** — one of the documented DMC-12 codes (`VEHICLE_NOT_FOUND`,
  `QUOTE_EXPIRED`, `RESERVATION_CONFLICT`, `CONSENT_INVALID`,
  `NOT_AUTHORIZED`, `RATE_LIMITED`, `INTERNAL_ERROR`, …). The recommended
  field to branch on.
- **`retryable`** — boolean; `true` only for transient classes
  (`RATE_LIMITED`, `UPSTREAM_UNAVAILABLE`, `INTERNAL_ERROR`).
- **`error_id`** — an opaque per-occurrence correlation id for support /
  log lookup, free of PII.

The three taxonomy fields are **additive**: the legacy `error` string is
never removed or repurposed, so a consumer written before the taxonomy keeps
working byte-for-byte. Any internal error string an implementation has not
mapped MUST resolve to `INTERNAL_ERROR` / `retryable: true`, so a new error
never escapes unclassified.

> The taxonomy structure (compact code set + `retryable` + `error_id`) is
> informed by the Auto Agent Protocol (AAP); DMC-12 keeps its own code names.
> See §13.

## 9. Versioning

DMC-12 follows [Semantic Versioning 2.0.0](https://semver.org/). The
manifest's capability-level `version` field is independent of this
document's version — a capability at v0.1.0 may be published against
DMC-12 spec v0.1.0, v0.2.0, etc.

**Breaking changes** are permitted at any minor version bump during the
0.x series, per SemVer's pre-1.0 rules. v1.0.0 will mark the first
backward-compatibility commitment; after it, breaking changes require a
major version bump.

## 10. Reference Implementation

The reference implementation runs at Mark Miller Subaru Midtown, Salt
Lake City, UT:

- ~635 vehicles served at time of writing, refreshed on a scheduled
  cadence from the dealership DMS.
- The live manifest is served from the dealer's configured endpoint at
  `/.well-known/ucp` (and the A2A Agent Card at
  `/.well-known/agent-card.json`).
- Transports: MCP (`/mcp/`) + A2A JSON-RPC (`/a2a/`, OAuth 2.1 JWT per
  RFC 8707 resource-indicator scoping).
- A redacted snapshot of the live manifest lives at
  [`examples/markmiller-manifest.json`](./examples/markmiller-manifest.json).
  URLs and operational identifiers in that snapshot are replaced with
  `mcp.dealer.example` placeholders; a conformant consumer MUST resolve
  the actual endpoint from the dealer's published UCP well-known URL
  rather than the example file.

## 11. Release Notes

### v0.3.0 — current release (2026-05-26)

v0.3 is an additive, non-breaking feature cut:

- **`ai.dmc12.automotive.errors`** *(new, v0.1.0)* — a cross-cutting error
  taxonomy (§8). Every tool error gains an `error_code`, a `retryable` flag,
  and a correlation `error_id`, layered additively over the legacy `error`
  string.
- **`ai.dmc12.automotive.deal_handoff` → v0.1.2** — adds an OPTIONAL
  channel-scoped `consent` object (`allowed_channels`, `expires_at`, optional
  `consent_text`). `expires_at` is enforced (an expired consent is rejected
  with `CONSENT_INVALID`); `allowed_channels` are advisory. The bare
  `customer_consent` boolean is unchanged — callers that send only the boolean
  behave exactly as before.

Both refinements are informed by the Auto Agent Protocol (AAP); see §13.

### v0.2.0 (2026-04-26)

DMC-12 v0.2 introduced two new capabilities that replaced what v0.1
deferred. Both shipped in the v0.2 release (2026-04-26); schemas live
alongside the v0.1 schemas at [`schemas/`](./schemas/).

| Capability | Version | Status | Schemas | Spec |
|---|---|---|---|---|
| `ai.dmc12.automotive.negotiation` | 0.1.0 | implemented | [`negotiation_policy.json`](./schemas/negotiation_policy.json), [`offer.json`](./schemas/offer.json), [`counter.json`](./schemas/counter.json), [`acceptance.json`](./schemas/acceptance.json), [`rejection.json`](./schemas/rejection.json) | [`capabilities/negotiation.md`](./capabilities/negotiation.md) |
| `ai.dmc12.automotive.pricing_disclosure` | 0.1.0 | implemented | [`pricing_disclosure.json`](./schemas/pricing_disclosure.json) | [`capabilities/pricing-disclosure.md`](./capabilities/pricing-disclosure.md) |

Shared `$defs` (Money, FeePayee, FeeKind, PriceLine, FeeRule,
NegotiationState, RejectionReason) live in
[`schemas/common.json`](./schemas/common.json) and are referenced via
`$ref` from each v0.2 schema.

The v0.1 stub `otd_pricing` (under the prior namespace) is retired in
v0.2: the `otd-pricing.md` capability doc was renamed to
`pricing-disclosure.md` and promoted from `stub` (v0.1) through `draft`
(pre-release) to `implemented` (v0.2 release); `otd-pricing.json` was
deleted in favor of `pricing_disclosure.json`. Implementations migrating
from v0.1 should replace any `otd_pricing` references with
`ai.dmc12.automotive.pricing_disclosure`.

## 12. Authors

- Ben Reuling — Mark Miller Subaru (reference implementation, spec
  editor)
- Chris Hudson — Mark Miller Subaru, General Manager (co-author,
  capability scoping)

Individual capability front-matter credits additional contributors.

## 13. Acknowledgments and Prior Art

DMC-12 is built on, and aligned with, the open agent-commerce ecosystem.
Beyond the UCP / MCP / A2A / AP2 lineage described in §2 and `GOVERNANCE.md`,
two v0.3 refinements were directly informed by a peer standard:

- **Auto Agent Protocol (AAP)** — <https://autoagentprotocol.org>,
  Apache-2.0. AAP is a strict A2A v1.0 profile for automotive agents. Its
  approach to two problems shaped DMC-12 v0.3:
  1. **Error taxonomy** (§8) — the idea of pairing a compact, documented code
     set with a `retryable` flag and a per-error correlation id. DMC-12 keeps
     its own code names and response-body placement; we adopted the
     *structure*, not the strings.
  2. **Channel-scoped consent** — the idea of recording *which* contact
     channels a customer authorized and *when* that authorization lapses,
     rather than a bare boolean. DMC-12 implements this as the OPTIONAL
     `consent` object on `deal_handoff` v0.1.2, with its own field names and a
     hard non-breaking guarantee for the existing boolean.

DMC-12 and AAP are alignable peer standards: a doc-only field mapping between
`initiate_deal_handoff` and AAP's `lead.submit` (both ultimately targeting
ADF/XML) lives at
[`interop/aap-lead-submit-mapping.md`](./interop/aap-lead-submit-mapping.md).
AAP's license does not require attribution; we credit it because the designs
are good and the cross-pollination is principled.
