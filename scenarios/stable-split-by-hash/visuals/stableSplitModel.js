// The lesson's animation, without a DOM: the same bucket rule as solution.py
// (SHA-256 of the id, first eight hex digits as a number, modulo one hundred)
// run in the browser on python/fixtures/transcripts.json, recorded as a trace,
// laid out on a reading-pace timeline, and turned into a drawable scene for
// any moment. Tests compare the trace with python/fixtures/expected-trace.json,
// which the Python suite derives from the real solution, so the picture cannot
// drift from the code. The seeded shuffle is Python's own generator and is not
// replayed here: its results are read from that fixture, and the figure says so.

export const W = 900;
export const H = 486;
export const STEP_MS = 50;              // one animation tick; the motion preference stretches it

// ------------------------------------------------------------- SHA-256
// FIPS 180-4, synchronous, UTF-8 text in, lowercase hex out. Enough for the
// short ids of this lesson; the tests pin it to known digests and to Python.
const K256 = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];
const H256 = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
const rotr = (x, n) => (x >>> n) | (x << (32 - n));

export function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const padded = new Uint8Array(Math.ceil((bytes.length + 9) / 64) * 64);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  const bits = bytes.length * 8;
  view.setUint32(padded.length - 8, Math.floor(bits / 0x100000000));
  view.setUint32(padded.length - 4, bits >>> 0);
  const h = H256.slice();
  const w = new Uint32Array(64);
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i += 1) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = w[i - 16] + s0 + w[i - 7] + s1;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i += 1) {
      const t1 = (hh + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K256[i] + w[i]) >>> 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    [a, b, c, d, e, f, g, hh].forEach((value, i) => { h[i] = (h[i] + value) >>> 0; });
  }
  return h.map((value) => value.toString(16).padStart(8, '0')).join('');
}

// --------------------------------------------- the lesson's rule, ported
export function bucket(recordId) {
  return parseInt(sha256Hex(recordId).slice(0, 8), 16) % 100;
}
export function sideOf(recordId, validationShare) {
  return bucket(recordId) < validationShare ? 'validation' : 'train';
}
export function assign(ids, validationShare) {
  const sides = { train: [], validation: [] };
  for (const id of ids) {
    if (id === '') throw new Error('an empty id cannot be assigned');
    if (sides.train.includes(id) || sides.validation.includes(id)) throw new Error(`duplicate id '${id}'`);
    sides[sideOf(id, validationShare)].push(id);
  }
  return sides;
}
// side_of from practice_answer.py.
export function threeWaySide(recordId, testShare, validationShare) {
  const number = bucket(recordId);
  if (number < testShare) return 'test';
  if (number < testShare + validationShare) return 'validation';
  return 'train';
}

// `shuffle` is the seeded-shuffle result the Python file computed; it is
// carried through unchanged because Python's shuffle is not replayed here.
export function buildTrace(data, shuffle) {
  const records = [];
  for (const [week, ids] of [[1, data.week_one], [2, data.week_two]]) {
    for (const id of ids) {
      const hex = sha256Hex(id).slice(0, 8);
      records.push({ id, week, hex, value: parseInt(hex, 16), bucket: parseInt(hex, 16) % 100, side: sideOf(id, data.validation_share) });
    }
  }
  const all = [...data.week_one, ...data.week_two];
  const first = assign(data.week_one, data.validation_share);
  const both = assign(all, data.validation_share);
  const unchanged = data.week_one.every((id) => first.validation.includes(id) === both.validation.includes(id));
  return {
    validation_share: data.validation_share,
    records,
    unchanged,
    shuffle: {
      seed: shuffle.seed,
      week_one_validation: [...shuffle.week_one_validation],
      week_two_validation: [...shuffle.week_two_validation],
      moved: shuffle.moved.map((entry) => ({ ...entry })),
    },
    three_way: all.map((id) => ({ id, bucket: bucket(id), side: threeWaySide(id, data.test_share, data.validation_share) })),
  };
}

// ---------------------------------------------------------------- timeline

// Seconds at the calm setting: a reading pace. Each placement gets a short
// glide and over a second to read its caption; the whole run is about half a
// minute. The slow motion setting stretches all of it.
const INTRO = 3;
const INTRO_LATE_AT = 1.6;   // when the "what shipped" caption replaces the opening one
const PLACE = 2.4;           // one id: show its hash, carry it to its bucket, hold
const GLIDE_AT = 0.3;
const GLIDE = 0.8;
const WEEK_TWO = 1.5;
const UNCHANGED = 2.5;
const SHUFFLE = 3.2;
const PRACTICE_INTRO = 1;
const PRACTICE = 3;

