# Governance

DMC-12 is maintained as an open specification by Mark Miller Subaru with
the intent that it serves the broader automotive-retail and
agent-commerce ecosystem. This document describes how the spec is run
today and how it may evolve.

## Status

- **Current version:** v0.1.0 (Draft).
- **v0.x** is considered Draft. Breaking changes are permitted at any
  minor-version bump while in Draft.
- **v1.0.0** will be the first stable release. After v1.0, backward
  compatibility rules follow SemVer 2.0.0 strictly.

## Maintainers

DMC-12 is co-authored and co-maintained by:

- **Ben Reuling** — Mark Miller Subaru (spec editor, reference
  implementation)
- **Chris Hudson** — Mark Miller Subaru, General Manager (co-author,
  capability scoping)

Maintainers review and merge PRs, manage the release cadence, and hold
the `ai.dmc12.automotive.*` namespace (see below).

Additional maintainers may be added by unanimous agreement of the
current maintainers after demonstrated sustained contribution.

## Contribution Flow

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the detailed PR workflow.
In short:

1. Open an issue describing the problem or proposal before writing a PR.
2. For schema changes, include a migration note.
3. For new capabilities in the `ai.dmc12.automotive.*` namespace, add a
   `capabilities/<name>.md`, a `schemas/<name>.json`, and an entry in
   `SPEC.md §2`.
4. For dealer- or vendor-specific capabilities, use a `com.<dealer>.*`
   prefix and publish them in your own repo — DMC-12 hosts only the
   shared automotive layer.

## Namespace Ownership

The `ai.dmc12.automotive.*` capability namespace is owned by this
repository's maintainers. Only capabilities specified here may claim
this prefix.

Vendor or dealer extensions MUST use the UCP reverse-domain convention
with a `com.<vendor>.*` prefix. See `SPEC.md §3` for the canonical
rules.

## Ecosystem Alignment

DMC-12 is designed to slot into the existing agent-commerce ecosystem:

- **UCP** (Universal Commerce Protocol) — DMC-12 is a UCP capability
  namespace. Agents discover DMC-12 support via a dealer's
  `/.well-known/ucp` manifest.
- **MCP** (Model Context Protocol) — donated to the Agentic AI
  Foundation (Linux Foundation) in 2026. DMC-12 capabilities publish
  their tool surfaces over MCP.
- **A2A** (Agent2Agent) — donated to the Linux Foundation in 2025.
  DMC-12 endpoints MAY expose an A2A Agent Card alongside MCP.
- **AP2** (Agent Payments Protocol) — Google-led. DMC-12 v0.1 does not
  yet implement AP2 mandates; v0.2+ will define the automotive-specific
  Cart Mandate line items (see `SPEC.md §2.1`).

Donation of DMC-12 itself to a neutral foundation (Linux Foundation
Agentic AI Foundation or similar) is under consideration post-v1.0.
Until then, Mark Miller Subaru is the convening steward.

## Release Cadence

There is no fixed release cadence during Draft. v0.x releases occur
when:

- A capability transitions from `stub` to `implemented`.
- A schema change requires a version bump (breaking change in v0.x is
  allowed).
- A security or correctness fix lands.

Each release is tagged on `main` with `v0.<minor>.<patch>`.

## Dispute Resolution

For spec-shape disagreements that can't be resolved in PR review,
maintainers will:

1. Document the two or more proposed approaches in a GitHub issue.
2. Invite comment from visible adopters.
3. Make a maintainer decision within 30 days of the issue reaching
   consensus-stuck status.

Maintainer decisions are documented in the issue and linked from the
commit that implements them.

## Changing This Document

Amendments to `GOVERNANCE.md` require a PR approved by all current
maintainers.
