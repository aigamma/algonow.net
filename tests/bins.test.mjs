import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBatch, aggregate, binStart, BIN_SECS } from '../netlify/functions/lib/bins.mjs';

const T0 = 1_784_000_000; // aligned test epoch, seconds
const ms = (sec) => sec * 1000;

function batch(events, sid = 'sid-1') {
  return { v: 1, sid, slug: 'astar-manhattan', events };
}

test('validateBatch accepts a clean batch and fills defaults', () => {
  const out = validateBatch(
    JSON.stringify(
      batch([{ e: 'play', chars: 0, voice: 'Aria', rate: 1, t: ms(T0) }])
    )
  );
  assert.ok(out);
  assert.equal(out.events[0].m, 'web-speech');
  assert.equal(out.events[0].it, 0);
  assert.equal(out.events[0].ot, 0);
});

test('validateBatch rejects wrong shapes', () => {
  assert.equal(validateBatch('not json'), null);
  assert.equal(validateBatch(JSON.stringify({ v: 2 })), null);
  assert.equal(validateBatch(JSON.stringify(batch([]))), null);
  assert.equal(
    validateBatch(JSON.stringify(batch([{ e: 'launch', t: ms(T0) }]))),
    null
  );
  assert.equal(
    validateBatch(JSON.stringify({ ...batch([{ e: 'play', t: ms(T0) }]), slug: 'Bad Slug!' })),
    null
  );
  assert.equal(
    validateBatch(JSON.stringify(batch([{ e: 'play', t: 123 }]))),
    null,
    'implausible timestamps rejected'
  );
});

test('aggregate sums chars per bin and counts plays and sessions', () => {
  const b0 = binStart(T0);
  const batches = [
    validateBatch(
      JSON.stringify(
        batch([
          { e: 'play', chars: 0, t: ms(b0 + 10) },
          { e: 'progress', chars: 500, t: ms(b0 + 40) },
          { e: 'progress', chars: 250, t: ms(b0 + 90) },
        ])
      )
    ),
    validateBatch(
      JSON.stringify(
        batch([{ e: 'progress', chars: 100, t: ms(b0 + BIN_SECS + 5) }], 'sid-2')
      )
    ),
  ];
  const { costRows, pacingRows } = aggregate(batches, b0 - 86400, b0 + 86400);

  assert.equal(pacingRows.length, 2);
  assert.deepEqual(pacingRows[0], { bin_start: b0, plays: 1, chars: 750, sessions: 1 });
  assert.deepEqual(pacingRows[1], {
    bin_start: b0 + BIN_SECS,
    plays: 0,
    chars: 100,
    sessions: 1,
  });

  assert.equal(costRows.length, 2);
  for (const row of costRows) {
    assert.equal(row.service_name, 'algonow-tts');
    assert.equal(row.model, 'web-speech');
    assert.equal(row.in_tok, 0, 'browser speech reports zero tokens');
    assert.equal(row.out_tok, 0);
  }
});

test('aggregate drops events outside the window and groups future paid models', () => {
  const b0 = binStart(T0);
  const batches = [
    validateBatch(
      JSON.stringify(
        batch([
          { e: 'progress', chars: 100, t: ms(b0 - 86400 * 2) }, // before window
          { e: 'progress', chars: 100, t: ms(b0 + 10), m: 'gpt-4o-mini-tts', it: 120, ot: 900 },
          { e: 'progress', chars: 100, t: ms(b0 + 20), m: 'gpt-4o-mini-tts', it: 30, ot: 100 },
        ])
      )
    ),
  ];
  const { costRows } = aggregate(batches, b0 - 86400, b0 + 86400);
  assert.equal(costRows.length, 1);
  assert.deepEqual(costRows[0], {
    service_name: 'algonow-tts',
    bin_start: b0,
    model: 'gpt-4o-mini-tts',
    in_tok: 150,
    out_tok: 1000,
  });
});
