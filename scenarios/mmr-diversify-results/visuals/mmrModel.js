// The lesson's animation, without a DOM: the same relevance ranking, round
// scoring, and greedy MMR loop as solution.py (and the capped loop of the
// practice answer), run on the same six candidates
// (python/fixtures/candidates.json), recorded as a trace, laid out on a
// reading-pace timeline, and turned into a drawable scene for any moment.
// Tests compare the trace with python/fixtures/expected-trace.json, which the
// Python suite derives from the real functions, so the picture cannot drift.

export const W = 900;
export const H = 486;
export const STEP_MS = 50;             // one animation tick; the motion preference stretches it

const round6 = (x) => Number(x.toFixed(6));
const f2 = (x) => x.toFixed(2);
const f3 = (x) => x.toFixed(3);
const lerp = (from, to, p) => from + (to - from) * p;

// top_by_relevance, score_round, mmr, pairwise_max, and sources_of from
// solution.py; mmr takes the practice answer's optional cap per source.
export function topByRelevance(candidates, k) {
  const pairs = candidates.map((candidate, index) => [-candidate.relevance, index]);
  pairs.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return pairs.slice(0, k).map((pair) => pair[1]);
}
export function scoreRound(candidates, similarity, selected, remaining, lam) {
  const rows = [];
  for (const index of remaining) {
    let penalty = 0.0;
    for (const chosen of selected) {
      if (similarity[index][chosen] > penalty) penalty = similarity[index][chosen];
    }
    const score = lam * candidates[index].relevance - (1 - lam) * penalty;
    rows.push({ index, penalty, score });
  }
  return rows;
}
export function mmr(candidates, similarity, k, lam, maxPerSource = null) {
  if (!(lam >= 0.0 && lam <= 1.0)) throw new Error(`lambda must be between 0 and 1, got ${lam}`);
  const n = candidates.length;
  if (similarity.length !== n) throw new Error(`similarity has ${similarity.length} rows for ${n} candidates`);
  for (const row of similarity) {
    if (row.length !== n) throw new Error(`a similarity row has ${row.length} entries for ${n} candidates`);
  }
  const selected = [];
  let remaining = candidates.map((candidate, index) => index);
  const picks = [];
  const rounds = [];
  while (selected.length < k && remaining.length) {
    const allowed = [];
    const blocked = [];
    for (const index of remaining) {
      let count = 0;
      for (const chosen of selected) {
        if (candidates[chosen].source === candidates[index].source) count += 1;
      }
      if (maxPerSource !== null && count >= maxPerSource) blocked.push(index);
      else allowed.push(index);
    }
    if (!allowed.length) break;
    const rows = scoreRound(candidates, similarity, selected, allowed, lam);
    let best = rows[0];
    for (const row of rows) {
      if (row.score > best.score) best = row;
    }
    rounds.push({ selected: selected.slice(), blocked, rows, picked: best.index });
    selected.push(best.index);
    remaining = remaining.filter((index) => index !== best.index);
    picks.push(best);
  }
  return { picks, rounds };
}
export function pairwiseMax(similarity, indexes) {
  let highest = 0.0;
  for (let first = 0; first < indexes.length; first += 1) {
    for (let second = first + 1; second < indexes.length; second += 1) {
      if (similarity[indexes[first]][indexes[second]] > highest) highest = similarity[indexes[first]][indexes[second]];
    }
  }
  return highest;
}
export function sourcesOf(candidates, indexes) {
  const found = [];
  for (const index of indexes) {
    if (!found.includes(candidates[index].source)) found.push(candidates[index].source);
  }
  return found.sort();
}

