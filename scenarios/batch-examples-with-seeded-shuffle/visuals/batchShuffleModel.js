// The lesson's animation, without a DOM: the same batching as solution.py,
// run on the same ten examples (python/fixtures/examples.json), recorded as a
// trace, laid out on a reading-pace timeline, and turned into a drawable scene
// for any moment. One honest shortcut: the shuffled order of each epoch comes
// from python/fixtures/expected-trace.json, which the Python suite derives
// from random.Random(seed).shuffle (the standard library's generator is not
// ported here). Everything else, the slicing into batches, the label mix, the
// file-order comparison, and the practice drop, is recomputed in JavaScript,
// and tests compare the whole result with that fixture.

export const W = 900;
export const H = 486;
export const STEP_MS = 50;             // one animation tick; the motion preference stretches it

// label_mix and the slicing loop from solution.py.
export function labelMix(batch) {
  const counts = {};
  for (const example of batch) counts[example.label] = (counts[example.label] || 0) + 1;
  return counts;
}
export function slices(order, batchSize) {
  if (batchSize < 1) throw new Error(`batch_size must be at least 1, got ${batchSize}`);
  const out = [];
  for (let start = 0; start < order.length; start += batchSize) out.push(order.slice(start, start + batchSize));
  return out;
}
// batches from practice_answer.py: the first short slice ends the epoch when dropLast is set.
export function batchesOf(order, batchSize, dropLast) {
  const out = [];
  for (const batch of slices(order, batchSize)) {
    if (dropLast && batch.length < batchSize) break;
    out.push(batch);
  }
  return out;
}

export function buildTrace(data, pinned) {
  const ids = data.examples.map((example) => example.id);
  const byId = new Map(data.examples.map((example) => [example.id, example]));
  if (!Array.isArray(pinned.epochs) || pinned.epochs.length !== data.epochs) throw new Error('the pinned trace must hold one order per epoch');
  const epochs = pinned.epochs.map((entry, index) => {
    if (entry.seed !== data.seed + index) throw new Error(`epoch ${index + 1} must use seed ${data.seed + index}`);
    if ([...entry.order].sort().join() !== [...ids].sort().join()) throw new Error(`epoch ${index + 1} order is not a permutation of the examples`);
    const ordered = entry.order.map((id) => byId.get(id));
    const batches = batchesOf(ordered, data.batch_size, false).map((batch) => ({ ids: batch.map((example) => example.id), mix: labelMix(batch) }));
    return { epoch: index + 1, seed: entry.seed, order: [...entry.order], batches };
  });
  const fileBatches = batchesOf(data.examples, data.batch_size, false).map((batch) => ({ ids: batch.map((example) => example.id), mix: labelMix(batch) }));
  const practice = epochs.map((epoch) => {
    const kept = batchesOf(epoch.order.map((id) => byId.get(id)), data.batch_size, true).map((batch) => batch.map((example) => example.id));
    const keptIds = kept.flat();
    return { epoch: epoch.epoch, seed: epoch.seed, batches: kept, left_out: ids.filter((id) => !keptIds.includes(id)) };
  });
  return {
    batch_size: data.batch_size,
    seed: data.seed,
    epochs,
    mixed_full_batches: epochs.map((epoch) => epoch.batches.filter((batch) => batch.ids.length === data.batch_size && Object.keys(batch.mix).length > 1).length),
    file_order: { batches: fileBatches, single_label_batches: fileBatches.filter((batch) => Object.keys(batch.mix).length === 1).length },
    practice,
  };
}

// ---------------------------------------------------------------- timeline

// Seconds at the calm setting: a reading pace. Each epoch is one shuffle beat
// (ten cards glide to their new slots one after another) and one beat per
// batch; the whole run is about half a minute.
const INTRO = 3.0;
const INTRO_LATE_AT = 1.5;      // when the "what shipped" brackets and caption appear
const SHUFFLE = 5.0;
const RETURN_AT = 0.0;          // epoch two: cards glide home first
const RETURN = 0.6;
const MOVE_FROM = 0.8;          // first card starts its glide
const MOVE_STAGGER = 0.32;
const MOVE = 0.6;
const BATCH_BEAT = 2.4;
const BATCH_MOVE_AT = 0.2;
const BATCH_MOVE = 0.7;
const OUTRO = 2.6;
const PRACTICE_INTRO = 1.0;
const PRACTICE = 3.0;

const describe = (mix) => Object.entries(mix).map(([label, count]) => `${label} ${count}`).join(', ');

