# DMC-12 Release Checklist

Per-cut checklist for this repo and its two public surfaces (`dmc12.ai`
spec proxy, `dmc-12.ai` brand site). Distilled from the reference
implementation's internal runbook (`mm-inventory-mcp-platform.md` §11 in
the RDEV2 repo), which also covers the service-code and explainer sides
of a cut. CI enforces the version block mechanically via
`.github/workflows/check_version_consistency.py`.

## Spec repo

- [ ] `SPEC.md` — header `Version` + `Date`
- [ ] `SPEC.md` — §2 capability-status table: flip `*(draft — vX.Y)*` →
      `*(implemented vX.Y)*` for shipped rows; promote any
      "stub"/"forthcoming" prose to present tense
- [ ] `SPEC.md` — §11 Release Notes: add the new version's entry
- [ ] `README.md` — status line `**vX.Y (Current Release, YYYY-MM-DD).**`;
      capability bullets drop "(draft)" on shipped capabilities
- [ ] `GOVERNANCE.md` — `**Current version:** vX.Y.Z (current release).`
- [ ] `capabilities/<new-cap>.md` — front-matter `status: implemented`;
      in-doc `**Status:**` line matches
- [ ] `schemas/<new-cap>.json` — `$id` points at `https://dmc12.ai/...`
- [ ] `examples/markmiller-manifest.json` — refresh the reference sample
      (it is a *fully-participating* sample, not a mirror of MM prod —
      see SPEC §10); bump its service version
- [ ] Local CI green: ajv schema compile, `check_manifest.py`,
      `check_version_consistency.py`
- [ ] **Tag at the cut**: `git tag vX.Y.Z && git push --tags`

## Brand site (`docs/` → dmc-12.ai)

- [ ] `docs/index.html` — top strip `spec YYYY-MM-DD · DMC-12 vX.Y`
- [ ] `docs/index.html` — tool counts (MM deployment vs canonical, with a
      note when they diverge)
- [ ] `docs/index.html` — capability description for the new capability
- [ ] `docs/index.html` — `#releases` entry for the new tag
- [ ] `docs/guide/*.html` — badge `DMC-12 vX.Y · N tools` on every page;
      counts in guide prose

## Verification (post-merge)

- [ ] `curl -fsS https://dmc12.ai/specification/SPEC.md | head -5` →
      new `**Version:**` (allow up to 1 h edge cache)
- [ ] Reference deployment well-knowns reflect the cut (service version,
      new capability, scopes) — owners: see the internal runbook
- [ ] dmc-12.ai landing strip + `#releases` updated (GitHub Pages deploy)
- [ ] `validate.yml` green on the release commit, including the version
      gate and (scheduled) the dmc12.ai drift + UA probes