export function buildTrace(data) {
  const { candidates, similarity, k } = data;
  const lam = data.lambda;
  const ids = (indexes) => indexes.map((index) => candidates[index].id);
  const summary = (indexes) => ({ ids: ids(indexes), pairwise_max: round6(pairwiseMax(similarity, indexes)), sources: sourcesOf(candidates, indexes) });
  const rowsRecord = (rows) => rows.map((row) => ({ id: candidates[row.index].id, relevance: candidates[row.index].relevance, penalty: round6(row.penalty), score: round6(row.score) }));
  const worked = mmr(candidates, similarity, k, lam);
  const practice = mmr(candidates, similarity, k, lam, data.max_per_source);
  const pickedOf = (run) => run.picks.map((pick) => pick.index);
  return {
    k,
    lambda: lam,
    relevance_only: summary(topByRelevance(candidates, k)),
    rounds: worked.rounds.map((round) => ({ selected: ids(round.selected), rows: rowsRecord(round.rows), picked: candidates[round.picked].id })),
    picks: summary(pickedOf(worked)),
    practice: {
      max_per_source: data.max_per_source,
      rounds: practice.rounds.map((round) => ({ selected: ids(round.selected), blocked: ids(round.blocked), rows: rowsRecord(round.rows), picked: candidates[round.picked].id })),
      picks: summary(pickedOf(practice)),
    },
    lambda_extremes: { one: ids(pickedOf(mmr(candidates, similarity, k, 1.0))), zero: ids(pickedOf(mmr(candidates, similarity, k, 0.0))) },
  };
}

// ---------------------------------------------------------------- timeline

// Seconds at the calm setting: a reading pace. Each pick after the first is
// two beats, one for the penalties and scores, one for the choice; the whole
// run is about twenty five seconds.
const INTRO = 3.2;
const INTRO_LATE_AT = 1.5;      // when the shipped trio and its caption appear
const PICK_ONE = 2.8;
const SCORE_BEAT = 2.6;
const CHOOSE_BEAT = 2.2;
const OUTRO = 3.2;
const PRACTICE_INTRO = 1.0;
const PRACTICE_BLOCK = 2.6;
const PRACTICE_PICK = 3.2;

const rowOf = (round, id) => round.rows.find((row) => row.id === id);
const listRows = (round, idsToList) => idsToList.map((id) => `${id} ${f3(rowOf(round, id).score)}`).join(', ');

export function buildTimeline(trace, data) {
  const beats = [];
  let t = 0;
  const n = data.candidates.length;
  const shipped = trace.relevance_only;
  const [r1, r2, r3] = trace.rounds;
  const lam = trace.lambda;
  beats.push({ kind: 'intro', start: t, duration: INTRO,
    caption: `${n} candidate chunks for "rotate key", each with a relevance score; a similarity matrix behind them says how alike every pair is.`,
    captionLate: `What shipped: the top ${trace.k} by relevance, ${shipped.ids.join(', ')}: three copies of one paragraph (pairwise similarity ${f2(0.9)} to ${f2(shipped.pairwise_max)}). The revocation step, c4, never reached the model.` });
  t += INTRO;
  beats.push({ kind: 'pick', round: 0, start: t, duration: PICK_ONE,
    caption: `Pick 1: nothing is selected yet, so every penalty is 0 and the score is ${lam} times the relevance; ${r1.picked} scores ${f3(rowOf(r1, r1.picked).score)} and is picked.` });
  t += PICK_ONE;
  beats.push({ kind: 'score', round: 1, start: t, duration: SCORE_BEAT,
    caption: `Pick 2: each remaining chunk is penalized by its similarity to ${r1.picked}: c2 ${f2(rowOf(r2, 'c2').penalty)} and c3 ${f2(rowOf(r2, 'c3').penalty)} (the copies), c4 ${f2(rowOf(r2, 'c4').penalty)}, c5 ${f2(rowOf(r2, 'c5').penalty)}, c6 ${f2(rowOf(r2, 'c6').penalty)}. Scores: ${listRows(r2, ['c2', 'c3', 'c4', 'c5', 'c6'])}.` });
  t += SCORE_BEAT;
  beats.push({ kind: 'choose', round: 1, start: t, duration: CHOOSE_BEAT,
    caption: `${r2.picked} wins at ${f3(rowOf(r2, r2.picked).score)}: its relevance ${f2(rowOf(r2, 'c4').relevance)} costs it against c2, but its penalty ${f2(rowOf(r2, 'c4').penalty)} is half of c2's ${f2(rowOf(r2, 'c2').penalty)}. The revocation step is in.` });
  t += CHOOSE_BEAT;
  beats.push({ kind: 'score', round: 2, start: t, duration: SCORE_BEAT,
    caption: `Pick 3: the penalty is the highest similarity to anything picked, ${r1.picked} or ${r2.picked}: c2 stays at ${f2(rowOf(r3, 'c2').penalty)}, c3 at ${f2(rowOf(r3, 'c3').penalty)}, c5 ${f2(rowOf(r3, 'c5').penalty)} (its ${f2(data.similarity[4][3])} to c4 is lower), c6 ${f2(rowOf(r3, 'c6').penalty)}. Scores: ${listRows(r3, ['c2', 'c3', 'c5', 'c6'])}.` });
  t += SCORE_BEAT;
  beats.push({ kind: 'choose', round: 2, start: t, duration: CHOOSE_BEAT,
    caption: `${r3.picked} wins at ${f3(rowOf(r3, r3.picked).score)} over c2's ${f3(rowOf(r3, 'c2').score)}: the grace period note beats a third copy of the rotation paragraph.` });
  t += CHOOSE_BEAT;
  beats.push({ kind: 'outro', start: t, duration: OUTRO,
    caption: `MMR picks ${trace.picks.ids.join(', ')}: the highest similarity between any two is ${f2(trace.picks.pairwise_max)} and ${trace.picks.sources.length} sources are covered. Relevance alone picks ${shipped.ids.join(', ')}: every pair at ${f2(0.9)} or more, ${shipped.sources.length} source.` });
  t += OUTRO;
  beats.push({ kind: 'practice-intro', start: t, duration: PRACTICE_INTRO,
    caption: `Practice variation: at most ${trace.practice.max_per_source} pick per source.` });
  t += PRACTICE_INTRO;
  const p3 = trace.practice.rounds[2];
  beats.push({ kind: 'practice-block', start: t, duration: PRACTICE_BLOCK,
    caption: `With the cap, pick 3 skips ${p3.blocked.slice(0, 2).join(' and ')} (runbook already has c1) and ${p3.blocked[2]} (security-faq already has c4): only ${p3.picked} is allowed.` });
  t += PRACTICE_BLOCK;
  const practicePicks = trace.practice.picks;
  beats.push({ kind: 'practice-pick', start: t, duration: PRACTICE_PICK,
    caption: `${p3.picked} is picked at ${f3(rowOf(p3, p3.picked).score)}: the command flags from a third source. The picks become ${practicePicks.ids.join(', ')}, highest similarity ${f2(practicePicks.pairwise_max)}, three sources; the price is a lower-relevance chunk in the third slot.` });
  t += PRACTICE_PICK;
  return { beats, duration: t, markers: beats.map((beat) => beat.start) };
}

