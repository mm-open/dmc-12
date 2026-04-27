---
capability: ai.dmc12.automotive.pricing_disclosure
version: 0.1.0
status: draft
authors:
  - ben-reuling
  - chris-hudson
---

# pricing-disclosure

**Capability:** `ai.dmc12.automotive.pricing_disclosure`
**Version:** `0.1.0`
**Status:** draft (was `stub` as `otd-pricing` in v0.1)
**Schema:** [`schemas/pricing_disclosure.json`](https://dmc12.ai/schemas/pricing_disclosure.json)

## Summary

`get_pricing_disclosure(vin)` returns an itemized breakdown of price lines (vehicle, taxes, doc fees, title, registration, etc.), each tagged with a `kind` and `payee`, plus a subtotal, taxes total, fees total, and out-the-door estimate.

The disclosure is explicitly marked `estimate: true` by default. It is not a binding offer — that lives on the (separate) `offer.json` schema. The `disclosure_form_url` slot is where a state-mandated transaction disclosure form (Utah HB0194 or equivalent) links from.

## Tool (DMC-12-conformant servers SHOULD expose)

| Tool | Required scope | Input | Output |
|---|---|---|---|
| `get_pricing_disclosure` | `pricing:read` (public-rail readable) | `vin` | `pricing_disclosure.json` |

## Public rail

Unlike negotiation tools, `get_pricing_disclosure` is callable on the public rail. The legal posture: an itemized, structured, non-binding disclosure published at the buyer-agent inquiry moment is the right surface for state UDAP exposure (the FTC's CARS Rule was vacated 2025-01-27 and formally withdrawn from the Federal Register 2026-02-12, leaving state law as the operative bar).

## Field semantics

- `price_lines`: array of `PriceLine` (each has `label`, `kind` ∈ `{vehicle_price, tax, title, registration, doc, addon, transport, rebate, discount, trade_credit, down_payment, lien_payoff, interest}`, `payee` ∈ `{government, dealer, manufacturer, third_party}`, `amount`, optional `statutory_basis`, `negotiable: bool`).
- `jurisdiction`: ISO 3166-2 (e.g., `US-UT`).
- `estimate: true` by default; setting `false` requires the dealer to commit to the OTD total.
- `disclosure_form_url`: optional URL to a state-mandated disclosure form.
