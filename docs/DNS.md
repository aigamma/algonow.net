# DNS: one domain live, one owner action left

State as of 2026-08-26, all verified from this machine:

- **algonow.net is LIVE on Netlify.** The apex resolves to 13.52.188.95 /
  52.52.192.191, which are `algonow-net.netlify.app`'s own A records: the
  registrar flip used ALIAS/ANAME flattening to the Netlify hostname
  rather than the A 75.2.60.5 documented below. Both routes are valid;
  flattening is what actually happened and it works. https://algonow.net/
  answers 200 with the site, https://www.algonow.net/ 301s into it, and
  the Let's Encrypt certificate provisioned automatically.
- **algohome.net is STILL PARKED.** It resolves to 15.197.148.33 /
  3.33.130.190 (the registrar parking pair) and serves a 114-byte parking
  lander, not this site. Its Netlify attachment is intact (the site's
  domain_aliases include both algohome hosts, and forcing resolution to a
  Netlify load balancer returns a Netlify 301), but no TLS certificate
  covering algohome.net exists yet because DNS has never pointed at
  Netlify, so Let's Encrypt could not validate. The netlify.toml 301
  blocks are correct and simply unreachable until the flip.
- The Netlify site is `algonow-net` (project id
  `3252f082-19e9-4f1c-af54-355fda8ed7cf`). Deploys are explicit CLI
  uploads; pushes do not publish (see the Deploy section of CLAUDE.md).

## The one remaining owner action (algohome.net's registrar)

In algohome.net's DNS panel, delete the parking records on `@` and `www`
(including any stray AAAA on the apex, which would intermittently hijack
the site) and set either of these, matching what already worked for
algonow.net:

| Host | Type | Value |
| --- | --- | --- |
| `@` (apex) | ALIAS/ANAME (or A) | `algonow-net.netlify.app` (or `75.2.60.5`) |
| `www` | CNAME | `algonow-net.netlify.app` |

Alternative, equally fine: hand the whole zone to Netlify DNS instead
(app.netlify.com -> Domain management -> add a DNS zone, then set the four
`dnsX.p0N.nsone.net` nameservers it assigns at the registrar). Choose one
approach per domain, not both. The record-based approach above is less
disruptive and keeps the registrar's mail/other records intact.

## What happens next, in order

1. Within minutes to an hour of the records changing, `nslookup
   algohome.net` answers Netlify addresses instead of the parking pair.
2. Netlify's domain panel moves from "Awaiting external DNS" to
   provisioning a Let's Encrypt certificate extension covering the
   algohome hosts automatically. If it stalls past a few hours, open the
   domain panel and retry the certificate. During this window algohome
   serves TLS errors instead of parking ads; transient and unavoidable.
3. Any https://algohome.net/path (and www) answers 301 with
   Location https://algonow.net/path per netlify.toml.

## Verification, once algohome flips

```
nslookup algohome.net                                # expect Netlify addresses, not 15.197.148.33
curl -sI https://algohome.net/atlas/ | head -3       # expect 301 + location: https://algonow.net/atlas/
curl -sI https://www.algohome.net/ | head -3         # expect 301 + location: https://algonow.net/
```

Already verified live for algonow.net (2026-08-26): apex 200, www 301,
certificate valid, and https://algonow-net.netlify.app/ 301s to the apex
so exactly one public hostname serves content.
