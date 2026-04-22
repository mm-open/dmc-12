#!/usr/bin/env python3
# .github/workflows/check_manifest.py
# Purpose: CI-time structural check on the reference UCP manifest.
# Non-goals: Full UCP validation (that lives at ucpchecker.com / ucp.dev).

import json
import sys

REQUIRED_TOP = {"ucp", "merchant", "policies"}
REQUIRED_UCP = {"version", "services", "capabilities"}


def main() -> int:
    with open("examples/markmiller-manifest.json") as f:
        m = json.load(f)

    missing_top = REQUIRED_TOP - set(m.keys())
    if missing_top:
        print(f"manifest missing top-level keys: {sorted(missing_top)}", file=sys.stderr)
        return 1

    missing_ucp = REQUIRED_UCP - set(m["ucp"].keys())
    if missing_ucp:
        print(f"ucp block missing keys: {sorted(missing_ucp)}", file=sys.stderr)
        return 1

    caps = m["ucp"]["capabilities"]
    if not isinstance(caps, list) or not caps:
        print("ucp.capabilities must be a non-empty list", file=sys.stderr)
        return 1

    errors = []
    for cap in caps:
        if "name" not in cap:
            errors.append(f"capability missing name: {cap}")
            continue
        if "version" not in cap:
            errors.append(f"{cap['name']}: missing version")
        if "spec" not in cap:
            errors.append(f"{cap['name']}: missing spec URL")

    if errors:
        print("capability errors:", file=sys.stderr)
        for e in errors:
            print(f"  - {e}", file=sys.stderr)
        return 1

    print(f"{len(caps)} capabilities declared, all have name+version+spec")
    return 0


if __name__ == "__main__":
    sys.exit(main())
