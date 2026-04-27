#!/usr/bin/env python3
# .github/workflows/check_dmc12_ai_drift.py
# Purpose: Verify dmc12.ai serves the same content as the repo. Catches Worker drift.
# Non-goals: Schema correctness (that lives in the schemas/ ajv compile job).

import json
import sys
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
SCHEMAS_DIR = REPO_ROOT / 'schemas'
CAPABILITIES_DIR = REPO_ROOT / 'capabilities'


def fetch(url: str) -> bytes:
    with urllib.request.urlopen(url, timeout=10) as r:
        return r.read()


def check_schema(name: str) -> bool:
    local = (SCHEMAS_DIR / f'{name}.json').read_bytes()
    served = fetch(f'https://dmc12.ai/schemas/{name}.json')
    if json.loads(local) != json.loads(served):
        print(f'DRIFT: schemas/{name}.json — local != dmc12.ai')
        return False
    return True


def check_spec(name: str) -> bool:
    local = (CAPABILITIES_DIR / f'{name}.md').read_bytes()
    served = fetch(f'https://dmc12.ai/specification/{name}.md')
    if local.strip() != served.strip():
        print(f'DRIFT: capabilities/{name}.md — local != dmc12.ai')
        return False
    return True


def check_top_level_doc(filename: str) -> bool:
    """Check a repo-root file (e.g. SPEC.md) is served at /specification/<filename>."""
    local = (REPO_ROOT / filename).read_bytes()
    served = fetch(f'https://dmc12.ai/specification/{filename}')
    if local.strip() != served.strip():
        print(f'DRIFT: {filename} — local != dmc12.ai/specification/{filename}')
        return False
    return True


def main() -> int:
    schemas = [p.stem for p in SCHEMAS_DIR.glob('*.json')]
    caps    = [p.stem for p in CAPABILITIES_DIR.glob('*.md')]
    # SPEC.md is the service-level spec the manifest points at
    # (`https://dmc12.ai/specification/SPEC.md`); a stale or missing serve
    # is invisible to the schemas + capabilities sweep.
    top_level = ['SPEC.md']
    ok = (
        all(check_schema(s) for s in schemas)
        and all(check_spec(c) for c in caps)
        and all(check_top_level_doc(d) for d in top_level)
    )
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
