#!/usr/bin/env python3
# .github/workflows/check_version_consistency.py
# Purpose: Assert every version-bearing surface in the repo agrees on the
#          release version (and date, where the surface carries one).
#          SPEC.md's header is the source of truth. Surfaces use two forms:
#          full `0.6.0` (SPEC, GOVERNANCE, examples manifest) and short
#          `v0.6` (README, docs/index.html top strip) — short must equal
#          full's MAJOR.MINOR.
# Non-goals: Served-content drift (check_dmc12_ai_drift.py), schema
#            correctness (the ajv compile job).

import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent


def _match(path: str, pattern: str, label: str) -> re.Match:
    text = (REPO_ROOT / path).read_text(encoding='utf-8')
    m = re.search(pattern, text)
    if not m:
        sys.exit(f'VERSION GATE: could not locate {label} in {path} '
                 f'(pattern {pattern!r}) — template changed?')
    return m


def main() -> int:
    failures: list[str] = []

    # --- Source of truth: SPEC.md header ---
    spec_version = _match('SPEC.md', r'\*\*Version:\*\*\s*(\d+\.\d+\.\d+)', 'SPEC version').group(1)
    spec_date = _match('SPEC.md', r'\*\*Date:\*\*\s*(\d{4}-\d{2}-\d{2})', 'SPEC date').group(1)
    short = re.match(r'(\d+\.\d+)\.', spec_version).group(1)  # 0.6.0 -> 0.6

    def expect(surface: str, got: str, want: str) -> None:
        if got != want:
            failures.append(f'{surface}: {got!r} != SPEC.md {want!r}')

    # --- README: short form + date ---
    rm = _match('README.md', r'\*\*v(\d+\.\d+) \(Current Release, (\d{4}-\d{2}-\d{2})\)\.\*\*',
                'README status line')
    expect('README.md version', f'v{rm.group(1)}', f'v{short}')
    expect('README.md date', rm.group(2), spec_date)

    # --- GOVERNANCE: full form with v prefix ---
    gov = _match('GOVERNANCE.md', r'\*\*Current version:\*\*\s*v(\d+\.\d+\.\d+)',
                 'GOVERNANCE current version').group(1)
    expect('GOVERNANCE.md version', f'v{gov}', f'v{spec_version}')

    # --- docs/index.html top strip: short form + date ---
    sm = _match('docs/index.html', r'<span>spec (\d{4}-\d{2}-\d{2}) · DMC-12 v(\d+\.\d+)</span>',
                'index.html top strip')
    expect('docs/index.html strip date', sm.group(1), spec_date)
    expect('docs/index.html strip version', f'v{sm.group(2)}', f'v{short}')

    # --- examples manifest: full form, no date ---
    manifest = json.loads((REPO_ROOT / 'examples/markmiller-manifest.json').read_text(encoding='utf-8'))
    svc = manifest['ucp']['services']['ai.dmc12.automotive']['version']
    expect('examples/markmiller-manifest.json service version', svc, spec_version)

    if failures:
        for f in failures:
            print(f'VERSION MISMATCH — {f}')
        return 1
    print(f'Version gate OK: {spec_version} ({spec_date}) consistent across '
          f'SPEC.md, README.md, GOVERNANCE.md, docs/index.html, examples manifest.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