export function buildTimeline(trace, data) {
  const beats = [];
  let t = 0;
  const n = data.examples.length;
  const fileText = trace.file_order.batches.map((batch, index) => `batch ${index + 1} ${describe(batch.mix)}`).join('; ');
  beats.push({ kind: 'intro', start: t, duration: INTRO,
    caption: `${n} labeled examples in file order, sorted by label: ${describe(labelMix(data.examples))}. Batch size ${data.batch_size}, seed ${data.seed}, ${data.epochs} epochs.`,
    captionLate: `What shipped: batches cut from the file order. ${fileText}: ${trace.file_order.single_label_batches} of ${trace.file_order.batches.length} batches hold a single label.` });
  t += INTRO;
  trace.epochs.forEach((epoch, epochIndex) => {
    beats.push({ kind: 'shuffle', start: t, duration: SHUFFLE, epochIndex,
      caption: `Epoch ${epoch.epoch}, seed ${epoch.seed}: a copy of the list is shuffled, one card to each new slot. The order is ${epoch.order.join(', ')}.` });
    t += SHUFFLE;
    epoch.batches.forEach((batch, batchIndex) => {
      const ragged = batch.ids.length < data.batch_size;
      beats.push({ kind: 'batch', start: t, duration: BATCH_BEAT, epochIndex, batchIndex,
        caption: ragged
          ? `Batch ${batchIndex + 1}: ${batch.ids.join(', ')}: the ragged last batch, ${batch.ids.length} examples instead of ${data.batch_size}; ${describe(batch.mix)}.`
          : `Batch ${batchIndex + 1}: ${batch.ids.join(', ')}: ${describe(batch.mix)}.` });
      t += BATCH_BEAT;
    });
  });
  beats.push({ kind: 'outro', start: t, duration: OUTRO,
    caption: `Each epoch visits all ${n} examples once in its own order. Full batches that mix both labels: ${trace.mixed_full_batches.map((count, index) => `${count} of ${trace.epochs[index].batches.length - 1} in epoch ${index + 1}`).join(', ')}; the last batch of each epoch holds ${trace.epochs[0].batches.at(-1).ids.length}.` });
  t += OUTRO;
  beats.push({ kind: 'practice-intro', start: t, duration: PRACTICE_INTRO,
    caption: 'Practice variation: with drop_last set, a final batch shorter than the batch size is skipped instead of yielded.' });
  t += PRACTICE_INTRO;
  beats.push({ kind: 'practice', start: t, duration: PRACTICE,
    caption: `With drop_last: ${trace.practice.map((entry) => `epoch ${entry.epoch} leaves out ${entry.left_out.join(' and ')}`).join('; ')}; ${trace.practice[0].batches.flat().length} examples per epoch, every batch full.` });
  t += PRACTICE;
  return { beats, duration: t, markers: beats.map((beat) => beat.start) };
}

// ----------------------------------------------------------------- scene

const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ramp = (t, from, duration) => clamp01((t - from) / duration);
const lerp = (from, to, p) => from + (to - from) * p;

export const CARD_W = 70;
export const CARD_H = 44;
const POOL_X0 = 50, POOL_Y = 92, POOL_GAP = 80;          // the pool row: ten slots across
const ROW_X0 = 150, ROW_Y0 = 212, ROW_GAP = 76;          // the batch rows below it
export const poolSlot = (index) => ({ x: POOL_X0 + index * POOL_GAP, y: POOL_Y });
export const rowSlot = (row, column) => ({ x: ROW_X0 + column * POOL_GAP, y: ROW_Y0 + row * ROW_GAP });

