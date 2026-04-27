---
capability: ai.dmc12.automotive.fni_menu
version: 0.1.0
status: stub
authors:
  - ben-reuling
  - chris-hudson
---

# ai.dmc12.automotive.fni_menu (STUB — v0.3+)

**Status: Not yet implemented.**

Returns the finance & insurance (F&I) product menu available at a
specific dealer rooftop, along with pricing ranges and coverage
summaries. Agents can use this to pre-shop protection products without
sitting through the F&I office walkthrough.

## Scope

- Extended service contracts (ESC / VSC)
- GAP insurance
- Tire & wheel protection
- Paint protection
- Pre-paid maintenance
- Key replacement

## Tool surface (tentative)

| Tool | Scope |
|---|---|
| `list_fni_products` | `fni:read` |
| `get_fni_product_details` | `fni:read` |

## Open design questions

1. Regulatory disclosures. Each state has different disclosure
   requirements for F&I products. Does the manifest declare state
   compliance?
2. Product bundling. Dealers often sell bundles — does the capability
   expose bundle pricing or only individual items?
3. Provider attribution. GAP from Zurich differs from GAP from American
   Financial — agents MAY want to know the underwriter.
