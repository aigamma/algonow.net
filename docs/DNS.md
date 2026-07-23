# DNS: the one owner action between this site and its domains

State as of 2026-07-22, all verified from this machine:

- The Netlify site `algonow-net` (project id
  `3252f082-19e9-4f1c-af54-355fda8ed7cf`) is live and serving the current
  build at https://algonow-net.netlify.app (HTTP 200, deploy state ready).
- Both domains are now ATTACHED to that site (done via API 2026-07-22):
  `custom_domain: algonow.net`, aliases `www.algonow.net`, `algohome.net`,
  `www.algohome.net`. Netlify is waiting for DNS to point at it.
- `algonow.net` currently resolves to 13.248.243.5 / 76.223.105.230 and
  `algohome.net` to 15.197.148.33 / 3.33.130.190: registrar parking pages,
  not Netlify. This is the only thing left to change.
- The `algohome.net -> algonow.net` 301s are already staged in
  `netlify.toml` and take effect the moment both domains reach the site.

## The owner action (at each domain's registrar)

Log in to the registrar for each domain and set, in its DNS panel:

| Host | Type | Value |
| --- | --- | --- |
| `@` (apex) | A | `75.2.60.5` |
| `www` | CNAME | `algonow-net.netlify.app` |

Do that for BOTH `algonow.net` and `algohome.net`. Delete any parking
A/AAAA/CNAME records the registrar pre-installed on `@` and `www`, and if
an AAAA record exists on the apex, remove it (a stray AAAA to the parker
will intermittently hijack the site).

Alternative, equally fine: hand the whole zone to Netlify DNS instead
(app.netlify.com -> Domain management -> add a DNS zone, then set the four
`dnsX.p0N.nsone.net` nameservers it assigns at the registrar). Choose one
approach per domain, not both. The record-based approach above is less
disruptive and keeps the registrar's mail/other records intact.

## What happens next, in order

1. Within minutes to an hour of the records changing, `nslookup
   algonow.net` answers `75.2.60.5` instead of the parking pair.
2. Netlify's domain panel moves from "Awaiting external DNS" to
   provisioning a Let's Encrypt certificate automatically. No action.
3. https://algonow.net serves the site; https://www.algonow.net redirects
   into it; any https://algohome.net/path 301s to
   https://algonow.net/path per netlify.toml.

## Verification, once flipped

```
nslookup algonow.net          # expect 75.2.60.5
curl -sI https://algonow.net/ | head -1              # expect HTTP/2 200
curl -sI https://algohome.net/atlas/ | head -3       # expect 301 + location: https://algonow.net/atlas/
```

Nothing else is pending on the site side: build, prerender, sitemap,
redirects, headers, and functions are all deployed and verified green.
