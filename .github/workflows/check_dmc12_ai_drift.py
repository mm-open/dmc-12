#!/usr/bin/env python3
# .github/workflows/check_dmc12_ai_drift.py
# Purpose: Verify dmc12.ai serves the same content as the repo. Catches Worker drift.
# Non-goals: Schema correctness (that lives in the schemas/ ajv compile job).

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
SCHEMAS_DIR = REPO_ROOT / 'schemas'
CAPABILITIES_DIR = REPO_ROOT / 'capabilities'


def fetch(url: str) -> bytes:
    # Identify ourselves with a descriptive UA. (Also keeps the content checks
    # independent of check_default_ua_not_blocked() below, which deliberately
    # probes with the bare default UA.)
    req = urllib.request.Request(
        url,
        headers={'User-Agent': 'mm-open/dmc-12 drift-check (+https://github.com/mm-open/dmc-12)'},
    )
    with urllib.request.urlopen(req, timeout=10) as r:
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


def check_default_ua_not_blocked() -> bool:
    """Probe with urllib's DEFAULT User-Agent (Python-urllib/x.y) — the inverse
    of fetch()'s custom UA. Cloudflare's Browser Integrity Check 403s this UA
    signature (error 1010; Bot Fight Mode is the sibling setting), silently
    breaking every plain-urllib agent consuming the spec. Both were disabled
    on the dmc12.ai zone 2026-06-10; this catches a re-enable of either within
    a day. Drift detection, NOT a merge gate (this job runs on
    schedule/dispatch only). Set DMC12_UA_PROBE_WARN_ONLY=1 to downgrade to a
    warning (e.g. if a re-block is ever intentional)."""
    warn_only = os.environ.get('DMC12_UA_PROBE_WARN_ONLY') == '1'
    url = 'https://dmc12.ai/specification/SPEC.md'
    try:
        req = urllib.request.Request(url)  # no UA header -> default Python-urllib
        with urllib.request.urlopen(req, timeout=10) as r:
            r.read()
        return True
    except urllib.error.HTTPError as e:
        if e.code == 403:
            msg = ('Browser Integrity Check / Bot Fight Mode re-blocking Python '
                   f'agents: default urllib UA got 403 from {url}')
            if warn_only:
                print(f'WARNING (DMC12_UA_PROBE_WARN_ONLY=1): {msg}')
                return True
            print(msg)
            return False
        raise


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
        and check_default_ua_not_blocked()
    )
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
