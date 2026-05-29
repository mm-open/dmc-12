# DMC-12 Specification

**Version:** 0.5.0
**Date:** 2026-05-29
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
Protocol (AAP); see §13. v0.4 adds three more additive, non-breaking
refinements — `search_inventory` ergonomics (optional `query`,
agent-controlled `sort_by`/`sort_order`, a `min_price` floor),
`list_inventory` year-range filters, and an OPTIONAL out-the-door
estimate on the `quote` output; see §14. v0.5 makes that out-the-door
estimate **itemized** — the `quote` output's `out_the_door` field carries the
full `price_lines` + fee/tax totals + disclosure metadata
(`OutTheDoorEstimate`), not just a bare total; see §15. It also stubs the automotive-specific
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
| `dev.ucp.shopping.catalog` | `ai.dmc12.automotive.inventory` *(implemented; capability v0.2.0 at the v0.4 cut)* | Adds VIN, stock #, condition, mileage, drivetrain, body_style, days_on_lot. v0.2.0 adds additive search/list ergonomics (optional `query`, `sort_by`/`sort_order`, `min_price`, `min_year`/`max_year`); the vehicle record is unchanged. See §14. |
| `dev.ucp.shopping.checkout` | `ai.dmc12.automotive.quote` + `.reservation` + `.deal_handoff` *(all implemented; `.quote` at capability v0.4.0 carries an optional itemized OTD estimate (`OutTheDoorEstimate`) on output; `.deal_handoff` at v0.1.2 adds optional structured `trade_in` and optional channel-scoped `consent`)* | Automotive checkout is a human-closes-the-deal flow — the reservation + handoff pair replaces direct payment capture in v0.1. |
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

The **input** filter (`ConditionFilter` in `schemas/inventory.json`) is a
superset: the five canonical conditions plus `any` (wildcard) and the legacy
alias `cpo` (maps to `certified`) — seven values. A conformant deployment MAY
accept only a subset of `ConditionFilter` at the input boundary. The Mark
Miller reference deployment currently accepts `new` / `used` / `cpo` / `any`
(its inventory mix carries no `certified` / `rental` / `demo` units to filter
on); this is a deployment choice, not a spec change — the canonical filter enum
remains the seven-value superset.

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
- As of v0.5 the `quote` output also carries this itemized breakdown inline:
  its OPTIONAL `out_the_door` field is an `OutTheDoorEstimate` (the disclosure
  shape flattened — total promoted to top-level `amount`/`currency`, with
  `price_lines` + `fees_total`/`taxes_total` + metadata alongside), so an agent
  gets the bridge from `quoted_price` to the OTD total without a second call.
  See §15. `get_pricing_disclosure` remains the standalone, `subtotal`-bearing
  source of truth.

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

### v0.5.0 — current release (2026-05-29)

v0.5 promotes the v0.4 OTD-on-quote estimate from a bare total to a fully
**itemized** object, carrying through the breakdown the reference
implementation already computes. It is additive for payloads that omit
`out_the_door`; for payloads that carried it, the field's shape changes (a
breaking change to that one optional field, permitted pre-1.0 — see §15
Compatibility, field-access preserved). Full detail in §15. In brief:

- **`ai.dmc12.automotive.quote` → capability v0.4.0** — the quote output's
  OPTIONAL `out_the_door` field changes from a bare `Money` total to an
  `OutTheDoorEstimate` (new in `common.json` v0.2.0). It carries `price_lines`
  (vehicle price + each fee/tax line), `fees_total`, `taxes_total`, and
  disclosure metadata (`estimate`, `jurisdiction`, `as_of`,
  `disclosure_form_url`) alongside the OTD `amount`/`currency`. `subtotal` is
  omitted (derivable as `amount - taxes_total.amount`). The `out_the_door_estimate:
  true` pairing and the field's optionality are unchanged, so a v0.1–v0.4 quote
  payload (no OTD) still validates.

No new tools, no new scopes, no namespace change, no fee-math change.

### v0.4.0 (2026-05-26)

v0.4 is an additive, non-breaking feature cut that reconciles the published
spec with search/list ergonomics and OTD-on-quote groundwork already running
in the reference implementation. Full detail in §14. In brief:

- **`ai.dmc12.automotive.inventory` → capability v0.2.0** — `search_inventory`
  gains an OPTIONAL `query` (structured-only search when omitted),
  agent-controlled `sort_by` / `sort_order`, and a `min_price` floor;
  `list_inventory` gains a `min_year` / `max_year` range. The vehicle record
  (output) is unchanged. Every v0.1 input still validates.
- **`ai.dmc12.automotive.quote` → capability v0.3.0** — the quote output gains
  an OPTIONAL `out_the_door` (`Money`) estimate plus `out_the_door_estimate:
  true`, emitted only when the merchant has pricing disclosure enabled with a
  live fee schedule. Absent otherwise; a v0.1/v0.2 quote payload still validates.

No new tools, no namespace change, no breaking change.

### v0.3.0 (2026-05-26)

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

## 14. v0.4 Additions

