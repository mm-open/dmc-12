# DMC-12 Specification

**Version:** 0.1.0 (Draft)
**Date:** 2026-04-21
**Status:** Reference implementation at Mark Miller Subaru Midtown.

DMC-12 is an automotive extension set to the
[Universal Commerce Protocol (UCP)](https://developers.googleblog.com/en/under-the-hood-universal-commerce-protocol-ucp/).
UCP standardizes agent discovery (`/.well-known/ucp`), transport (MCP +
A2A), and payment mandates (AP2). DMC-12 defines the capabilities a
dealership agent surface needs on top of that base: VIN-level inventory,
asking-price quotes, soft reservations, and deal hand-off to a live sales
manager. It also stubs the automotive-specific capabilities (OTD pricing,
trade intake, test-drive, F&I menu, return policy) that require DMS writes
to implement but can be declared on a manifest as capabilities are brought
online.

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
| `dev.ucp.shopping.catalog` | `org.dmc12.automotive.inventory` *(implemented v0.1)* | Adds VIN, stock #, condition, mileage, drivetrain, body_style, days_on_lot. |
| `dev.ucp.shopping.checkout` | `org.dmc12.automotive.quote` + `.reservation` + `.deal_handoff` *(all implemented v0.1)* | Automotive checkout is a human-closes-the-deal flow — the reservation + handoff pair replaces direct payment capture in v0.1. |
| `dev.ucp.shopping.checkout` | `org.dmc12.automotive.otd_pricing` + `.trade_intake` *(stub — v0.2+)* | Out-the-door itemization and trade-in intake also extend checkout. Schemas are published as stubs so they show up in capability indexing; `additionalProperties: false` prevents accidental PII leakage through an undefined surface. |
| *(none — new namespace)* | `org.dmc12.automotive.test_drive` + `.fni_menu` + `.return_policy` *(stub — v0.2+)* | Out-of-band from UCP checkout; they describe the retail wrapper around the vehicle sale rather than the transaction itself. |

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

v0.2+ will define `org.dmc12.automotive.otd_pricing` and
`org.dmc12.automotive.trade_intake` as the line-item schemas an AP2 Cart
Mandate can reference, and clarify which DMC-12 capabilities require
which AP2 mandate types. AP2 canonical URL: <http://goo.gle/ap2>.

## 3. Capability Namespace Rules

- `org.dmc12.automotive.*` is reserved for this specification. Only the
  capabilities listed in [`capabilities/`](./capabilities/) may claim this
  prefix. New capabilities require a PR to this repo.
- Dealer- or vendor-specific capabilities SHOULD use a
  `com.<dealer-or-vendor>.*` prefix. Example:
  `com.markmillersubaru.service_scheduling`.
- Manifests MAY advertise both a UCP core capability and its DMC-12
  extension. Agents SHOULD prefer the DMC-12 extension when available.

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
  add-ons). That capability is reserved for v0.2 as
  `org.dmc12.automotive.otd_pricing`.

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
    "name": "org.dmc12.automotive.inventory",
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

`org.dmc12.automotive.deal_handoff` is the **single exception**. By
construction, a deal hand-off transfers customer contact information
(name, phone, email) to the dealer's sales team for human follow-up.
Implementations MUST:

1. Accept the PII only inside the `customer_contact` block of the
   `deal_handoff` tool input, never in other DMC-12 capabilities.
2. Redact the PII before writing to any audit log (hash + last-4 of phone
   only).
3. Record a `customer_consent` boolean (v0.1) or an AP2 Intent Mandate
   artifact (v0.2+) alongside the hand-off.
4. Honor deletion requests per the merchant's privacy policy.

## 8. Versioning

DMC-12 follows [Semantic Versioning 2.0.0](https://semver.org/). The
manifest's capability-level `version` field is independent of this
document's version — a capability at v0.1.0 may be published against
DMC-12 spec v0.1.0, v0.2.0, etc. once the backward-compat rules below are
clarified in v1.0.0.

**Breaking changes** in v0.x are allowed at any minor version bump while
this specification is in Draft. The first non-Draft release will be v1.0.0.

## 9. Reference Implementation

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

## 10. Authors

- Ben Reuling — Mark Miller Subaru (reference implementation, spec
  editor)
- Chris Hudson — Mark Miller Subaru, General Manager (co-author,
  capability scoping)

Individual capability front-matter credits additional contributors.
