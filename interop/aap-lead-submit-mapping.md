# Interop: DMC-12 `initiate_deal_handoff` ↔ AAP `lead.submit`

**Status:** doc-only (no runtime code). **Date:** 2026-05-26.

This note maps DMC-12's deal hand-off onto the **Auto Agent Protocol (AAP)**
lead-submission flow, and shows why the two standards converge cleanly at the
lead layer. It exists to signal alignment and to give an integrator fronting
both protocols a concrete translation table. **There is no shim, adapter, or
runtime dependency** — DMC-12 endpoints do not call AAP and vice versa.

## About AAP, and an honesty note

[AAP](https://autoagentprotocol.org) (Apache-2.0) is a peer automotive agent
standard — a strict A2A v1.0 profile. DMC-12 and AAP are **alignable peer
standards**: DMC-12 covers the full pre-sale funnel (inventory → quote →
reservation → hand-off → negotiation → pricing disclosure); AAP centers on the
agent-to-dealer **lead** protocol. They overlap at exactly one boundary — the
hand-off / lead submission — which is what this document maps.

The AAP column below is **representative**. AAP's published surface is light on
exact field-level schemas, so the AAP field names here describe AAP's
`lead.submit` *concept* rather than a verified wire contract. An integrator
MUST confirm names against AAP's own published schema before building. DMC-12's
columns and the ADF/XML bridge, by contrast, are authoritative (the latter is
the format DMC-12's reference implementation actually emits).

## The shared bridge: ADF/XML

Both standards ultimately serve the same downstream system: dealer CRMs ingest
**ADF 1.0 XML** leads (the automotive lead-routing lingua franca — DriveCentric,
VinSolutions, Elead, etc. all parse it). DMC-12's reference implementation
renders an `initiate_deal_handoff` into ADF and email-drops it to the store's
CRM mailbox; an AAP `lead.submit`, being a lead protocol for the same industry,
targets the same ADF shape. **Because both converge on ADF, a lead crosses
between them without semantic loss** — translate either protocol's payload into
ADF and the CRM sees an equivalent lead.

```
DMC-12 initiate_deal_handoff ─┐
                              ├─→  ADF 1.0 XML  ─→  dealer CRM
AAP    lead.submit          ──┘
```

## Field mapping — input

| DMC-12 `initiate_deal_handoff` | AAP `lead.submit` (representative) | ADF/XML element |
|---|---|---|
| *(vehicle of interest, resolved from `reservation_token`)* | `lead.vehicle` | `<vehicle interest="buy">` (`year`/`make`/`model`/`vin`/`stock`/`price`) |
| `reservation_token` | `lead.reference` / hold id | `<prospect><id source="…">` |
| `customer_contact.name` | `lead.customer.full_name` | `<contact><name part="first">` + `part="last"` |
| `customer_contact.phone` | `lead.customer.phone` | `<contact><phone type="voice">` |
| `customer_contact.email` | `lead.customer.email` | `<contact><email>` |
| `financing_preference` | `lead.financing` | `<comments>` (no native ADF field) |
| `trade_in_disclosed` + `trade_in.*` | `lead.trade` | `<vehicle interest="trade-in">` (+ partner appraisal in `<comments>`) |
| `notes` | `lead.comments` | `<customer><comments>` (CDATA) |
| `customer_consent` (bool, required `true`) | `lead.consent.granted` | consent block in `<comments>` |
| `consent.allowed_channels` | `lead.consent.channels` | consent block in `<comments>` |
| `consent.expires_at` | `lead.consent.expires_at` | consent block in `<comments>` |
| `consent.consent_text` | `lead.consent.text` | consent block in `<comments>` |

Notes:

- **Consent.** DMC-12's bare `customer_consent` boolean maps to AAP's
  consent-granted flag; DMC-12's OPTIONAL channel-scoped `consent` object
  (v0.1.2) lines up field-for-field with AAP's richer consent shape — which is
  precisely the AAP idea DMC-12 adopted (see `SPEC.md §13`). Neither standard
  has a native ADF element for consent, so both carry it in the human-readable
  `<comments>` block.
- **Trade-in.** Both protocols model an optional trade; both land it as a
  second `<vehicle interest="trade-in">` sibling in ADF. A partner-supplied
  appraisal is a hint in both directions — the dealer re-appraises.

## Field mapping — output / acknowledgment

| DMC-12 output | AAP `lead.submit` ack (representative) | Notes |
|---|---|---|
| `handoff_token` | `lead.id` / submission id | DMC-12's token doubles as the CRM cross-reference. |
| `status: "sent"` | `lead.status: "received"` | Lead accepted for human follow-up; not a closed sale in either model. |
| `sent_to_masked` | *(none standard)* | DMC-12-specific receipt aid. |
| `error_code` (on failure) | AAP error object | DMC-12's taxonomy (`SPEC.md §8`) is itself AAP-informed. |

## What does NOT map

- **Quote / reservation / negotiation / pricing-disclosure** — DMC-12
  capabilities with no AAP `lead.submit` equivalent. The mapping above is
  scoped to the hand-off ↔ lead boundary only.
- **Auth / discovery.** DMC-12 advertises via a UCP manifest + MCP/A2A; AAP is
  an A2A profile. An integrator bridges at the application layer, not the
  transport.

## Why doc-only

Keeping this a paper mapping preserves DMC-12's "stay separate, cherry-pick"
posture: DMC-12 remains the spec of record with its own vocabulary, auth, and
negotiation/consent moat, while still being demonstrably interoperable with a
peer standard at the one layer that matters for lead delivery. If a concrete
bridge is ever warranted, ADF is the obvious interchange format — but it is not
part of either spec's runtime surface today.
