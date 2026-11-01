// The lesson's animation, without a DOM: the same normalization, tally, and
// decision as solution.py (and the tiers of practice_answer.py), run on the
// same samples (python/fixtures/samples.json), recorded as a trace, laid out
// on a reading-pace timeline, and turned into a drawable scene for any moment.
// Tests compare the trace with python/fixtures/expected-trace.json, which the
// Python suite derives from the real functions, so the picture cannot drift.

export const W = 900;
export const H = 486;
export const STEP_MS = 50;             // one animation tick; the motion preference stretches it

const f2 = (x) => x.toFixed(2);

// normalize from solution.py.
export const normalize = (answer) => answer.trim().toLowerCase();

// Counter(...).most_common(): largest count first, ties in first-seen order.
export function tally(votes) {
  const counts = new Map();
  for (const vote of votes) {
    const key = normalize(vote);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);   // a stable sort keeps first-seen order among equals
}

// decide from solution.py.
export function decide(prompt, threshold) {
  if (!prompt.votes.length) throw new Error(`${prompt.id} has no samples`);
  const ranked = tally(prompt.votes);
  const [top, topCount] = ranked[0];
  const agreement = topCount / prompt.votes.length;
  if (ranked.length > 1 && ranked[1][1] === topCount) return { id: prompt.id, counts: ranked, action: 'dropped', reason: `tie at ${topCount}` };
  if (agreement < threshold) return { id: prompt.id, counts: ranked, action: 'dropped', reason: `agreement ${f2(agreement)} below ${f2(threshold)}` };
  return { id: prompt.id, counts: ranked, action: 'kept', label: top, agreement };
}

// tier_of from practice_answer.py.
export function tierOf(agreement, threshold) {
  if (agreement === 1.0) return 'gold';
  if (agreement >= threshold) return 'silver';
  return 'dropped';
}

export function filterSamples(samples, threshold) {
  if (threshold <= 0.5 || threshold > 1.0) throw new Error(`threshold must be above 0.5 (a majority) and at most 1.0, got ${threshold}`);
  return samples.map((prompt) => decide(prompt, threshold));
}

export function buildTrace(data) {
  const decisions = filterSamples(data.samples, data.threshold);
  const shipped = data.samples.map((prompt, index) => {
    const first = normalize(prompt.votes[0]);
    const decision = decisions[index];
    const status = decision.action === 'kept' && first === decision.label ? 'same' : (decision.action === 'kept' ? 'minority' : 'unsettled');
    return { id: prompt.id, first, status };
  });
  const tiers = decisions.map((decision) => ({ id: decision.id, tier: decision.action === 'kept' ? tierOf(decision.agreement, data.threshold) : 'dropped' }));
  return {
    threshold: data.threshold,
    prompts: data.samples.map((prompt, index) => ({
      id: prompt.id, votes: prompt.votes, normalized: prompt.votes.map(normalize),
      counts: decisions[index].counts.map(([answer, count]) => [answer, count]),
      action: decisions[index].action, label: decisions[index].label ?? null, agreement: decisions[index].agreement ?? null, reason: decisions[index].reason ?? null,
    })),
    kept: decisions.filter((d) => d.action === 'kept').length,
    shipped: { labels: shipped, wrong: shipped.filter((row) => row.status !== 'same').length },
    practice: { tiers, counts: { gold: tiers.filter((t) => t.tier === 'gold').length, silver: tiers.filter((t) => t.tier === 'silver').length, dropped: tiers.filter((t) => t.tier === 'dropped').length } },
  };
}

// ---------------------------------------------------------------- timeline

const INTRO = 2.5;
const INTRO_LATE_AT = 1.3;
const PROMPT_BEAT = 2.6;
const NORMALIZE_AT = 0.1, NORMALIZE = 0.4;
const FEED_AT = 0.6, FEED_EACH = 0.24;
const DECIDE_AT = 1.95, DECIDE = 0.4;
const SUMMARY = 2.5;
const SHIPPED = 3.0;
const OUTRO = 2.0;
const PRACTICE_INTRO = 1.0;
const PRACTICE = 3.5;

