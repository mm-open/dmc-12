# DMC-12 Brand Mark

The DMC-12 brand mark is two arcs converging through three signal dots —
a verified-protocol meeting between dealership and agent. The arcs are
the two parties; the three dots are the protocol layers (MCP, A2A, UCP)
that carry the meeting. Use it whenever you reference the DMC-12
protocol as a service or capability namespace, not just the open spec.

## Files

| File | When to use | Background contrast |
|---|---|---|
| `dmc12-mark-blue.png` | Default. Light backgrounds — README, homepage, manifest reference, slides, light UI. | Blue mark on white |
| `dmc12-mark-darkmode.png` | Dark backgrounds only — README dark theme, dark UI, dark social cards. | White mark on navy |

## Two non-negotiable rules

1. **Blue-on-white is the default.** Use `dmc12-mark-blue.png` for any
   light-background surface.
2. **White-on-navy is dark backgrounds only.** Use
   `dmc12-mark-darkmode.png` only when the surrounding surface is dark
   enough that the navy background blends in.

Never blue-on-dark. Never white-on-navy on a light surface. If you're
unsure which to reach for, the default is blue-on-white.

## Canonical URLs

The PNGs are served by the `dmc12-spec-proxy` Cloudflare Worker
fronting this repo, alongside `/specification/` and `/schemas/`:

| URL | Source |
|---|---|
| `https://dmc12.ai/branding/dmc12-mark-blue.png` | This file: `branding/dmc12-mark-blue.png` |
| `https://dmc12.ai/branding/dmc12-mark-darkmode.png` | This file: `branding/dmc12-mark-darkmode.png` |

These URLs are the **canonical reference**. The live Mark Miller Subaru
UCP manifest references them at
`ucp.services["ai.dmc12.automotive"].brand` — meaning every
cryptographically-verified A2A read of that manifest carries the
DMC-12 brand at the protocol layer, with the manifest itself acting
as the brand witness. **Keep these filenames stable** so the manifest
URLs don't break.

## Vector source

PNG only this round. SVG / vector source files will be added when
produced from a vector tool — the convention is `dmc12-mark-blue.svg`
and `dmc12-mark-darkmode.svg`, alongside the PNGs. The Worker route
already accepts arbitrary names matching `^[a-z][a-z0-9_-]{0,63}$`.

## License

The DMC-12 mark is part of this MIT-licensed open spec repository
(`github.com/mm-open/dmc-12`). Use it to identify the protocol or a
DMC-12-conformant deployment. Don't use it in a way that implies
endorsement by Mark Miller Subaru or any other DMC-12-publishing
dealership.
