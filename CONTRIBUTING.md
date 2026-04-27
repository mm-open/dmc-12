# Contributing to DMC-12

Before contributing, please read:

- [GOVERNANCE.md](./GOVERNANCE.md) — maintainers, versioning, namespace
  rules
- [SECURITY.md](./SECURITY.md) — responsible disclosure, PII handling
  in specs and examples

DMC-12 is an open specification. We welcome:

- Bug reports on capability schemas (fields that don't round-trip,
  validation ambiguity).
- Proposed new capabilities in the `ai.dmc12.automotive.*` namespace.
- Reference-implementation snippets in other languages.

## How changes flow

1. **Open an issue** describing the problem or proposal before writing a
   PR. Capability design discussions can go long — an issue lets us
   converge on a shape before anyone writes schemas.
2. **For schema changes**, include a migration note in the PR body:
   what existing manifests will break, and how a merchant should version
   up safely.
3. **For new capabilities** in the `ai.dmc12.automotive.*` namespace:
   - Add `capabilities/<name>.md` with front-matter.
   - Add `schemas/<name>.json` (JSON Schema 2020-12).
   - Add an entry to the `SPEC.md` §2 table.
4. **For dealer-specific capabilities**, use a `com.<dealer>.*` prefix
   and publish them in the dealer's own repo — DMC-12 hosts only the
   shared automotive layer.

## Capability status lifecycle

```
stub → draft → implemented → stable → deprecated
```

- **stub:** spec exists, no reference implementation.
- **draft:** reference implementation exists, schema may change between
  minor versions.
- **implemented:** schema locked at v0.x.y, breaking changes require a
  minor version bump.
- **stable:** schema locked at v1+.
- **deprecated:** replaced by a newer capability; still valid to publish,
  but new implementations SHOULD prefer the replacement.

## Versioning

- The spec follows [SemVer 2.0.0](https://semver.org/).
- Capability versions are independent of spec version.
- Breaking schema changes allowed in v0.x minor bumps while Draft.

## Code style

- Schemas: JSON Schema 2020-12.
- Markdown: GFM with front-matter per the existing capabilities.
- No implementations live in this repo — only the spec and schemas.

## License

Contributions are licensed under the MIT License.