export function buildTimeline(trace) {
  const beats = [];
  let t = 0;
  const n = trace.prompts.length;
  const samplesEach = trace.prompts[0].votes.length;
  const needed = Math.ceil(trace.threshold * samplesEach);
  const wrong = trace.shipped.labels.filter((row) => row.status !== 'same');
  beats.push({ kind: 'intro', start: t, duration: INTRO,
    caption: `${n} prompts, ${samplesEach} teacher samples each, taken at a temperature above zero. The threshold: ${needed} of ${samplesEach} (${f2(trace.threshold)}) must agree on the normalized answer.`,
    captionLate: `What shipped: the first sample became the label. ${wrong.map((row) => (row.status === 'unsettled' ? `${row.id}'s samples never settled` : `${row.id}'s first sample, ${row.first}, was a minority answer`)).join(', and ')}: ${trace.shipped.wrong} of ${n} labels wrong or unsettled.` });
  t += INTRO;
  trace.prompts.forEach((prompt, index) => {
    const counts = prompt.counts.map(([answer, count]) => `${answer} ${count}`).join(', ');
    const respelled = prompt.votes.filter((vote, i) => vote !== prompt.normalized[i]);
    const note = respelled.length ? `${respelled.map((vote) => `"${vote}"`).join(' and ')} normalize to ${prompt.normalized[prompt.votes.indexOf(respelled[0])]}, so ` : '';
    let verdict;
    if (prompt.action === 'kept') verdict = `agreement ${f2(prompt.agreement)}${prompt.agreement === 1 ? ', unanimous' : (prompt.agreement === trace.threshold ? ', at the threshold' : '')}. Kept as ${prompt.label}.`;
    else verdict = prompt.reason.startsWith('tie') ? `a ${prompt.reason}, the teacher could not settle it. Dropped.` : `${prompt.reason}. Dropped.`;
    const tail = respelled.length ? ' Without normalization every spelling would count once and the prompt would be dropped.' : '';
    beats.push({ kind: 'prompt', start: t, duration: PROMPT_BEAT, index, caption: `${prompt.id}: ${note}${counts}: ${verdict}${tail}` });
    t += PROMPT_BEAT;
  });
  const dropped = trace.prompts.filter((p) => p.action === 'dropped').map((p) => p.id);
  beats.push({ kind: 'summary', start: t, duration: SUMMARY,
    caption: `Kept ${trace.kept} of ${n} with the majority answer as the label; ${dropped.join(', ')} waits for a human or for more samples.` });
  t += SUMMARY;
  beats.push({ kind: 'shipped', start: t, duration: SHIPPED,
    caption: `What shipped, on the same samples: the first sample as the label. ${wrong.map((row) => (row.status === 'unsettled' ? `${row.id} got ${row.first} for a prompt the teacher could not settle` : `${row.id} got ${row.first}, a minority answer against a majority`)).join('; ')}: ${trace.shipped.wrong} of ${n} labels wrong or unsettled.` });
  t += SHIPPED;
  beats.push({ kind: 'outro', start: t, duration: OUTRO,
    caption: `Count the normalized answers, read the most common, compare its share with the threshold: one Counter and two comparisons turn noisy samples into labels the student can trust.` });
  t += OUTRO;
  beats.push({ kind: 'practice-intro', start: t, duration: PRACTICE_INTRO,
    caption: `Practice variation: grade kept prompts gold when the teacher was unanimous and silver when a majority agreed, so the training loop can weight them.` });
  t += PRACTICE_INTRO;
  const tierIds = (tier) => trace.practice.tiers.filter((row) => row.tier === tier).map((row) => row.id);
  beats.push({ kind: 'practice', start: t, duration: PRACTICE,
    caption: `gold ${trace.practice.counts.gold} (${tierIds('gold').join(', ')} at 1.00), silver ${trace.practice.counts.silver} (${tierIds('silver').join(', ')}), dropped ${trace.practice.counts.dropped} (${tierIds('dropped').join(', ')}): the same prompts are kept, now with a grade.` });
  t += PRACTICE;
  return { beats, duration: t, markers: beats.map((beat) => beat.start) };
}

// ----------------------------------------------------------------- scene

const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ramp = (t, from, duration) => clamp01((t - from) / duration);
const STAGES = ['intro', 'prompt', 'summary', 'shipped', 'outro', 'practice-intro', 'practice'];

