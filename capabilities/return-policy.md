---
capability: ai.dmc12.automotive.return_policy
version: 0.1.0
status: stub
authors:
  - ben-reuling
  - chris-hudson
---

# ai.dmc12.automotive.return_policy (STUB — v0.3+)

**Status: Not yet implemented.**

Exposes the dealer's return policy, lemon-law disclosures, and
cancellation windows in a structured form so shopping agents can include
"7-day return" or "no-questions-asked" policy as a ranking signal.

## Tool surface (tentative)

| Tool | Scope |
|---|---|
| `get_return_policy` | `inventory:read` |

## Open design questions

1. State-law overlay. State lemon-law protections are non-negotiable and
   may exceed the dealer's return policy. Does the capability return
   only dealer policy, or merged (dealer + state)?
2. Conditional returns. Some dealers offer no-questions returns only on
   new vehicles, or only if mileage < X. Does the capability express
   conditional policy, or is it a flat human-readable string?
3. Return-related fees. Restocking fees, per-mile charges — surface
   structured or leave to the policy text?
