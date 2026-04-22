---
capability: org.dmc12.automotive.reservation
version: 0.1.0
status: implemented
extends: dev.ucp.shopping.checkout
authors:
  - ben-reuling
  - chris-hudson
---

# org.dmc12.automotive.reservation

Converts an open quote into a 30-minute soft hold on a VIN. A reservation
is **not** a binding purchase commitment — a human closes the deal.
Reservations exist so an agent can temporarily protect a VIN from being
sold out from under an in-progress transaction.

## Tool surface

| Tool | Scope | Purpose |
|---|---|---|
| `create_reservation` | `reservation:write` | Convert a quote to a soft hold. |
| `release_reservation` | `reservation:write` | Release a reservation you own. Idempotent. |
| `get_reservation_status` | `reservation:write` | Read-your-own-writes on a reservation. |

## create_reservation

### Input

See [`schemas/reservation.json`](../schemas/reservation.json).

| Field | Type | Required | Notes |
|---|---|---|---|
| `quote_id` | string (UUID) | yes | Open quote owned by the calling agent. |
| `customer_ref` | string | no | Opaque agent-side reference, max 200 chars — MUST NOT contain PII. |

### Output

| Field | Type |
|---|---|
| `reservation_token` | string (opaque, ~64 chars) |
| `vin` | string |
| `reserved_price` | number |
| `created_at` | string (ISO 8601) |
| `expires_at` | string (ISO 8601) |
| `status` | enum: `active` |
| `terms` | string (human-readable) |

## Invariants

1. **One active reservation per VIN.** Concurrent attempts on the same
   VIN return `{"error": "vin_already_reserved"}` — enforced by a unique
   partial index, not application logic.
2. **Reservations auto-expire** at `expires_at`. Expired reservations do
   NOT keep the VIN held; the associated quote is also closed.
3. **Per-agent daily budget.** Implementations MUST enforce a
   `max_reservations_per_day` limit per agent to prevent inventory
   denial-of-service by a hostile or malfunctioning agent.
4. **Cross-agent reads are denied** unless the caller has an admin scope
   (reference implementation uses `inventory:admin`).

## release_reservation

Idempotent: calling release on an already-closed reservation returns
`{"status": <existing-status>, "already_closed": true}` rather than an
error.