// ----------------------------------------------------------------- scene

const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ramp = (t, from, duration) => clamp01((t - from) / duration);

const CX = 28, CW = 560, CY0 = 84, PITCH = 58, CH = 48;     // candidate rows
const SX = 620, SW = 252, SY0 = 84, SPITCH = 58;              // selected slots
const RX = 620, RY = 262, RW = 252, RH = 150;                 // readout panel

const homeOf = (index) => ({ x: CX, y: CY0 + index * PITCH, w: CW });
const slotOf = (slot) => ({ x: SX, y: SY0 + slot * SPITCH, w: SW });

// The drawable state at `elapsed` seconds: six chips (at home, gliding, or
// in a slot), the penalties and scores of the current round, the slots, the
// readout, the shipped trio outline, the comparison, and the caption.
export function sceneAt(timeline, trace, data, elapsed) {
  const t = Math.max(0, Math.min(elapsed, timeline.duration));
  let beatIndex = timeline.beats.findIndex((beat) => t < beat.start + beat.duration);
  if (beatIndex < 0) beatIndex = timeline.beats.length - 1;
  const beat = timeline.beats[beatIndex];
  const local = t - beat.start;
  const kinds = timeline.beats.map((b) => b.kind);
  const outroBeat = kinds.indexOf('outro');
  const inPractice = beatIndex > outroBeat;
  const ids = data.candidates.map((candidate) => candidate.id);
  const idToIndex = (id) => ids.indexOf(id);

  // Which picks are settled (in a slot), which one is gliding, and the current round.
  const workedPicks = trace.picks.ids;
  const practicePicks = trace.practice.picks.ids;
  let settled = [];
  let gliding = null;          // { id, progress, slot }
  let round = null;            // the round whose penalties and scores are shown
  let scoreProgress = 1;       // how far the penalty bars have grown
  let blocked = [];
  if (beat.kind === 'intro') {
    settled = [];
  } else if (beat.kind === 'pick') {
    round = trace.rounds[0];
    scoreProgress = easeInOut(ramp(local, 0.2, 0.8));
    const glide = easeInOut(ramp(local, 1.3, 0.7));
    if (local >= 1.3) gliding = { id: round.picked, progress: glide, slot: 0 };
  } else if (beat.kind === 'score') {
    settled = workedPicks.slice(0, beat.round);
    round = trace.rounds[beat.round];
    scoreProgress = easeInOut(ramp(local, 0.2, 1.0));
  } else if (beat.kind === 'choose') {
    settled = workedPicks.slice(0, beat.round);
    round = trace.rounds[beat.round];
    const glide = easeInOut(ramp(local, 0.3, 0.7));
    gliding = { id: round.picked, progress: glide, slot: beat.round };
  } else if (beat.kind === 'outro' || beat.kind === 'practice-intro') {
    settled = workedPicks.slice();
    round = trace.rounds[2];
  } else if (beat.kind === 'practice-block') {
    settled = practicePicks.slice(0, 2);
    round = trace.practice.rounds[2];
    blocked = round.blocked;
    scoreProgress = easeInOut(ramp(local, 0.2, 0.8));
  } else if (beat.kind === 'practice-pick') {
    settled = practicePicks.slice(0, 2);
    round = trace.practice.rounds[2];
    blocked = round.blocked;
    const glide = easeInOut(ramp(local, 0.3, 0.7));
    gliding = { id: round.picked, progress: glide, slot: 2 };
  }
  if (gliding && gliding.progress >= 1) { settled = settled.concat(gliding.id); gliding = null; }

  const slots = [null, null, null];
  settled.forEach((id, slot) => { slots[slot] = id; });
  const shippedAlpha = beat.kind === 'intro' ? ramp(local, INTRO_LATE_AT, 0.5) : (beat.kind === 'outro' ? ramp(local, 0.3, 0.6) : 0);
  const comparisonAlpha = beat.kind === 'outro' ? ramp(local, 0.3, 0.6) : (inPractice ? 0.35 : 0);

  const pickScoreOf = (id) => {
    for (const r of trace.rounds.concat(trace.practice.rounds)) {
      if (r.picked === id) return r.rows.find((row) => row.id === id).score;
    }
    return null;
  };
  const chips = data.candidates.map((candidate, index) => {
    const id = candidate.id;
    const home = homeOf(index);
    let state = 'home';
    let pos = { ...home };
    const alpha = beat.kind === 'intro' ? ramp(local, 0.15 + index * 0.25, 0.4) : 1;
    const slot = settled.indexOf(id);
    if (slot >= 0) {
      state = 'selected';
      pos = slotOf(slot);
    } else if (gliding && gliding.id === id) {
      state = 'gliding';
      const target = slotOf(gliding.slot);
      pos = { x: lerp(home.x, target.x, gliding.progress), y: lerp(home.y, target.y, gliding.progress), w: lerp(home.w, target.w, gliding.progress) };
    } else if (blocked.includes(id)) {
      state = 'blocked';
    }
    const row = round ? round.rows.find((r) => r.id === id) : null;
    const penalty = row ? { value: row.penalty, shown: row.penalty * scoreProgress, alpha: scoreProgress } : { value: 0, shown: 0, alpha: 0 };
    const score = row ? { value: row.score, alpha: scoreProgress } : { value: lerp(0, 0, 0), alpha: 0 };
    const shipped = trace.relevance_only.ids.includes(id);
    const isBest = round && round.picked === id && (beat.kind === 'choose' || beat.kind === 'practice-pick' || (beat.kind === 'pick' && local >= 1.0));
    return { id, index, title: candidate.title, source: candidate.source, relevance: candidate.relevance, state, pos, alpha, penalty, score, pickedScore: pickScoreOf(id), shipped, isBest, slot: slot >= 0 ? slot : (gliding && gliding.id === id ? gliding.slot : null) };
  });

  let readout;
  if (!round) {
    readout = { title: 'nothing selected yet', lines: [`score = ${trace.lambda} x rel - ${(1 - trace.lambda).toFixed(1)} x penalty`, 'penalty: highest similarity', 'to any selected chunk'] };
  } else if (beat.kind === 'outro' || beat.kind === 'practice-intro') {
    readout = { title: 'compare', lines: [`mmr: ${trace.picks.ids.join(', ')}`, `  max similarity ${f2(trace.picks.pairwise_max)}, ${trace.picks.sources.length} sources`, `relevance alone: ${trace.relevance_only.ids.join(', ')}`, `  max similarity ${f2(trace.relevance_only.pairwise_max)}, ${trace.relevance_only.sources.length} source`] };
  } else {
    const number = inPractice ? 3 : (beat.kind === 'pick' ? 1 : beat.round + 1);
    const best = round.rows.find((r) => r.id === round.picked);
    const lines = [`score = ${trace.lambda} x rel - ${(1 - trace.lambda).toFixed(1)} x penalty`, `selected: ${round.selected.length ? round.selected.join(', ') : 'none'}`];
    if (blocked.length) lines.push(`blocked by the cap: ${blocked.join(', ')}`);
    if (scoreProgress >= 1 || beat.kind === 'choose' || beat.kind === 'practice-pick') lines.push(`best: ${best.id} at ${f3(best.score)}`);
    readout = { title: `pick ${number} of ${trace.k}${inPractice ? ', one per source' : ''}`, lines };
  }

  const caption = beat.kind === 'intro' && local >= INTRO_LATE_AT ? beat.captionLate : beat.caption;
  return { t, beatIndex, beat: beat.kind, caption, chips, slots, readout, shippedAlpha, comparisonAlpha, inPractice, lambda: trace.lambda, k: trace.k, finished: t >= timeline.duration };
}

