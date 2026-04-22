---
capability: org.dmc12.automotive.trade_intake
version: 0.1.0
status: stub
extends: dev.ucp.shopping.checkout
authors:
  - ben-reuling
  - chris-hudson
---

# org.dmc12.automotive.trade_intake (STUB — v0.2+)

**Status: Not yet implemented.**

Accepts a structured trade-in description (VIN, mileage, condition flags,
photos) and returns either (a) a blind-bid appraisal range or (b) an
invitation-to-appraise (in-person appraisal required).

## Tool surface (tentative)

| Tool | Scope |
|---|---|
| `submit_trade_for_appraisal` | `trade:write` |
| `get_trade_appraisal_status` | `trade:read` |

## Open design questions

1. Which third-party vehicle-value sources does the capability rely on
   (KBB, MMR, Black Book, CarGurus IMV)? SHOULD the manifest declare the
   source so an agent can weight appraisal outputs?
2. Photo upload path. Does the dealer accept base64 images inline, or
   does the capability return a signed-URL upload target?
3. VIN-unknown trades. An agent representing a buyer who only knows
   year/make/model — how does the capability handle fuzzy trade intake?
