---
capability: org.dmc12.automotive.test_drive
version: 0.1.0
status: stub
authors:
  - ben-reuling
  - chris-hudson
---

# org.dmc12.automotive.test_drive (STUB — v0.2+)

**Status: Not yet implemented.**

Schedules a test drive appointment against a specific VIN at a specific
dealer rooftop. Returns a confirmation record that a human consumer can
display to the service advisor on arrival.

## Tool surface (tentative)

| Tool | Scope |
|---|---|
| `list_test_drive_slots` | `schedule:read` |
| `book_test_drive` | `schedule:write` |
| `cancel_test_drive` | `schedule:write` |

## Open design questions

1. Does a test drive require a driver's-license upload step? If so,
   this capability intersects PII handling like `deal_handoff`.
2. Multi-vehicle test drives (comparison shopping) — single booking or
   multiple bookings?
3. Dealer-employee dispatch. Is the sales associate assigned at booking
   time, or at vehicle-key-handoff time?
