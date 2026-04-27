---
capability: ai.dmc12.automotive.negotiation
version: 0.1.0
status: implemented
extends: ai.dmc12.automotive.quote
authors:
  - ben-reuling
  - chris-hudson
---

# negotiation

**Capability:** `ai.dmc12.automotive.negotiation`
**Version:** `0.1.0`
**Status:** implemented
**Schema:** [`schemas/negotiation_policy.json`](https://dmc12.ai/schemas/negotiation_policy.json)
**Extends:** `ai.dmc12.automotive.quote`

## Summary

DMC-12 negotiation supports three policies (`fixed`, `stepwise`, `bestoffer`) declared per-VIN. The `negotiation_policy.json` schema defines the data shape a dealer writes to per-vehicle policy storage. Buyer-agent-facing tools (`submit_offer`, `submit_counter_offer`, `accept_offer`, `reject_offer`) are exposed by DMC-12-conformant services with `quote:negotiate` scope.

The dealer's private parameters (`min_price` for stepwise, `reserve_price` for bestoffer) are part of the schema because they're declared at policy-config time, but they are **never returned to a buyer agent**. The public manifest declares only the policy *type* and (for bestoffer) the `expires_at`.

## Tools (DMC-12-conformant servers SHOULD expose)

| Tool | Required scope | Input | Output |
|---|---|---|---|
| `submit_offer` | `quote:negotiate` | `vin`, `proposed_price`, optional `context_id` | `offer.json` (accepted / countered / rejected) |
| `submit_counter_offer` | `quote:negotiate` | `parent_offer_id`, `proposed_price` | `offer.json` or `rejection.json` |
| `accept_offer` | `quote:negotiate` + `deal:handoff` | `offer_id`, `customer_consent: true` | `acceptance.json` (+ optional reservation token) |
| `reject_offer` | `quote:negotiate` | `offer_id`, `reason_code` | `rejection.json` |

## Policy types

- `fixed` — no negotiation. Same as v0.1; agents use `request_quote`.
- `stepwise` — bounded if/then ladder; engine and buyer alternate counters until they meet or `max_rounds` runs out.
- `bestoffer` — single-shot. Engine accepts iff `proposed_price >= reserve_price`.

## Determinism

DMC-12 SERVERS MUST evaluate negotiation rounds deterministically (no LLM in the loop). Every offer evaluation is a pure function of `(policy_snapshot, prior_offers, proposed_price, NOW)`. Auditors can replay any thread from inputs alone.