// ------------------------------------------------------------------ drawing

const INK = '#e9edf6', DIM = '#9aa5bd', PANEL = '#1e2740', LINE = '#232c40', BG = '#0d1119';
const BLUE = '#5da2ff', GREEN = '#62d98a', AMBER = '#f0b94b', RED = '#e06767';
const MONO = 'ui-monospace, Menlo, Consolas, monospace';
const BAR = 180;

function rounded(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, Math.max(0, w), h, r);
  else ctx.rect(x, y, Math.max(0, w), h);
}

function truncate(text, limit) {
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

export function drawScene(ctx, scene) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.font = `13px ${MONO}`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.fillText(`maximal marginal relevance: pick ${scene.k} of ${scene.chips.length} chunks, lambda ${scene.lambda}`, 28, 36);
  ctx.font = `11px ${MONO}`;
  ctx.fillStyle = DIM;
  ctx.fillText('candidates: relevance in blue, penalty in amber, score at the right', CX, 66);
  ctx.fillText('selected', SX, 66);

  // Empty slot outlines.
  for (let slot = 0; slot < scene.k; slot += 1) {
    const s = slotOf(slot);
    ctx.strokeStyle = LINE;
    ctx.setLineDash([4, 4]);
    rounded(ctx, s.x, s.y, s.w, CH, 6); ctx.stroke();
    ctx.setLineDash([]);
    if (scene.slots[slot] === null) {
      ctx.fillStyle = DIM;
      ctx.fillText(`slot ${slot + 1}`, s.x + 12, s.y + 29);
    }
  }

  // Home row outlines for chips that have left (picked) and the shipped trio.
  for (const chip of scene.chips) {
    const home = homeOf(chip.index);
    if (chip.state === 'selected' || chip.state === 'gliding') {
      ctx.strokeStyle = LINE;
      ctx.setLineDash([3, 4]);
      rounded(ctx, home.x, home.y, home.w, CH, 6); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = DIM;
      ctx.fillText(`${chip.id}  picked`, home.x + 12, home.y + 29);
    }
  }

  // The chips themselves: settled and gliding ones are drawn last so they sit on top.
  const order = scene.chips.filter((chip) => chip.state === 'home' || chip.state === 'blocked')
    .concat(scene.chips.filter((chip) => chip.state === 'selected'), scene.chips.filter((chip) => chip.state === 'gliding'));
  for (const chip of order) {
    if (chip.alpha <= 0) continue;
    ctx.save();
    ctx.globalAlpha = chip.alpha * (chip.state === 'blocked' ? 0.55 : 1);
    const { x, y, w } = chip.pos;
    const compact = w < 400;
    ctx.fillStyle = PANEL;
    rounded(ctx, x, y, w, CH, 6); ctx.fill();
    ctx.strokeStyle = chip.isBest ? GREEN : (chip.state === 'blocked' ? RED : (chip.shipped && scene.shippedAlpha > 0 ? AMBER : LINE));
    ctx.lineWidth = chip.isBest ? 2 : 1;
    if (chip.shipped && scene.shippedAlpha > 0 && !chip.isBest && chip.state !== 'blocked') ctx.globalAlpha = chip.alpha * (0.4 + 0.6 * scene.shippedAlpha);
    rounded(ctx, x, y, w, CH, 6); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.globalAlpha = chip.alpha * (chip.state === 'blocked' ? 0.55 : 1);
    ctx.fillStyle = chip.state === 'selected' || chip.state === 'gliding' ? GREEN : INK;
    ctx.font = `bold 12px ${MONO}`;
    ctx.fillText(chip.id, x + 10, y + 19);
    ctx.font = `11px ${MONO}`;
    ctx.fillStyle = INK;
    ctx.fillText(truncate(chip.title, compact ? 26 : 34), x + 40, y + 19);
    if (!compact) {
      // source badge, bars, values
      ctx.fillStyle = DIM;
      ctx.fillText(chip.source, x + 300, y + 19);
      ctx.fillStyle = LINE;
      ctx.fillRect(x + 40, y + 27, BAR, 6);
      ctx.fillRect(x + 40, y + 36, BAR, 6);
      ctx.fillStyle = BLUE;
      ctx.fillRect(x + 40, y + 27, BAR * chip.relevance, 6);
      ctx.fillStyle = DIM;
      ctx.font = `10px ${MONO}`;
      ctx.fillText(`relevance ${f2(chip.relevance)}`, x + 228, y + 33);
      if (chip.penalty.alpha > 0) {
        ctx.save();
        ctx.globalAlpha = chip.alpha * chip.penalty.alpha * (chip.state === 'blocked' ? 0.55 : 1);
        ctx.fillStyle = AMBER;
        ctx.fillRect(x + 40, y + 36, BAR * chip.penalty.shown, 6);
        ctx.fillStyle = DIM;
        ctx.fillText(`penalty ${f2(chip.penalty.value)}`, x + 228, y + 42);
        ctx.restore();
      }
      if (chip.score.alpha > 0) {
        ctx.save();
        ctx.globalAlpha = chip.alpha * chip.score.alpha * (chip.state === 'blocked' ? 0.55 : 1);
        ctx.fillStyle = chip.isBest ? GREEN : INK;
        ctx.font = `12px ${MONO}`;
        ctx.textAlign = 'right';
        ctx.fillText(f3(chip.score.value), x + w - 14, y + 29);
        ctx.textAlign = 'left';
        ctx.restore();
      }
      if (chip.state === 'blocked') {
        ctx.fillStyle = RED;
        ctx.font = `10px ${MONO}`;
        ctx.textAlign = 'right';
        ctx.fillText('blocked: source at cap', x + w - 14, y + 42);
        ctx.textAlign = 'left';
      }
    } else {
      ctx.fillStyle = DIM;
      ctx.font = `10px ${MONO}`;
      ctx.fillText(`${chip.source}  score ${f3(chip.pickedScore === null ? chip.score.value : chip.pickedScore)}`, x + 40, y + 36);
    }
    ctx.restore();
  }

  // Readout panel.
  ctx.fillStyle = PANEL;
  rounded(ctx, RX, RY, RW, RH, 6); ctx.fill();
  ctx.strokeStyle = LINE;
  rounded(ctx, RX, RY, RW, RH, 6); ctx.stroke();
  ctx.font = `11px ${MONO}`;
  ctx.fillStyle = DIM;
  ctx.fillText(scene.readout.title, RX + 12, RY + 22);
  ctx.fillStyle = INK;
  ctx.font = `11px ${MONO}`;
  scene.readout.lines.forEach((line, index) => {
    ctx.fillStyle = line.startsWith('best') ? GREEN : (line.startsWith('blocked') ? RED : INK);
    ctx.fillText(truncate(line, 38), RX + 12, RY + 46 + index * 22);
  });
  ctx.globalAlpha = 1;
}