// Where every card sits at `elapsed` seconds, plus what the panels show.
export function sceneAt(timeline, trace, data, elapsed) {
  const t = Math.max(0, Math.min(elapsed, timeline.duration));
  let beatIndex = timeline.beats.findIndex((beat) => t < beat.start + beat.duration);
  if (beatIndex < 0) beatIndex = timeline.beats.length - 1;
  const beat = timeline.beats[beatIndex];
  const local = t - beat.start;
  const fileIndex = new Map(data.examples.map((example, index) => [example.id, index]));
  const lastEpoch = trace.epochs.length - 1;

  // Which epoch the picture belongs to, and how far into it we are.
  let epochIndex = beat.kind === 'intro' ? -1 : (beat.epochIndex ?? lastEpoch);
  const epoch = epochIndex >= 0 ? trace.epochs[epochIndex] : null;
  const slotOf = new Map(epoch ? epoch.order.map((id, index) => [id, index]) : []);
  const placedBatches = beat.kind === 'batch' ? beat.batchIndex : (beat.kind === 'shuffle' ? -1 : (epoch ? epoch.batches.length : 0));
  const dropped = new Set(beat.kind === 'practice' ? trace.practice[lastEpoch].left_out : []);

  const cards = data.examples.map((example) => {
    const home = poolSlot(fileIndex.get(example.id));
    let x = home.x, y = home.y, state = 'pool';
    if (epoch) {
      const slot = slotOf.get(example.id);
      const shuffled = poolSlot(slot);
      const batchIndex = Math.floor(slot / data.batch_size);
      const column = slot % data.batch_size;
      const target = rowSlot(batchIndex, column);
      if (beat.kind === 'shuffle') {
        // Epoch two starts from the previous epoch's batch rows: glide home, then to the new slot.
        let from = home;
        if (epochIndex > 0) {
          const previous = trace.epochs[epochIndex - 1];
          const previousSlot = previous.order.indexOf(example.id);
          const previousPlace = rowSlot(Math.floor(previousSlot / data.batch_size), previousSlot % data.batch_size);
          const back = easeInOut(ramp(local, RETURN_AT, RETURN));
          from = { x: lerp(previousPlace.x, home.x, back), y: lerp(previousPlace.y, home.y, back) };
        }
        // Each card arcs a little above the row while it glides, so it passes over cards already at rest.
        const p = easeInOut(ramp(local, MOVE_FROM + slot * MOVE_STAGGER, MOVE));
        x = lerp(from.x, shuffled.x, p); y = lerp(from.y, shuffled.y, p) - 34 * Math.sin(Math.PI * p);
      } else if (batchIndex < placedBatches) {
        x = target.x; y = target.y; state = 'batch';
      } else if (beat.kind === 'batch' && batchIndex === placedBatches) {
        const p = easeInOut(ramp(local, BATCH_MOVE_AT, BATCH_MOVE));
        x = lerp(shuffled.x, target.x, p); y = lerp(shuffled.y, target.y, p); state = p >= 1 ? 'batch' : 'moving';
      } else {
        x = shuffled.x; y = shuffled.y;
      }
    }
    let alpha = 1;
    if (dropped.has(example.id)) { state = 'dropped'; alpha = beat.kind === 'practice' ? 1 - 0.6 * ramp(local, 0.3, 0.8) : 0.4; }
    if (beat.kind === 'intro') alpha = ramp(local, 0.1 + fileIndex.get(example.id) * 0.12, 0.4);
    return { id: example.id, label: example.label, x, y, alpha, state };
  });

  const shippedAlpha = beat.kind === 'intro' ? ramp(local, INTRO_LATE_AT, 0.5) : (beat.kind === 'shuffle' && epochIndex === 0 ? 1 - ramp(local, 0, 0.6) : 0);
  const rows = epoch ? epoch.batches.map((batch, index) => ({ index, placed: index < placedBatches || (beat.kind === 'batch' && index === placedBatches && local >= BATCH_MOVE_AT + BATCH_MOVE),
    mix: describe(batch.mix), ragged: batch.ids.length < data.batch_size, dropped: dropped.size > 0 && batch.ids.every((id) => dropped.has(id)) })) : [];
  const readout = {
    epoch: epoch ? epoch.epoch : null,
    seed: epoch ? epoch.seed : data.seed,
    placed: Math.max(0, placedBatches),
    total: epoch ? epoch.batches.length : trace.epochs[0].batches.length,
    order: epoch && beat.kind !== 'shuffle' ? epoch.order.join(' ') : (epoch && local >= MOVE_FROM + (data.examples.length - 1) * MOVE_STAGGER + MOVE ? epoch.order.join(' ') : ''),
    dropLast: dropped.size > 0,
    leftOut: dropped.size > 0 ? trace.practice.map((entry) => `epoch ${entry.epoch}: ${entry.left_out.join(', ')}`) : [],
  };
  const caption = beat.kind === 'intro' && local >= INTRO_LATE_AT ? beat.captionLate : beat.caption;
  return { t, beatIndex, beat: beat.kind, caption, cards, rows, readout, shippedAlpha, fileBatches: trace.file_order.batches,
    batchSize: data.batch_size, epochs: data.epochs, finished: t >= timeline.duration };
}

// ------------------------------------------------------------------ drawing

const INK = '#e9edf6', DIM = '#9aa5bd', PANEL = '#1e2740', LINE = '#232c40', BG = '#0d1119';
const BLUE = '#5da2ff', GREEN = '#62d98a', AMBER = '#f0b94b', RED = '#e06767';
const MONO = 'ui-monospace, Menlo, Consolas, monospace';
const LABEL_COLOR = { billing: BLUE, access: GREEN };
const RX = 500, RY = 212, RW = 372, RH = 212;            // the readout panel, right of the batch rows

function rounded(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, Math.max(0, w), h, r);
  else ctx.rect(x, y, Math.max(0, w), h);
}

