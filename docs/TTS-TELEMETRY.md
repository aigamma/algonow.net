# TTS and its telemetry: the operating picture

Written 2026-07-20. This is the reference for how algonow's listen feature is
costed, measured, and (when the owner chooses) joined to the mathlimit desk.

## What is live today

The ▶ Listen feature runs on the browser's own Web Speech API. Synthesis
happens on the visitor's device with their OS/browser voices. There is no
audio vendor, no API key, no stream, and therefore **no dynamic cost and no
recurring fixed cost. $0.00, structurally.**

Usage telemetry (anonymous, DNT/GPC-respecting, no cookies or user ids):

- Client batches events: `play`, `progress` (chars newly spoken), `complete`,
  `stop`, each with voice name, rate, and engine (`web-speech`).
- `POST /api/tel` validates and appends batches to the site's own Netlify
  Blobs store `tts-events`, keyed `YYYY-MM-DD/<iso>-<rand>.json`.
- `/api/desk` re-serves aggregates, authenticated by the `apikey` header
  against the `ALGONOW_DESK_KEY` Netlify env var.

## Joining the mathlimit fleet view (owner's call, post-deadline)

`/api/desk` speaks the exact dialect mathlimit's `supabase` source kind
already polls, so **no mathlimit code changes** are needed. When ready, add
one entry to mathlimit's `sources.json` (Fly secret `SOURCES_JSON` or
`DATA_DIR/sources.json`):

```json
{
  "domain": "algonow.net",
  "kind": "supabase",
  "url": "https://algonow-net.netlify.app/api/desk",
  "key": "<ALGONOW_DESK_KEY from Netlify env>",
  "rpc": "algonow_cost_bins"
}
```

(Once DNS is live, `https://algonow.net/api/desk` works identically.) The key
is retrievable with `netlify env:get ALGONOW_DESK_KEY` from this repo.

Contract, verified live 2026-07-20: `POST {url}/rest/v1/rpc/algonow_cost_bins`
with `{"p_days": 15}` returns rows
`{service_name: "algonow-tts", bin_start, model, in_tok, out_tok}` in
300-second bins; mathlimit prices tokens in Rust via `sb_price`. Browser
speech reports **zero tokens, so the desk truthfully shows $0.00** for this
property: pacing exists, spend does not. A quiet window still returns one
zero row so the parser never errors.

The usage series lives beside it: `POST .../rpc/algonow_tts_pacing` returns
`{bin_start, plays, chars, sessions}` for pacing inspection and forecasting.

**Guardrails during the IAAI-27 window:** nothing in this repo writes to the
mathlimit repo, its Fly volume, or its Supabase project (aigamma-dev, which
holds the live `mathlimit_*` RPCs). The sources.json line above is additive
and reversible, but even it should wait until the paper exhibit is out of its
fragile window. If a paid TTS model ever ships, mathlimit's `sb_price` needs
one match arm for that model id; until then no mathlimit change of any kind
is required.

## If paid, higher-quality audio is ever wanted

List prices as of early 2026 (verify at signup; all per plain characters of
narration unless noted):

| Provider | Model | Price | Full-site cost* |
|---|---|---|---|
| Web Speech API (today) | OS voices | $0 | $0 |
| Google Cloud TTS | Standard | $4 / 1M chars | ~$0.13 |
| Google Cloud TTS | Neural2/WaveNet | $16 / 1M chars | ~$0.53 |
| Amazon Polly | Neural | $16 / 1M chars | ~$0.53 |
| Azure Speech | Neural | ~$15 / 1M chars | ~$0.50 |
| OpenAI | tts-1 | $15 / 1M chars | ~$0.50 |
| OpenAI | gpt-4o-mini-tts | ~$0.015 / minute | ~$0.65 |
| ElevenLabs | Creator tier | ~$0.22 / 1k chars | ~$7.30 |

*Full-site = all 6 current narrations ≈ 33k characters, generated once.

**The recommended paid path is pre-generation, not streaming.** Narrations
are static per release: generate MP3s once per content change at build time,
commit or CDN-host them, and serve `<audio>` files. Cost becomes pennies per
release (a one-time `in_tok`/`out_tok`-bearing event in the same telemetry),
zero per listener, and PageSpeed stays perfect with lazy audio elements.
Per-listener streaming APIs are the only expensive architecture, and this
site never needs it.

**Spend rule (repo hard rule 4):** wiring any paid provider requires the
owner's explicit go-ahead in the moment. Building or previewing with paid
keys in a session is out of bounds.

## Cost-truth invariant

Dollars are never computed or stored client-side, and never invented. Events
carry measured characters and (for future paid engines) real token counts
from the provider's response; pricing happens desk-side. Zero-cost engines
produce zero-token rows. Synthetic events never enter the production store.