const captionFor = (record) =>
  `${record.id}: sha256 starts ${record.hex}, as a number ${record.value}, mod 100 = ${record.bucket}: ${record.side}.`;

export function buildTimeline(trace, data) {
  const share = data.validation_share;
  const beats = [];
  let t = 0;
  const push = (beat) => { beats.push({ ...beat, start: t }); t += beat.duration; };
  const weekOne = trace.records.filter((record) => record.week === 1);
  const weekTwo = trace.records.filter((record) => record.week === 2);
  push({ kind: 'intro', duration: INTRO,
    caption: `Week 1: ${weekOne.length} transcripts arrive. Each id is hashed with SHA-256 into one of 100 buckets, and buckets 0 to ${share - 1} are validation.`,
    captionLate: 'What shipped: a seeded shuffle, re-run every week. Each week deals a new hand, so a transcript can change sides between runs.' });
  weekOne.forEach((record) => push({ kind: 'place', duration: PLACE, record, index: trace.records.indexOf(record), caption: captionFor(record) }));
  push({ kind: 'week-two', duration: WEEK_TWO,
    caption: `Week 2: ${weekTwo.length} more transcripts arrive. Only the new ids are hashed; the ${weekOne.length} earlier ones are not touched.` });
  weekTwo.forEach((record) => push({ kind: 'place', duration: PLACE, record, index: trace.records.indexOf(record), caption: captionFor(record) }));
  push({ kind: 'unchanged', duration: UNCHANGED,
    caption: trace.unchanged
      ? `The ${weekOne.length} week 1 transcripts did not move: a bucket depends only on the id, never on what else is in the set.`
      : 'A week 1 transcript changed sides, which this method must never allow.' });
  const shuffle = trace.shuffle;
  const movedText = shuffle.moved.map((entry) => `${entry.id} was ${entry.from} in week 1 and ${entry.to} in week 2`).join('; ');
  push({ kind: 'shuffle', duration: SHUFFLE,
    caption: `The seeded shuffle on the same ids, computed by the Python file (seed ${shuffle.seed}): week 1 validation ${shuffle.week_one_validation.join(', ')}; week 2 validation ${shuffle.week_two_validation.join(', ')}. ${movedText}: a leak.` });
  push({ kind: 'practice-intro', duration: PRACTICE_INTRO,
    caption: `Practice: a third side. Buckets below ${data.test_share} become test, buckets below ${data.test_share + share} validation, the rest train.` });
  const by = (side) => trace.three_way.filter((record) => record.side === side).map((record) => record.id).join(', ');
  push({ kind: 'practice', duration: PRACTICE,
    caption: `Three-way split with the same buckets: test ${by('test')}; validation ${by('validation')}; train ${by('train')}. Nothing was re-hashed.` });
  return { beats, duration: t, markers: beats.map((beat) => beat.start) };
}

// ----------------------------------------------------------------- scene

const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ramp = (t, from, duration) => clamp01((t - from) / duration);

const STRIP_X = 40, STRIP_W = 820, STRIP_Y = 232, STRIP_H = 36, SLOT = STRIP_W / 100;
const CHIP_X = 28, CHIP_Y = 84, CHIP_W = 98, CHIP_STEP = 106, CHIP_H = 34;
const LABEL_GAP = 64;    // marker labels closer than this share a row above the strip

export function chipRect(index) { return { x: CHIP_X + index * CHIP_STEP, y: CHIP_Y, w: CHIP_W, h: CHIP_H }; }
export const markerX = (bucketNumber) => STRIP_X + (bucketNumber + 0.5) * SLOT;

