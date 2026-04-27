---
capability: org.dmc12.automotive.otd_pricing
version: 0.1.0
status: stub
extends: dev.ucp.shopping.checkout
authors:
  - ben-reuling
  - chris-hudson
---

# org.dmc12.automotive.otd_pricing (STUB — v0.2+)

**Status: Not yet implemented.** Do NOT declare this capability on a UCP
manifest until the reference implementation ships.

Returns a fully-itemized out-the-door (OTD) price for a specific VIN,
including:

- Taxes (state, city, county) based on a buyer ZIP
- Dealer doc fee (compliance-capped per state)
- DMV / title / registration fees
- Optional add-ons (paint protection, wheel locks, etc.)
- Finance & insurance products (cross-reference `fni_menu` if available)

The `asking_price` field on the inventory capability is the listed price.
The OTD capability exists because the "real" price — the signed-on-line
price — is a multi-line itemized calculation that agents cannot derive
from public data.

## Why this is a separate capability (not bundled into quote)

Taxes and DMV fees require the buyer's ZIP and, for some states, whether
the vehicle leaves the state. An anonymous quote cannot compute OTD; an
agent with consent (AP2 Intent Mandate) or explicit `customer_contact`
can.

## Open design questions (addressed in v0.2 PR)

1. Per-state tax engine. Where does the merchant source authoritative
   tax tables?
2. Agent-visible vs. not-visible line items. Should dealer add-ons that
   the customer hasn't opted into appear in the OTD response?
3. Doc-fee cap enforcement. Some states (NY, TX, CA) cap doc fees by
   statute — the manifest MAY declare its capped rate.
