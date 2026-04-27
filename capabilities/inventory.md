---
capability: ai.dmc12.automotive.inventory
version: 0.1.0
status: implemented
extends: dev.ucp.shopping.catalog
authors:
  - ben-reuling
  - chris-hudson
---

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
