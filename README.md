<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="branding/dmc12-mark-darkmode.png">
    <img src="branding/dmc12-mark-blue.png" alt="DMC-12" width="160">
  </picture>
</p>

# DMC-12

**Automotive extensions to the [Universal Commerce Protocol (UCP)](https://developers.googleblog.com/en/under-the-hood-universal-commerce-protocol-ucp/).**

> 🌐 **Live reference implementation at Mark Miller Subaru** — landing page at
> **[dmc-12.ai](https://dmc-12.ai)** with connect buttons for Claude /
> ChatGPT / Gemini and a partner-onboarding contact.

DMC-12 defines the capabilities a dealership agent surface needs that the
UCP core does not cover: VIN-level inventory, asking-price quotes, soft
reservations, deal hand-off to a human sales manager, per-VIN negotiation
policies, itemized pricing disclosure, and (forthcoming) the trade-in
intake, test-drive scheduling, F&I menu, and return-policy extensions that
make retail vehicle commerce distinct from physical-goods checkout.

- **Landing page:** <https://dmc-12.ai>
- **Spec:** [`SPEC.md`](./SPEC.md) — canonical spec served at <https://dmc12.ai/specification/> (Cloudflare Worker proxy → this repo's `main` branch)
- **Capabilities:** [`capabilities/`](./capabilities/) — also at <https://dmc12.ai/specification/{capability}.md>
- **JSON Schemas (2020-12):** [`schemas/`](./schemas/) — also at <https://dmc12.ai/schemas/{capability}.json>
- **Reference manifest (Mark Miller Subaru):** [`examples/markmiller-manifest.json`](./examples/markmiller-manifest.json)
- **MCP Registry manifest:** [`server.json`](./server.json)

## Try it (as an AI agent)

The Mark Miller Subaru endpoint is live and discoverable through the MCP spec:

| Well-known | URL |
|---|---|
| MCP server card (SEP-1960) | <https://mm-inventory-mcp-572952183767.us-central1.run.app/.well-known/mcp> |
| A2A Agent Card (signed) | <https://mm-inventory-mcp-572952183767.us-central1.run.app/.well-known/agent-card.json> |
| UCP manifest | <https://mm-inventory-mcp-572952183767.us-central1.run.app/.well-known/ucp> |
| RFC 9728 Protected Resource Metadata | <https://mm-inventory-mcp-572952183767.us-central1.run.app/.well-known/oauth-protected-resource> |
| Agent Card JWKS | <https://mm-inventory-mcp-572952183767.us-central1.run.app/.well-known/jwks.json> |

Paste `https://mm-inventory-mcp-572952183767.us-central1.run.app/mcp` into
any OAuth-capable MCP client (Claude, Cursor, ChatGPT Connectors, Gemini)
and it will discover the rest automatically via DCR + PKCE.

## Relationship to UCP

DMC-12 is a UCP capability namespace (`ai.dmc12.automotive.*`). A dealer
who advertises a DMC-12 capability on their `/.well-known/ucp` manifest is
declaring that the endpoint honors both UCP's catalog/checkout semantics
and the automotive-specific data contracts defined here.

Payment-time mandate flow (AP2) is **out of scope** for v0.1. DMC-12
capabilities publish `payment.handlers: []` until AP2 lands.

## Status

**v0.6 (Current Release, 2026-06-10).** Reference implementation in
production at Mark Miller Subaru Midtown (Salt Lake City, UT).

Added in v0.6 — additive and non-breaking (one normative pattern
alignment on `inventory.store_code`; see SPEC §11 v0.6.0).

- `ai.dmc12.automotive.stores` → **capability 0.1.0** *(new)* — a read-only `list_stores` tool publishing the canonical name + structured address + website for each rooftop, so the `store_code` on every vehicle record resolves to a named, located dealership without guessing. Reuses the `inventory:read` scope — no new OAuth scope.
- `merchant.locations` enrichment — each manifest location now carries `address` + `website` alongside `store_code` + `display_name` (also corrects the MMS display name from "Salt Lake" to "Midtown").

See [`SPEC.md`](./SPEC.md) §16.

Added in v0.5 — additive for OTD-omitting payloads; the one optional `out_the_door` field changes shape (field-access compatible — `amount`/`currency` stay at the top level).

- `ai.dmc12.automotive.quote` → **capability 0.4.0** — the quote output's optional `out_the_door` estimate is now **itemized**: it changes from a bare `Money` total to an `OutTheDoorEstimate` (new in `common.json` 0.2.0) carrying `price_lines` (vehicle price + each fee/tax line), `fees_total`, `taxes_total`, and disclosure metadata (`estimate`, `jurisdiction`, `as_of`, `disclosure_form_url`). `subtotal` is omitted (derivable). The `out_the_door_estimate: true` pairing and the field's optionality are unchanged. No new tools, scopes, or fee-math change.

See [`SPEC.md`](./SPEC.md) §15.

Added in v0.4 — all additive and non-breaking:

- `ai.dmc12.automotive.inventory` → **capability 0.2.0** — `search_inventory` gains an optional `query` (structured-only search when omitted), agent-controlled `sort_by` / `sort_order`, and a `min_price` floor; `list_inventory` gains a `min_year` / `max_year` range. Vehicle record unchanged.
- `ai.dmc12.automotive.quote` → **capability 0.3.0** — the quote output gains an optional, non-binding `out_the_door` estimate (+ `out_the_door_estimate: true`), emitted only when the merchant has pricing disclosure enabled with a live fee schedule (itemized in v0.5, above)

See [`SPEC.md`](./SPEC.md) §14.

Added in v0.3 — both additive and non-breaking:

- `ai.dmc12.automotive.errors` — a cross-cutting error taxonomy: every tool error carries an `error_code`, a `retryable` flag, and a correlation `error_id`, layered additively over the legacy `error` string
- `ai.dmc12.automotive.deal_handoff` → v0.1.2 — optional channel-scoped `consent` object (authorized channels + enforced expiry + verbatim text); the bare `customer_consent` boolean is unchanged

Both are informed by the Auto Agent Protocol (AAP, [autoagentprotocol.org](https://autoagentprotocol.org)); see [`SPEC.md`](./SPEC.md) §13.

Capabilities implemented in v0.1:

- `ai.dmc12.automotive.inventory` — catalog extension with VIN, stock #, condition, mileage
- `ai.dmc12.automotive.quote` — 30-minute price quote at listed asking price
- `ai.dmc12.automotive.reservation` — 30-minute soft hold on a VIN
- `ai.dmc12.automotive.deal_handoff` — hand a reservation to a live sales manager

Added in v0.2:

- `ai.dmc12.automotive.negotiation` — three policies (`fixed`, `stepwise`, `bestoffer`) declared per-VIN; `submit_offer`, `submit_counter_offer`, `accept_offer`, `reject_offer` tools
- `ai.dmc12.automotive.pricing_disclosure` — itemized price lines (vehicle, taxes, doc fees, title, registration), `out_the_door` estimate, `disclosure_form_url` slot for state-mandated forms; replaces v0.1's `otd_pricing` stub

Capabilities still stubbed for future minor versions:

- `ai.dmc12.automotive.trade_intake` — structured trade-in appraisal request
- `ai.dmc12.automotive.test_drive` — test-drive scheduling
- `ai.dmc12.automotive.fni_menu` — F&I product menu
- `ai.dmc12.automotive.return_policy` — lemon / return / cancellation policy

## License

[MIT](./LICENSE).

## Who authors this

DMC-12 was drafted in April 2026 by Ben Reuling (AI Systems Engineer)
and Chris Hudson (General Manager) of Mark Miller Subaru as the
automotive reference extension for UCP. Individual capability authorship is attributed in each capability's
front-matter. Contributions welcome — see [`CONTRIBUTING.md`](./CONTRIBUTING.md).