// The drawable state at `elapsed` seconds: which chips are visible, which ids
// have landed on the strip, where the travelling copy is, and the caption.
export function sceneAt(timeline, trace, data, elapsed) {
  const t = Math.max(0, Math.min(elapsed, timeline.duration));
  let beatIndex = timeline.beats.findIndex((beat) => t < beat.start + beat.duration);
  if (beatIndex < 0) beatIndex = timeline.beats.length - 1;
  const beat = timeline.beats[beatIndex];
  const local = t - beat.start;
  const kinds = timeline.beats.map((b) => b.kind);
  const weekTwoIndex = kinds.indexOf('week-two');
  const unchangedIndex = kinds.indexOf('unchanged');
  const shuffleIndex = kinds.indexOf('shuffle');
  const practiceIndex = kinds.indexOf('practice');

  const chips = trace.records.map((record, index) => ({ ...record, index, alpha: record.week === 1 ? 1 : 0, active: false, placed: false }));
  let stripAlpha = 1;
  if (beat.kind === 'intro') {
    chips.forEach((chip, index) => { if (chip.week === 1) chip.alpha = ramp(local, 0.2 + index * 0.18, 0.3); });
    stripAlpha = ramp(local, 0, 0.5);
  }
  const weekTwoAlpha = beatIndex < weekTwoIndex ? 0 : beatIndex === weekTwoIndex ? ramp(local, 0.2, 0.6) : 1;
  chips.forEach((chip) => { if (chip.week === 2) chip.alpha = weekTwoAlpha; });

  // Everything placed before the current beat has landed.
  const markers = [];
  for (let index = 1; index < beatIndex; index += 1) {
    const done = timeline.beats[index];
    if (done.kind !== 'place') continue;
    markers.push({ id: done.record.id, week: done.record.week, bucket: done.record.bucket, side: done.record.side, alpha: 1 });
    chips[done.index].placed = true;
  }
  let ghost = null;
  if (beat.kind === 'place') {
    const glide = easeInOut(ramp(local, GLIDE_AT, GLIDE));
    const landed = ramp(local, GLIDE_AT + GLIDE - 0.15, 0.3);
    chips[beat.index].active = true;
    if (local >= GLIDE_AT && landed < 1) ghost = { index: beat.index, id: beat.record.id, bucket: beat.record.bucket, progress: glide, alpha: 1 - landed };
    markers.push({ id: beat.record.id, week: beat.record.week, bucket: beat.record.bucket, side: beat.record.side, alpha: landed });
    chips[beat.index].placed = landed >= 1;
  }
  // Labels above the strip: a marker takes the first row where no earlier label is too close.
  markers.forEach((marker, index) => {
    marker.x = markerX(marker.bucket);
    let row = 0;
    while (markers.slice(0, index).some((other) => other.row === row && Math.abs(other.x - marker.x) < LABEL_GAP)) row += 1;
    marker.row = row % 3;
  });

  const frameAlpha = beatIndex === unchangedIndex ? ramp(local, 0.2, 0.6) : beatIndex === shuffleIndex ? 1 - ramp(local, 0, 0.6) : 0;
  const shuffleAlpha = beatIndex < shuffleIndex ? 0 : beatIndex === shuffleIndex ? ramp(local, 0.2, 0.8) : 1;
  const practice = beatIndex < practiceIndex ? 0 : beatIndex === practiceIndex ? easeInOut(ramp(local, 0.2, 1)) : 1;
  const threeWay = {};
  trace.three_way.forEach((record) => { threeWay[record.id] = record.side; });

  const caption = beat.kind === 'intro' && local >= INTRO_LATE_AT ? beat.captionLate : beat.caption;
  return {
    t, beatIndex, beat: beat.kind, caption, chips, markers, ghost, stripAlpha, frameAlpha, shuffleAlpha, practice, threeWay,
    shuffle: trace.shuffle, weekOne: data.week_one, all: [...data.week_one, ...data.week_two],
    validationShare: data.validation_share, testShare: data.test_share, finished: t >= timeline.duration,
  };
}

// ------------------------------------------------------------------ drawing

const INK = '#e9edf6', DIM = '#9aa5bd', PANEL = '#1e2740', LINE = '#232c40', BG = '#0d1119';
const BLUE = '#5da2ff', GREEN = '#62d98a', AMBER = '#f0b94b', RED = '#e06767';
const MONO = 'ui-monospace, Menlo, Consolas, monospace';
const SIDE_COLOR = { train: BLUE, validation: AMBER, test: DIM };
const PANEL_Y = 318;

function rounded(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, Math.max(0, w), h, r);
  else ctx.rect(x, y, Math.max(0, w), h);
}

function dashed(ctx, x, y1, y2, color, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(x, y1);
  ctx.lineTo(x, y2);
  ctx.stroke();
  ctx.restore();
}

