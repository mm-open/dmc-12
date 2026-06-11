---
capability: ai.dmc12.automotive.stores
version: 0.1.0
status: implemented
authors:
  - ben-reuling
---

# ai.dmc12.automotive.stores

Publishes the canonical, public metadata for each rooftop (store) a merchant
operates: a human-readable name, a structured postal address, and a website.
Every vehicle record carries a `store_code` (`MMS`, `MMU`, …); this capability
is the authoritative source for resolving that code to *which* dealership it
names — so an agent never has to guess the store's name, location, or URL.

## Tool surface

| Tool | Scope | Input | Output |
|---|---|---|---|
| `list_stores` | `inventory:read` (public-rail readable) | *(none)* | `stores.json` |

`list_stores` takes no parameters and returns every rooftop the merchant
operates. It reuses the existing `inventory:read` scope — there is no new
OAuth scope — because store metadata is the same public, read-only class of
data as the inventory it annotates.

## Store record (response)

See [`schemas/stores.json`](https://dmc12.ai/schemas/stores.json) for the JSON
Schema. The output is `{ "stores": [StoreRecord, …], "count": <int> }`.

| Field | Type | Required | Notes |
|---|---|---|---|
| `store_code` | string | yes | Dealer rooftop code, `^[A-Z]{2,6}$`. **Matches the `store_code` on every vehicle record** (`search_inventory` / `list_inventory` / `get_vehicle_by_vin`). |
| `name` | string | yes | Public display name of the rooftop. |
| `address.street` | string | yes | Street address. |
| `address.city` | string | yes | City. |
| `address.state` | string | yes | USPS two-letter state code, `^[A-Z]{2}$`. |
| `address.postal_code` | string | yes | ZIP / postal code (`#####` or `#####-####`). |
| `website` | string (uri) | yes | Rooftop website. |

## The `store_code` join guarantee

The `store_code` returned here is the **same** value an agent sees on every
vehicle record from the inventory capability. An agent that has a vehicle in
hand can call `list_stores` once, build a `{store_code → StoreRecord}` map, and
resolve the vehicle's home rooftop — name, address, and website — without a
second per-vehicle lookup and without inferring the dealership from the code.

## Phone intentionally omitted (v0.1)

This capability publishes **name + address + website only**. A phone number
(and store hours) are deliberately out of scope for v0.1: the address +
website are sufficient to identify, locate, and link a rooftop, and a public
sales/service phone routes through call-tracking that changes more often than
the spec should. They MAY be added additively in a later minor version.

## Structured address

`address` is a structured object (not a flat string) so the JSON Schema can
validate each component and an agent can geocode or filter by city / state /
ZIP without parsing free text.
