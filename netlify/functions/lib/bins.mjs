// Pure telemetry math: batch validation and 300-second binning. No I/O here
// so `node --test` can pin the behavior the desk endpoint serves.

export const BIN_SECS = 300;
export const SERVICE = 'algonow-tts';

const EVENTS = new Set(['play', 'progress', 'complete', 'stop']);

// Parses and sanitizes one client batch. Returns null when the shape is not
// ours. Events carry deltas of characters spoken; `m` names the speech
// engine (web-speech until a paid provider ever exists), and `it`/`ot` are
// real token counts reported by such a provider (always absent today, so
// costs sum to a truthful zero).
export function validateBatch(raw) {
  let data;
  try {
    data = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
  if (!data || data.v !== 1) return null;
  if (typeof data.sid !== 'string' || data.sid.length > 64) return null;
  if (typeof data.slug !== 'string' || !/^[a-z0-9-]{1,60}$/.test(data.slug)) return null;
  if (!Array.isArray(data.events) || data.events.length === 0 || data.events.length > 50) {
    return null;
  }
  const events = [];
  for (const ev of data.events) {
    if (!ev || !EVENTS.has(ev.e)) return null;
    const t = Number(ev.t);
    if (!Number.isFinite(t) || t < 1.7e12 || t > 3e12) return null;
    const chars = Math.min(Math.max(0, Math.round(Number(ev.chars) || 0)), 20000);
    const rate = Math.min(Math.max(0.5, Number(ev.rate) || 1), 2);
    events.push({
      e: ev.e,
      t: Math.round(t),
      chars,
      rate,
      voice: String(ev.voice || '').slice(0, 80),
      m: /^[\w.-]{1,40}$/.test(String(ev.m || '')) ? String(ev.m) : 'web-speech',
      it: Math.max(0, Math.round(Number(ev.it) || 0)),
      ot: Math.max(0, Math.round(Number(ev.ot) || 0)),
    });
  }
  return { sid: data.sid, slug: data.slug, events };
}

export function binStart(unixSecs) {
  return unixSecs - (unixSecs % BIN_SECS);
}

// Aggregates validated batches into the two row shapes the desk endpoint
// serves. `startSec`/`endSec` bound the window in unix seconds.
export function aggregate(batches, startSec, endSec) {
  const cost = new Map(); // `${bin}|${model}` -> {in_tok, out_tok}
  const pacing = new Map(); // bin -> {plays, chars, sids:Set}

  for (const batch of batches) {
    for (const ev of batch.events) {
      const sec = Math.floor(ev.t / 1000);
      if (sec < startSec || sec >= endSec) continue;
      const bin = binStart(sec);

      const ck = `${bin}|${ev.m}`;
      const c = cost.get(ck) || { in_tok: 0, out_tok: 0 };
      c.in_tok += ev.it;
      c.out_tok += ev.ot;
      cost.set(ck, c);

      const p = pacing.get(bin) || { plays: 0, chars: 0, sids: new Set() };
      if (ev.e === 'play') p.plays += 1;
      p.chars += ev.chars;
      p.sids.add(batch.sid);
      pacing.set(bin, p);
    }
  }

  const costRows = [...cost.entries()]
    .map(([key, v]) => {
      const [bin, model] = key.split('|');
      return {
        service_name: SERVICE,
        bin_start: Number(bin),
        model,
        in_tok: v.in_tok,
        out_tok: v.out_tok,
      };
    })
    .sort((a, b) => a.bin_start - b.bin_start);

  const pacingRows = [...pacing.entries()]
    .map(([bin, v]) => ({
      bin_start: Number(bin),
      plays: v.plays,
      chars: v.chars,
      sessions: v.sids.size,
    }))
    .sort((a, b) => a.bin_start - b.bin_start);

  return { costRows, pacingRows };
}