export function sceneAt(timeline, trace, elapsed) {
  const t = Math.max(0, Math.min(elapsed, timeline.duration));
  let beatIndex = timeline.beats.findIndex((beat) => t < beat.start + beat.duration);
  if (beatIndex < 0) beatIndex = timeline.beats.length - 1;
  const beat = timeline.beats[beatIndex];
  const local = t - beat.start;
  const stage = STAGES.indexOf(beat.kind);
  const shippedAlpha = beat.kind === 'shipped' ? easeInOut(ramp(local, 0.2, 0.6)) : (beat.kind === 'intro' && local >= INTRO_LATE_AT ? easeInOut(ramp(local, INTRO_LATE_AT, 0.6)) : 0);
  const practiceAlpha = beat.kind === 'practice' ? easeInOut(ramp(local, 0.2, 0.8)) : (stage > 6 ? 1 : 0);
  const rows = trace.prompts.map((prompt, index) => {
    let normalized = 0;      // 0..1: how far the chips have snapped to their normalized text
    let fed = 0;             // how many chips have been counted
    let decided = 0;         // 0..1: the decision tag
    if (beat.kind === 'prompt') {
      if (index < beat.index) { normalized = 1; fed = prompt.votes.length; decided = 1; } else if (index === beat.index) {
        normalized = easeInOut(ramp(local, NORMALIZE_AT, NORMALIZE));
        fed = Math.min(prompt.votes.length, Math.floor(Math.max(0, local - FEED_AT) / FEED_EACH));
        decided = easeInOut(ramp(local, DECIDE_AT, DECIDE));
      }
    } else if (stage > 1) { normalized = 1; fed = prompt.votes.length; decided = 1; }
    const counts = prompt.counts.map(([answer]) => ({ answer, count: prompt.normalized.slice(0, fed).filter((v) => v === answer).length, total: prompt.counts.find(([a]) => a === answer)[1] }));
    const tier = trace.practice.tiers[index].tier;
    return { ...prompt, alpha: beat.kind === 'intro' ? easeInOut(ramp(local, 0.1 + index * 0.15, 0.5)) : 1, normalized, fed, decided, counts, tier,
      current: beat.kind === 'prompt' && beat.index === index, shipped: trace.shipped.labels[index] };
  });
  const keptSoFar = rows.filter((row) => row.decided >= 1 && row.action === 'kept').length;
  const decidedSoFar = rows.filter((row) => row.decided >= 1).length;
  const caption = beat.kind === 'intro' && local >= INTRO_LATE_AT ? beat.captionLate : beat.caption;
  return { t, beatIndex, beat: beat.kind, caption, rows, keptSoFar, decidedSoFar, shippedAlpha, practiceAlpha, finished: t >= timeline.duration };
}

// ------------------------------------------------------------------ drawing

const INK = '#e9edf6', DIM = '#9aa5bd', PANEL = '#1e2740', LINE = '#232c40', BG = '#0d1119';
const BLUE = '#5da2ff', GREEN = '#62d98a', AMBER = '#f0b94b', RED = '#e06767';
const MONO = 'ui-monospace, Menlo, Consolas, monospace';
const ROW0 = 96, ROW_H = 70, CHIP_X = 72, CHIP_W = 72, CHIP_GAP = 6, TALLY_X = 480, TALLY_W = 130, TAG_X = 672;
const ANSWER_COLOURS = { billing: '#5da2ff', access: '#9fc4ff', outage: '#2f5f9e' };

function rounded(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, Math.max(0, w), h, r);
  else ctx.rect(x, y, Math.max(0, w), h);
}

