import { getStore } from '@netlify/blobs';
import { aggregate, binStart, SERVICE } from './lib/bins.mjs';

// The desk read endpoint. Speaks the exact dialect the mathlimit server's
// `supabase` source kind expects, so this domain can join the fleet view
// with a single sources.json entry and zero mathlimit code changes:
//
//   POST {url}/rest/v1/rpc/algonow_cost_bins   body {"p_days": N}
//     -> [{service_name, bin_start, model, in_tok, out_tok}, ...]
//
// mathlimit prices rows in Rust from token counts; browser speech reports
// zero tokens, so the desk truthfully shows $0.00 for this property until a
// paid provider ever exists. The second rpc, algonow_tts_pacing, serves the
// usage series (plays, characters, sessions per 5-minute bin) for pacing
// inspection and paid-provider cost forecasting.
//
// Auth: the caller presents the shared key in the `apikey` header (the same
// header a real Supabase source uses), configured here as ALGONOW_DESK_KEY.

const MAX_DAYS = 40;

function unauthorized() {
  return Response.json({ message: 'invalid api key' }, { status: 401 });
}

export default async function handler(request) {
  const key = process.env.ALGONOW_DESK_KEY;
  if (!key) return Response.json({ message: 'desk not configured' }, { status: 503 });

  const presented =
    request.headers.get('apikey') ||
    (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (presented !== key) return unauthorized();

  const m = new URL(request.url).pathname.match(/\/rpc\/(algonow_cost_bins|algonow_tts_pacing)$/);
  if (!m || request.method !== 'POST') {
    return Response.json({ message: 'unknown rpc' }, { status: 404 });
  }
  const rpc = m[1];

  let days = 15;
  try {
    const body = await request.json();
    if (Number.isFinite(Number(body?.p_days))) days = Number(body.p_days);
  } catch {
    // Empty body: keep the default window.
  }
  days = Math.min(Math.max(1, Math.round(days)), MAX_DAYS);

  const nowSec = Math.floor(Date.now() / 1000);
  const end = nowSec - (nowSec % 300);
  const start = (Math.floor(end / 86400) - (days - 1)) * 86400;

  // Strong consistency: this endpoint is polled at desk cadence (minutes),
  // and the default eventual mode was observed serving a stale empty list
  // for prefixes written seconds earlier. Strong reads cost a little latency
  // and remove the trap entirely.
  const store = getStore({ name: 'tts-events', consistency: 'strong' });
  const batches = [];
  for (let d = 0; d <= days; d += 1) {
    const day = new Date((start + d * 86400) * 1000).toISOString().slice(0, 10);
    const { blobs } = await store.list({ prefix: `${day}/` });
    for (const blob of blobs) {
      try {
        const batch = await store.get(blob.key, { type: 'json' });
        if (batch && Array.isArray(batch.events)) batches.push(batch);
      } catch {
        // A single unreadable blob never sinks the series.
      }
    }
  }

  const { costRows, pacingRows } = aggregate(batches, start, end);

  if (rpc === 'algonow_tts_pacing') return Response.json(pacingRows);

  // The mathlimit parser treats an empty array as an error; an explicit
  // zero-activity row keeps a quiet property polling clean.
  if (costRows.length === 0) {
    costRows.push({
      service_name: SERVICE,
      bin_start: binStart(nowSec) - 300,
      model: 'web-speech',
      in_tok: 0,
      out_tok: 0,
    });
  }
  return Response.json(costRows);
}