export function drawScene(ctx, scene) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.font = `13px ${MONO}`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.fillText(`batches(examples, batch_size=${scene.batchSize}, seed): a seeded shuffle of a copy, sliced ${scene.batchSize} at a time`, 28, 36);
  ctx.fillStyle = DIM;
  ctx.font = `10.5px ${MONO}`;
  ctx.fillText('the list, in file order (then in the shuffled order of the epoch)', POOL_X0, POOL_Y - 12);

  // Pool slots.
  for (let index = 0; index < scene.cards.length; index += 1) {
    const slot = poolSlot(index);
    ctx.strokeStyle = LINE;
    ctx.setLineDash([3, 3]);
    rounded(ctx, slot.x, slot.y, CARD_W, CARD_H, 6); ctx.stroke();
    ctx.setLineDash([]);
  }

  // What shipped: amber brackets under the file-order batches.
  if (scene.shippedAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = scene.shippedAlpha;
    ctx.strokeStyle = AMBER;
    ctx.fillStyle = AMBER;
    ctx.font = `10px ${MONO}`;
    let start = 0;
    for (const batch of scene.fileBatches) {
      const x0 = poolSlot(start).x, x1 = poolSlot(start + batch.ids.length - 1).x + CARD_W;
      const y = POOL_Y + CARD_H + 10;
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0, y + 6); ctx.lineTo(x1, y + 6); ctx.lineTo(x1, y); ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillText(`file order: ${describe(batch.mix)}`, (x0 + x1) / 2, y + 20);
      start += batch.ids.length;
    }
    ctx.textAlign = 'left';
    ctx.restore();
  }

  // Batch rows.
  ctx.font = `11px ${MONO}`;
  for (let row = 0; row < 3; row += 1) {
    const slot = rowSlot(row, 0);
    ctx.fillStyle = DIM;
    ctx.fillText(`batch ${row + 1}`, 60, slot.y + 27);
    for (let column = 0; column < scene.batchSize; column += 1) {
      const place = rowSlot(row, column);
      ctx.strokeStyle = LINE;
      ctx.setLineDash([3, 3]);
      rounded(ctx, place.x, place.y, CARD_W, CARD_H, 6); ctx.stroke();
      ctx.setLineDash([]);
    }
    const info = scene.rows[row];
    if (info && info.placed) {
      ctx.fillStyle = info.dropped ? RED : (info.ragged ? AMBER : DIM);
      ctx.fillText(info.dropped ? 'skipped (drop_last)' : (info.ragged ? `ragged: ${info.mix}` : info.mix), slot.x, slot.y + CARD_H + 14);
    }
  }

  // Cards.
  for (const card of scene.cards) {
    if (card.alpha <= 0) continue;
    ctx.save();
    ctx.globalAlpha = card.alpha;
    ctx.fillStyle = PANEL;
    rounded(ctx, card.x, card.y, CARD_W, CARD_H, 6); ctx.fill();
    ctx.lineWidth = card.state === 'dropped' ? 2 : 1.5;
    ctx.strokeStyle = card.state === 'dropped' ? RED : LABEL_COLOR[card.label] || DIM;
    rounded(ctx, card.x, card.y, CARD_W, CARD_H, 6); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = INK;
    ctx.font = `12px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText(card.id, card.x + CARD_W / 2, card.y + 19);
    ctx.fillStyle = card.state === 'dropped' ? RED : LABEL_COLOR[card.label] || DIM;
    ctx.font = `10px ${MONO}`;
    ctx.fillText(card.label, card.x + CARD_W / 2, card.y + 34);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  // Readout panel.
  ctx.fillStyle = PANEL;
  rounded(ctx, RX, RY, RW, RH, 6); ctx.fill();
  ctx.strokeStyle = LINE;
  rounded(ctx, RX, RY, RW, RH, 6); ctx.stroke();
  ctx.font = `11px ${MONO}`;
  ctx.fillStyle = DIM;
  ctx.fillText('generator readout', RX + 12, RY + 22);
  ctx.font = `12px ${MONO}`;
  ctx.fillStyle = INK;
  const r = scene.readout;
  const lines = r.epoch === null
    ? ['not started', `seed ${r.seed} for epoch 1, seed ${r.seed + 1} for epoch 2`, `batch size ${scene.batchSize}`]
    : [`epoch ${r.epoch} of ${scene.epochs}, seed ${r.seed}`, `batches yielded: ${r.placed} of ${r.total}`, r.order ? `order: ${r.order}` : 'order: shuffling the copy'];
  if (r.dropLast) lines.push('drop_last=True', ...r.leftOut.map((entry) => `left out ${entry}`));
  lines.forEach((line, index) => {
    ctx.fillStyle = index === 0 ? INK : DIM;
    ctx.fillText(line, RX + 12, RY + 50 + index * 24);
  });
  ctx.globalAlpha = 1;
}