v0.4 is an additive, non-breaking cut. It publishes input/output refinements
that the reference implementation already shipped service-local, so a
spec-following agent or another dealer's fork can use the same fields without
reading the live Pydantic models. All three additions are OPTIONAL — strict
validation (`additionalProperties: false`) is preserved on every affected
schema, and every pre-v0.4 payload still validates.

### 14.1 `search_inventory` ergonomics (`inventory` → 0.2.0)

- **`query` is now OPTIONAL.** With a `query`, results are semantically ranked
  (relevance). With no `query`, the server runs a purely structured filter +
  sort — no semantic-ranking round-trip — and the per-record `similarity` is
  `null`. (Previously `query` was required.)
- **`sort_by`** — `relevance` (default) \| `price` \| `mileage` \| `year`.
  `relevance` requires a `query`; with no query it normalizes to `price`.
- **`sort_order`** — `asc` (default) \| `desc`.
- **`min_price`** — lower price bound (search already accepted `max_price`).

### 14.2 `list_inventory` year range (`inventory` → 0.2.0)

- **`min_year` / `max_year`** — an inclusive model-year range, complementing
  the existing exact `year` filter (use the range fields for "2020 and newer"
  style queries).

### 14.3 Availability + filter ordering (clarification, not a schema change)

Both `search_inventory` and `list_inventory` return only vehicles whose
`status` is `available`; sold, pending, and reserved units are excluded
server-side and never appear in results. Structured filters (`condition`, year
range, price window, `max_mileage`) are evaluated **before** the result set is
truncated to `limit`, so a filtered query returns up to `limit` matching rows
when enough exist.

### 14.4 Out-the-door estimate on `quote` output (`quote` → 0.3.0)

The `request_quote` output MAY carry an OPTIONAL `out_the_door` (`Money`,
`$ref` to `common.json#/$defs/Money`) plus `out_the_door_estimate: true`. This
is a **best-effort, non-binding estimate** derived from `quoted_price` plus the
merchant's published fee schedule (tax + doc + title + registration) — it is
not a second firm price; `quoted_price` stays the only committed figure. Both
fields are present only when the merchant has pricing disclosure enabled with a
live fee schedule, and are **omitted** otherwise (the Mark Miller reference
deployment runs with disclosure off, so it emits neither today). Their absence
is valid under the v0.3 quote schema. For the itemized line-item breakdown, see
`ai.dmc12.automotive.pricing_disclosure`.

> **Superseded in v0.5.** The bare-`Money` `out_the_door` described here was
> itemized in v0.5 — the field is now an `OutTheDoorEstimate`. See §15.4.

## 15. v0.5 Additions

v0.5 carries the itemized OTD breakdown the reference implementation already
computes (in `compose_disclosure`) onto the `quote` output, so an agent gets the
line items bridging `quoted_price` to the OTD total inline — no second
`get_pricing_disclosure` call required.

**Compatibility.** The `out_the_door` field stays OPTIONAL, so any quote payload
that **omits** it (every v0.1–v0.4 payload that didn't carry an OTD, including
MM's until 2026-05-27) still validates unchanged. For payloads that **did**
carry the OTD, the field's *shape* changed — `$ref` `Money` →
`OutTheDoorEstimate` — so the old bare-`{amount, currency}` total no longer
validates against the v0.5 `quote` schema. That is a breaking change to that one
optional field, permitted under the pre-1.0 SemVer policy (§9). It is
deliberately **field-access compatible**: `amount`/`currency` remain at the top
level of `OutTheDoorEstimate`, exactly where the bare `Money` total sat, so a
consumer that only read `out_the_door.amount` is unaffected (see §15.4).

### 15.1 New shared def: `OutTheDoorEstimate` (`common.json` → 0.2.0)

`common.json` gains an `OutTheDoorEstimate` `$def` composed from the existing
`PriceLine` / `Money` primitives — no new primitives. It is the standalone
`pricing_disclosure` shape **flattened**: the OTD total is promoted to
top-level `amount`/`currency`, and `price_lines` + `fees_total` /
`taxes_total` + `estimate` / `jurisdiction` / `as_of` /
`disclosure_form_url` (optional) are carried alongside. `subtotal` is omitted —
derivable as `amount - taxes_total.amount`. `estimate` is `const: true`.

### 15.2 `quote` output `out_the_door` is now itemized (`quote` → 0.4.0)

The `request_quote` output's OPTIONAL `out_the_door` field changes its `$ref`
from `common.json#/$defs/Money` to `common.json#/$defs/OutTheDoorEstimate`. The
`out_the_door_estimate: true` pairing (`dependentRequired` in both directions)
is unchanged. Presence rules are unchanged: emitted only when the merchant has
pricing disclosure enabled with a live fee schedule, omitted otherwise.

### 15.3 No fee-math, scope, or tool change

The itemization is a pure carry-through of data `compose_disclosure` already
produces. No new tools, no new OAuth scopes, no namespace change. `quoted_price`
remains the only committed figure; the OTD is always a non-binding estimate.

### 15.4 Relationship to §14.4

§14.4 (v0.4) introduced `out_the_door` as a bare `Money` total. v0.5 itemizes
it. An agent that only read the total continues to work — `amount`/`currency`
sit at the top level of `OutTheDoorEstimate` exactly where the bare `Money`
total used to be.
