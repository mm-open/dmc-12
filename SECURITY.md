# Security Policy

DMC-12 is a specification repository: the artifacts here are Markdown
prose, JSON Schemas, and an example manifest. Security issues in DMC-12
fall into two buckets — spec-level issues (ambiguity or under-specified
behavior that allows unsafe implementations) and example-data issues
(anything in this repo that accidentally leaks PII, credentials, or
production identifiers). Implementations of DMC-12 have their own
security posture, separate from this repo.

## Responsible Disclosure

Please report security issues privately to:

- **Email:** `mm_reports@mmsubaru.com`
- **GitHub:** open a private security advisory on
  <https://github.com/mm-open/dmc-12/security/advisories/new>

Do **not** open a public GitHub issue for a sensitive finding. Public
issues are appropriate for non-sensitive spec bugs, wording questions,
and feature requests.

We commit to:

1. Acknowledging the report within **5 business days**.
2. Providing an initial assessment and remediation plan within **30
   days**.
3. Coordinated public disclosure within **90 days** of the initial
   report, unless the reporter agrees to a longer embargo.

## PII Posture of the Specification

One capability — `ai.dmc12.automotive.deal_handoff` — accepts customer
PII (name, phone, email) by design. All other capabilities forbid PII in
their input/output fields. Conformant implementations of `deal_handoff`
MUST:

- Hash PII at rest in every audit log and log-aggregation destination.
  The spec requires SHA-256 of each PII field.
- Transmit plaintext PII only to authenticated dealer-internal
  destinations (e.g., a sales manager email at a dealer-owned domain).
- Honor deletion requests per the merchant's privacy policy.

The specification and examples in this repository MUST NOT contain real
customer PII. Example data uses:

- `example.com` domain for email addresses
- `+15555551234` / `+1555-555-NNNN` for phone numbers (`555` exchange is
  reserved for fictional use by NANP)
- Clearly-fictional names (`Jane Example`, `John Doe`, etc.)

If you find real PII in this repo, treat it as a security issue and
report it via the disclosure process above.

## Agent Authentication

DMC-12 does not define its own authentication or authorization scheme.
Implementations rely on the upstream ecosystem specifications:

- **Transport:** MCP (HTTP streaming) and A2A (JSON-RPC over HTTPS).
- **Agent identity:** A2A Agent Cards and OAuth 2.1 with
  RFC 8707 resource-indicator scoping.
- **Mandates (future, v0.2+):** AP2 Intent, Cart, and Payment mandates.

Conformant implementations MUST use TLS for all endpoints, MUST require
authenticated access to every tool that writes state (quote,
reservation, deal-handoff), and SHOULD rate-limit per agent identity to
prevent inventory denial-of-service.

## Scope

This policy covers:

- **In scope:** the spec prose (`SPEC.md`, `capabilities/*.md`), the
  JSON Schemas (`schemas/*.json`), the example manifest
  (`examples/markmiller-manifest.json`), and the CI workflows
  (`.github/workflows/*`).
- **Out of scope:** downstream implementations of DMC-12 (those have
  their own vulnerability-reporting channels), UCP / MCP / A2A / AP2
  themselves (report upstream to those projects), and
  dealer-operational security (report to the dealer directly).
