import { getStore } from '@netlify/blobs';
import { validateBatch } from './lib/bins.mjs';

// TTS telemetry ingest. Accepts small anonymous event batches from the
// listen player and appends them to the tts-events blob store, one blob per
// batch, keyed by UTC day for cheap windowed reads (the same keying the
// worldthought chat logs use). No IPs, no cookies, no identifiers beyond the
// random per-pageload sid the client made up.
export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }
  const raw = await request.text();
  if (raw.length > 8192) return new Response('too large', { status: 413 });

  const batch = validateBatch(raw);
  if (!batch) return new Response('bad batch', { status: 400 });

  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const key = `${day}/${now.toISOString()}-${Math.random().toString(36).slice(2, 8)}.json`;
  try {
    const store = getStore('tts-events');
    await store.setJSON(key, { ...batch, received: now.toISOString() });
  } catch (err) {
    console.error('tts_events_write_failed', err?.message || err);
    // Telemetry loss is acceptable; a client retry storm is not.
    return new Response(null, { status: 204 });
  }
  return new Response(null, { status: 204 });
}