export function drawScene(ctx, scene, trace) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.font = `13px ${MONO}`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.fillText(`majority vote over teacher samples: keep the most common answer when at least ${f2(trace.threshold)} of the samples agree`, 28, 36);
  ctx.font = `10px ${MONO}`;
  ctx.fillStyle = DIM;
  ctx.fillText('samples (normalized as they are counted)', CHIP_X, 62);
  ctx.fillText('tally', TALLY_X, 62);
  ctx.fillText(scene.practiceAlpha > 0.5 ? 'tier' : 'decision', TAG_X, 62);

  for (const row of scene.rows) {
    if (row.alpha <= 0) continue;
    const y = ROW0 + scene.rows.indexOf(row) * ROW_H;
    ctx.globalAlpha = row.alpha;
    if (row.current) { ctx.fillStyle = PANEL; rounded(ctx, 24, y - 20, 852, ROW_H - 8, 6); ctx.fill(); }
    ctx.font = `11px ${MONO}`;
    ctx.fillStyle = row.current ? INK : DIM;
    ctx.fillText(row.id, 32, y + 4);
    // The five chips.
    row.votes.forEach((vote, i) => {
      const x = CHIP_X + i * (CHIP_W + CHIP_GAP);
      const text = row.normalized >= 0.5 ? row.normalized[i] ?? row.normalized : vote;
      const shown = row.normalized >= 0.5 ? trace.prompts[scene.rows.indexOf(row)].normalized[i] : vote;
      const counted = i < row.fed;
      const changed = vote !== trace.prompts[scene.rows.indexOf(row)].normalized[i];
      ctx.fillStyle = counted ? ANSWER_COLOURS[shown] || BLUE : PANEL;
      rounded(ctx, x, y - 10, CHIP_W, 20, 4); ctx.fill();
      if (changed && row.normalized > 0 && row.normalized < 1) { ctx.strokeStyle = AMBER; rounded(ctx, x, y - 10, CHIP_W, 20, 4); ctx.stroke(); }
      if (changed && row.normalized >= 1 && !counted) { ctx.strokeStyle = AMBER; rounded(ctx, x, y - 10, CHIP_W, 20, 4); ctx.stroke(); }
      ctx.fillStyle = counted ? BG : INK;
      ctx.font = `10px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.fillText(shown.length > 9 ? shown.slice(0, 9) : shown, x + CHIP_W / 2, y + 4);
      ctx.textAlign = 'left';
      // What shipped: the first chip is the label; outline it where that went wrong.
      if (i === 0 && scene.shippedAlpha > 0 && row.shipped.status !== 'same') {
        ctx.globalAlpha = row.alpha * scene.shippedAlpha;
        ctx.strokeStyle = RED;
        ctx.lineWidth = 2;
        rounded(ctx, x - 2, y - 12, CHIP_W + 4, 24, 5); ctx.stroke();
        ctx.lineWidth = 1;
        ctx.globalAlpha = row.alpha;
      }
    });
    // The tally bars, in most-common order.
    const unit = TALLY_W / row.votes.length;
    row.counts.forEach((entry, k) => {
      const by = y - 12 + k * 14;
      ctx.fillStyle = LINE;
      ctx.fillRect(TALLY_X + 56, by, TALLY_W, 9);
      ctx.fillStyle = ANSWER_COLOURS[entry.answer] || BLUE;
      ctx.fillRect(TALLY_X + 56, by, entry.count * unit, 9);
      ctx.fillStyle = DIM;
      ctx.font = `9.5px ${MONO}`;
      ctx.fillText(entry.answer, TALLY_X, by + 8);
      ctx.fillStyle = INK;
      ctx.fillText(String(entry.count), TALLY_X + 56 + TALLY_W + 6, by + 8);
    });
    // The decision tag, or the tier in the practice.
    if (row.decided > 0) {
      ctx.globalAlpha = row.alpha * row.decided;
      ctx.font = `11px ${MONO}`;
      if (scene.practiceAlpha > 0.5 && row.action === 'kept') {
        ctx.fillStyle = row.tier === 'gold' ? AMBER : DIM;
        ctx.fillText(`${row.tier}: ${row.label} (${f2(row.agreement)})`, TAG_X, y + 4);
      } else if (row.action === 'kept') {
        ctx.fillStyle = GREEN;
        ctx.fillText(`kept: ${row.label} (${f2(row.agreement)})`, TAG_X, y + 4);
      } else {
        ctx.fillStyle = RED;
        ctx.fillText(`dropped: ${row.reason}`, TAG_X, y + 4);
      }
      if (scene.shippedAlpha > 0) {
        ctx.globalAlpha = row.alpha * scene.shippedAlpha;
        ctx.fillStyle = row.shipped.status === 'same' ? DIM : RED;
        ctx.font = `9.5px ${MONO}`;
        const note = row.shipped.status === 'same' ? `shipped ${row.shipped.first}: same` : (row.shipped.status === 'minority' ? `shipped ${row.shipped.first}: minority` : `shipped ${row.shipped.first}: unsettled`);
        ctx.fillText(note, TAG_X, y + 20);
      }
    }
    ctx.globalAlpha = 1;
  }
  // Footer.
  const fy = ROW0 + scene.rows.length * ROW_H - 10;
  ctx.font = `11px ${MONO}`;
  ctx.fillStyle = INK;
  ctx.fillText(`kept ${scene.keptSoFar} of ${scene.decidedSoFar} decided`, 32, fy);
  if (scene.shippedAlpha > 0) {
    ctx.globalAlpha = scene.shippedAlpha;
    ctx.fillStyle = RED;
    ctx.fillText(`what shipped: ${trace.shipped.wrong} of ${trace.prompts.length} first-sample labels wrong or unsettled`, 300, fy);
    ctx.globalAlpha = 1;
  }
  if (scene.practiceAlpha > 0.5) {
    ctx.fillStyle = AMBER;
    ctx.fillText(`gold ${trace.practice.counts.gold}, silver ${trace.practice.counts.silver}, dropped ${trace.practice.counts.dropped}`, 300, fy);
  }
  ctx.globalAlpha = 1;
}
