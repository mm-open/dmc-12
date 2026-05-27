---
capability: ai.dmc12.automotive.inventory
version: 0.2.0
status: implemented
extends: dev.ucp.shopping.catalog
authors:
  - ben-reuling
  - chris-hudson
---

> **v0.2 capability bump (DMC-12 v0.4 cut, additive/non-breaking).** The
> vehicle record (output) is unchanged from v0.1. The 0.1.0 → 0.2.0 bump
> covers additive **search ergonomics** on the input side: `query` is now
> OPTIONAL on `search_inventory` (structured-only search when omitted),
> agent-controlled `sort_by` / `sort_order`, a `min_price` floor on search,
> and a `min_year` / `max_year` range on `list_inventory`. Every v0.1 input
> payload still validates — the new fields are all optional.

# ai.dmc12.automotive.inventory

Extends the UCP `dev.ucp.shopping.catalog` capability with the fields a
vehicle-shopping agent needs: VIN, stock number, condition, mileage,
drivetrain, body style, and days-on-lot.

## Tool surface

A merchant exposing this capability SHOULD publish three MCP tools that
operate over the inventory contract:

| Tool | Scope | Purpose |
|---|---|---|
| `search_inventory` | `inventory:read` | Semantic NL search — returns ranked vehicles with similarity scores. |
| `get_vehicle_by_vin` | `inventory:read` | Single-VIN lookup. |
| `list_inventory` | `inventory:read` | Structured filter query (year/make/model/price window). |
| `check_availability` | `inventory:read` | Batch status for up to 50 VINs. |

## Search & list inputs (v0.2)

See [`schemas/inventory.json`](https://dmc12.ai/schemas/inventory.json) for the
discriminated `oneOf` of tool inputs. The v0.2 input additions:

| Field | Tool | Notes |
|---|---|---|
| `query` | `search_inventory` | **OPTIONAL.** With a query, results are semantically ranked (relevance). Omit it for a purely structured filter+sort — no semantic ranking, and `similarity` comes back `null`. |
| `sort_by` | `search_inventory` | `relevance` (default) \| `price` \| `mileage` \| `year`. `relevance` requires a `query`; with no query it normalizes to `price`. |
| `sort_order` | `search_inventory` | `asc` (default) \| `desc`. |
| `min_price` | `search_inventory` | Lower price bound (search already had `max_price`). |
| `min_year` / `max_year` | `list_inventory` | Inclusive model-year range, complementing the existing exact `year`. |

**Availability is implicit.** Both `search_inventory` and `list_inventory`
return only vehicles whose `status` is `available` — sold, pending, and
reserved units are excluded server-side and never appear in results.

**Filters apply before `limit`.** Structured filters (`condition`, year
range, price window, `max_mileage`) are evaluated server-side *before* the
result set is truncated to `limit`, so a filtered query returns up to `limit`
matching rows when enough exist (no post-`limit` shrinkage).

**Condition filter.** The spec's `ConditionFilter` enumerates seven values
(see SPEC.md §4.2). A conformant deployment MAY accept a subset — the Mark
Miller reference deployment currently accepts `new` / `used` / `cpo` / `any`
(`cpo` aliases `certified`); `certified` / `rental` / `demo` are not surfaced
in its inventory mix. The vehicle-record `condition` output enum is unaffected.

## Vehicle record (response)

See [`schemas/inventory.json`](https://dmc12.ai/schemas/inventory.json) for the JSON
Schema.

| Field | Type | Required | Notes |
|---|---|---|---|
| `vin` | string | yes | 17 chars, `^[A-HJ-NPR-Z0-9]{17}$` |
| `store_code` | string | yes | dealer rooftop code (`MMS`, `MMU`, etc.) |
| `stock_number` | string | no | dealer-internal stock # |
| `condition` | enum | yes | `new` \| `used` \| `certified` \| `rental` \| `demo` |
| `year` | integer | yes | model year |
| `make` | string | yes | |
| `model` | string | yes | |
| `trim` | string | no | |
| `body_style` | string | no | e.g. `Sedan`, `Wagon`, `SUV`, `Truck` |
| `exterior_color` | string | no | |
| `interior_color` | string | no | |
| `transmission` | string | no | |
| `drivetrain` | enum | no | `AWD` \| `FWD` \| `RWD` \| `4WD` |
| `fuel_type` | string | no | `Gasoline`, `Hybrid`, `PHEV`, `BEV`, `Diesel` |
| `mileage` | integer | no | miles, `null` for new |
| `asking_price` | number | yes | merchant's listed price |
| `msrp` | number | no | manufacturer's suggested retail price |
| `status` | enum | yes | `available` \| `pending` \| `sold` \| `off-lot` |
| `days_on_lot` | integer | no | |
| `stocked_date` | date | no | ISO 8601 |
| `photos` | array<string> | no | public image URLs |
| `description` | string | no | marketing description |

Private fields (vehicle cost, hold-back, floor assist, salesperson
assignment) MUST NOT be returned. The reference implementation maintains
a PUBLIC_FIELDS allowlist at the response boundary.

## Inventory accuracy

Merchants MUST publish `merchant.inventory_accuracy.freshness_sla_seconds`
on the UCP manifest. A DMC-12 implementation without a declared SLA is
non-conformant — agents may refuse to transact against it.
