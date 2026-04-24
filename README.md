# DMC-12

**Automotive extensions to the [Universal Commerce Protocol (UCP)](https://developers.googleblog.com/en/under-the-hood-universal-commerce-protocol-ucp/).**

> 🌐 **Live reference implementation at Mark Miller Subaru** — landing page at
> **[dmc-12.ai](https://dmc-12.ai)** with connect buttons for Claude /
> ChatGPT / Gemini and a partner-onboarding contact.

DMC-12 defines the capabilities a dealership agent surface needs that the
UCP core does not cover: VIN-level inventory, asking-price quotes, soft
reservations, deal hand-off to a human sales manager, and (forthcoming) the
out-the-door pricing, trade-in intake, test-drive scheduling, F&I menu, and
return-policy extensions that make retail vehicle commerce distinct from
physical-goods checkout.

- **Landing page:** <https://dmc-12.ai>
- **Spec:** [`SPEC.md`](./SPEC.md)
- **Capabilities:** [`capabilities/`](./capabilities/)
- **JSON Schemas (2020-12):** [`schemas/`](./schemas/)
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

DMC-12 is a UCP capability namespace (`org.dmc12.automotive.*`). A dealer
who advertises a DMC-12 capability on their `/.well-known/ucp` manifest is
declaring that the endpoint honors both UCP's catalog/checkout semantics
and the automotive-specific data contracts defined here.

Payment-time mandate flow (AP2) is **out of scope** for v0.1. DMC-12
capabilities publish `payment.handlers: []` until AP2 lands.

## Status

**v0.1 (Draft, 2026-04-21).** Reference implementation in production at
Mark Miller Subaru Midtown (Salt Lake City, UT).

Capabilities implemented in v0.1:

- `org.dmc12.automotive.inventory` — catalog extension with VIN, stock #, condition, mileage
- `org.dmc12.automotive.quote` — 30-minute price quote at listed asking price
- `org.dmc12.automotive.reservation` — 30-minute soft hold on a VIN
- `org.dmc12.automotive.deal_handoff` — hand a reservation to a live sales manager

Capabilities stubbed for v0.2+:

- `org.dmc12.automotive.otd_pricing` — out-the-door pricing (tax, doc fee, DMV)
- `org.dmc12.automotive.trade_intake` — structured trade-in appraisal request
- `org.dmc12.automotive.test_drive` — test-drive scheduling
- `org.dmc12.automotive.fni_menu` — F&I product menu
- `org.dmc12.automotive.return_policy` — lemon / return / cancellation policy

## License

[MIT](./LICENSE).

## Who authors this

DMC-12 was drafted in April 2026 by Ben Reuling (AI Systems Engineer)
and Chris Hudson (General Manager) of Mark Miller Subaru as the
automotive reference extension for UCP. Individual capability authorship is attributed in each capability's
front-matter. Contributions welcome — see [`CONTRIBUTING.md`](./CONTRIBUTING.md).