export function drawScene(ctx, scene) {
  const { validationShare, testShare, practice } = scene;
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.font = `13px ${MONO}`;
  ctx.fillStyle = INK;
  ctx.fillText(`assign by sha256 bucket: validation share ${validationShare} of 100`, CHIP_X, 36);
  ctx.font = `11px ${MONO}`;
  ctx.fillStyle = DIM;
  ctx.fillText('transcript ids, in arrival order', CHIP_X, 62);

  // Chips: the ids as they arrive.
  scene.chips.forEach((chip) => {
    if (chip.alpha <= 0) return;
    const r = chipRect(chip.index);
    ctx.globalAlpha = chip.alpha * (chip.placed && !chip.active ? 0.45 : 1);
    ctx.fillStyle = PANEL;
    rounded(ctx, r.x, r.y, r.w, r.h, 4); ctx.fill();
    ctx.strokeStyle = chip.active ? BLUE : LINE;
    ctx.lineWidth = chip.active ? 1.5 : 1;
    rounded(ctx, r.x, r.y, r.w, r.h, 4); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = INK;
    ctx.font = `12px ${MONO}`;
    ctx.fillText(chip.id, r.x + 8, r.y + 15);
    ctx.fillStyle = DIM;
    ctx.font = `10px ${MONO}`;
    ctx.fillText(`week ${chip.week}`, r.x + 8, r.y + 28);
  });
  ctx.globalAlpha = 1;

  // The strip of one hundred buckets with its zones.
  const valStart = STRIP_X + testShare * SLOT * practice;
  const valEnd = STRIP_X + (validationShare + testShare * practice) * SLOT;
  ctx.globalAlpha = scene.stripAlpha;
  ctx.fillStyle = PANEL;
  rounded(ctx, STRIP_X, STRIP_Y, STRIP_W, STRIP_H, 4); ctx.fill();
  if (practice > 0) {
    ctx.fillStyle = INK;
    ctx.globalAlpha = scene.stripAlpha * 0.14 * practice;
    ctx.fillRect(STRIP_X, STRIP_Y, valStart - STRIP_X, STRIP_H);
  }
  ctx.fillStyle = AMBER;
  ctx.globalAlpha = scene.stripAlpha * 0.22;
  ctx.fillRect(valStart, STRIP_Y, valEnd - valStart, STRIP_H);
  ctx.globalAlpha = scene.stripAlpha;
  ctx.strokeStyle = LINE;
  rounded(ctx, STRIP_X, STRIP_Y, STRIP_W, STRIP_H, 4); ctx.stroke();
  dashed(ctx, valEnd, STRIP_Y - 6, STRIP_Y + STRIP_H + 6, AMBER, scene.stripAlpha);
  if (practice > 0) dashed(ctx, valStart, STRIP_Y - 6, STRIP_Y + STRIP_H + 6, DIM, scene.stripAlpha * practice);
  ctx.globalAlpha = scene.stripAlpha;
  ctx.font = `10px ${MONO}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = DIM;
  [0, 20, 40, 60, 80, 99].forEach((value) => ctx.fillText(String(value), markerX(value), STRIP_Y + STRIP_H + 14));
  // Zone names sit under the tick numbers, clear of the marker bars.
  ctx.textAlign = 'left';
  ctx.font = `10px ${MONO}`;
  const ZONE_Y = STRIP_Y + STRIP_H + 30;
  if (practice < 0.5) {
    ctx.fillStyle = AMBER;
    ctx.fillText(`validation 0 to ${validationShare - 1}`, valStart + 2, ZONE_Y);
    ctx.fillStyle = BLUE;
    ctx.fillText(`train ${validationShare} to 99`, valEnd + 6, ZONE_Y);
  } else {
    ctx.fillStyle = DIM;
    ctx.fillText(`test 0 to ${testShare - 1}`, STRIP_X + 2, ZONE_Y);
    ctx.fillStyle = AMBER;
    ctx.fillText(`validation ${testShare} to ${testShare + validationShare - 1}`, valStart + 2, ZONE_Y);
    ctx.fillStyle = BLUE;
    ctx.fillText(`train ${testShare + validationShare} to 99`, valEnd + 6, ZONE_Y);
  }
  ctx.globalAlpha = 1;

  // Landed ids: a bar on the strip and a label above it.
  scene.markers.forEach((marker) => {
    if (marker.alpha <= 0) return;
    const after = scene.threeWay[marker.id] || marker.side;
    const draw = (color, alpha) => {
      if (alpha <= 0) return;
      ctx.globalAlpha = marker.alpha * alpha;
      ctx.fillStyle = color;
      rounded(ctx, marker.x - 3, STRIP_Y + 3, 6, STRIP_H - 6, 2); ctx.fill();
      ctx.font = `10.5px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.fillText(`${marker.id} ${marker.bucket}`, marker.x, STRIP_Y - 8 - marker.row * 15);
      ctx.textAlign = 'left';
    };
    draw(SIDE_COLOR[marker.side], 1 - practice);
    draw(SIDE_COLOR[after], practice);
    if (marker.week === 1 && scene.frameAlpha > 0) {
      ctx.globalAlpha = marker.alpha * scene.frameAlpha;
      ctx.strokeStyle = GREEN;
      ctx.lineWidth = 1.5;
      rounded(ctx, marker.x - 7, STRIP_Y - 1, 14, STRIP_H + 2, 3); ctx.stroke();
      ctx.lineWidth = 1;
    }
  });
  ctx.globalAlpha = 1;

  // The travelling copy of the id being placed.
  if (scene.ghost) {
    const g = scene.ghost;
    const from = chipRect(g.index);
    const x0 = from.x + from.w / 2, y0 = from.y + from.h / 2;
    const x1 = markerX(g.bucket), y1 = STRIP_Y + STRIP_H / 2;
    const x = x0 + (x1 - x0) * g.progress, y = y0 + (y1 - y0) * g.progress;
    ctx.globalAlpha = Math.max(0, g.alpha);
    ctx.fillStyle = PANEL;
    rounded(ctx, x - 32, y - 10, 64, 20, 4); ctx.fill();
    ctx.strokeStyle = BLUE;
    rounded(ctx, x - 32, y - 10, 64, 20, 4); ctx.stroke();
    ctx.fillStyle = INK;
    ctx.font = `11px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText(g.id, x, y + 4);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }

  // The seeded shuffle, from the Python run, for comparison.
  if (scene.shuffleAlpha > 0) {
    const s = scene.shuffle;
    ctx.globalAlpha = scene.shuffleAlpha;
    ctx.fillStyle = DIM;
    ctx.font = `11px ${MONO}`;
    ctx.fillText(`seeded shuffle for comparison (seed ${s.seed}), computed by the Python file`, CHIP_X, PANEL_Y + 14);
    const rows = [
      { label: 'week 1', ids: scene.weekOne, validation: s.week_one_validation, y: PANEL_Y + 28 },
      { label: 'week 2', ids: scene.all, validation: s.week_two_validation, y: PANEL_Y + 72 },
    ];
    const movedIds = s.moved.map((entry) => entry.id);
    rows.forEach((row, rowIndex) => {
      ctx.fillStyle = DIM;
      ctx.font = `11px ${MONO}`;
      ctx.fillText(row.label, CHIP_X, row.y + 17);
      row.ids.forEach((id, index) => {
        const x = 96 + index * 94, side = row.validation.includes(id) ? 'validation' : 'train';
        const moved = rowIndex === 1 && movedIds.includes(id);
        ctx.fillStyle = SIDE_COLOR[side];
        ctx.globalAlpha = scene.shuffleAlpha * (side === 'validation' ? 0.35 : 0.22);
        rounded(ctx, x, row.y, 88, 26, 4); ctx.fill();
        ctx.globalAlpha = scene.shuffleAlpha;
        ctx.strokeStyle = moved ? RED : LINE;
        ctx.lineWidth = moved ? 1.5 : 1;
        rounded(ctx, x, row.y, 88, 26, 4); ctx.stroke();
        ctx.lineWidth = 1;
        ctx.fillStyle = INK;
        ctx.font = `11px ${MONO}`;
        ctx.fillText(id, x + 8, row.y + 17);
      });
    });
    ctx.fillStyle = RED;
    ctx.font = `10.5px ${MONO}`;
    s.moved.forEach((entry, index) => {
      ctx.fillText(`${entry.id}: ${entry.from} in week 1, ${entry.to} in week 2: a leak`, CHIP_X, PANEL_Y + 124 + index * 14);
    });
    ctx.globalAlpha = 1;
  }
}
