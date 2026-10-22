// Figure captures, page sweeps, and a canvas text audit through the Chrome
// DevTools Protocol (see cdp.mjs). Every mode takes a running server's base
// URL (vite preview, or the live site) and site paths; a path argument of the
// form @file reads one path per line from that file.
//
//   node scripts/qa/cdp-shot.mjs shot <base> <outDir> <width> <slug>[@t[,t...]] ...
//     Captures each page's figure (.viz-frame, or the viewport when there is
//     none) at the given seconds, paused via ?viz-t=, as
//     <outDir>/<slug>-<t>-w<width>.png. A width below 700 emulates a phone.
//     t may also be "full" (the whole page), "step:N" (the figure paused at
//     second 0 with Next step pressed N-1 times), or "sel:<css>[:n[:waitms]]"
//     (the nth element matching a selector, after an optional extra wait).
//     A slug with a leading slash names any site path.
//   node scripts/qa/cdp-shot.mjs sweep <base> <outFile.jsonl> <path> ...
//     Loads each path, waits for the app, and records one JSON line: h1
//     present, preserved player rendered ("voices"), browser player present,
//     empty root, horizontal overflow, unresolved in-page anchors, elements
//     past the right edge, and every console error or uncaught exception.
//     SWEEP_WIDTH=390 emulates a phone; REDUCED_MOTION=1 emulates the media
//     query for the whole load.
//   node scripts/qa/cdp-shot.mjs clip <base> <outFile> <slug|/path> ...
//     Canvas text audit: every fillText on the figure's canvas is recorded
//     with its box; a stepped figure is advanced with its own Next step
//     button, a continuous one sampled at five moments; each frame is checked
//     for text past the canvas edge and two visible texts drawn over each
//     other.
//   node scripts/qa/cdp-shot.mjs eval <base> <path> <expression>
//     Loads the page and prints the expression's JSON value (a promise is
//     awaited) with any errors.
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { withChrome } from './cdp.mjs';

const NEXT_STEP = `(() => { const b = [...document.querySelectorAll('.viz-controls button')].find((x) => x.textContent.trim() === 'Next step'); if (b) b.click(); return Boolean(b); })()`;
const pagePath = (slug) => (slug.startsWith('/') ? slug : `/scenarios/${slug}/`);
const safe = (value) => value.replace(/[^a-z0-9.-]/gi, '_');

// "@file" arguments expand to the non-empty lines of that file.
export function expandPaths(args) {
  return args.flatMap((arg) => (arg.startsWith('@') ? readFileSync(arg.slice(1), 'utf8').split(/\r?\n/).map((l) => l.trim()).filter(Boolean) : [arg]));
}

export async function shot(api, base, outDir, width, specs) {
  mkdirSync(outDir, { recursive: true });
  const mobile = width < 700;
  for (const spec of specs) {
    const [slug, times = '16'] = spec.split('@');
    for (const t of times.split(',')) {
      const page = await api.newPage();
      try {
        const stepTo = t.startsWith('step:') ? Number(t.slice(5)) : 0;
        const url = t === 'full' ? `${base}${pagePath(slug)}` : `${base}${pagePath(slug)}?viz-t=${stepTo ? 0 : t}`;
        const errors = await page.load(url, { width, height: 900, mobile, reducedMotion: Boolean(process.env.REDUCED_MOTION) });
        for (let i = 1; i < stepTo; i += 1) { await page.evaluate(NEXT_STEP); await sleep(350); }
        let file;
        if (t === 'full') {
          const height = Math.min(await page.evaluate('document.documentElement.scrollHeight'), 16000);
          await page.viewport(width, height, mobile);
          await sleep(400);
          file = path.join(outDir, `${safe(slug)}-full-w${width}.png`);
          writeFileSync(file, await page.screenshot({ captureBeyondViewport: true }));
        } else {
          const parts = t.startsWith('sel:') ? t.slice(4).split(':') : null;
          const selector = parts ? parts[0] : '.viz-frame';
          const nth = parts ? Number(parts[1] || 0) : 0;
          const extraWait = parts ? Number(parts[2] || 0) : 0;
          if (extraWait) await sleep(extraWait);
          const rect = await page.evaluate(`(() => { const el = document.querySelectorAll(${JSON.stringify(selector)})[${nth}]; if (!el) return null; el.scrollIntoView({ block: 'start' }); const r = el.getBoundingClientRect(); return { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height }; })()`);
          if (!rect) { console.log(`NOFIGURE ${slug} t=${t}`); continue; }
          await sleep(300);
          const clip = { x: Math.max(0, rect.x - 8), y: Math.max(0, rect.y - 8), width: Math.min(width, rect.w + 16), height: Math.min(4000, rect.h + 16), scale: 1 };
          file = path.join(outDir, `${safe(slug)}-${safe(t)}-w${width}.png`);
          writeFileSync(file, await page.screenshot({ clip, captureBeyondViewport: true }));
        }
        console.log(`SHOT ${file}${errors.length ? ` ERRORS ${errors.length}: ${errors[0]}` : ''}`);
      } finally {
        await page.close();
      }
    }
  }
}

const SWEEP_FACTS = `JSON.stringify({
  h1: Boolean(document.querySelector('h1')),
  voices: /voices/.test(document.body.innerText),
  browser: Boolean(document.querySelector('button.btn-listen:not(.narration-disclosure)')),
  rootEmpty: document.getElementById('root') ? document.getElementById('root').children.length === 0 : null,
  overflow: document.documentElement.scrollWidth - window.innerWidth,
  frag: [...document.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute('href').slice(1)).filter((id) => id && !document.getElementById(id)).slice(0, 5),
  wide: [...document.querySelectorAll('*')].filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1 && getComputedStyle(el).position !== 'fixed').slice(0, 3).map((el) => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '')),
})`;

export async function sweep(api, base, outFile, paths, { width = Number(process.env.SWEEP_WIDTH || 1200) } = {}) {
  mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
  writeFileSync(outFile, '');
  for (const pagePathValue of paths) {
    const page = await api.newPage();
    let record;
    try {
      const errors = await page.load(`${base}${pagePathValue}`, { width, height: 900, mobile: width < 700, reducedMotion: Boolean(process.env.REDUCED_MOTION) });
      record = { path: pagePathValue, width, ...JSON.parse(await page.evaluate(SWEEP_FACTS)), errors };
    } catch (error) {
      record = { path: pagePathValue, width, failed: error.message };
    } finally {
      await page.close();
    }
    appendFileSync(outFile, JSON.stringify(record) + '\n');
    const flags = record.failed ? `FAILED ${record.failed}` : `h1=${record.h1 ? 1 : 0} voices=${record.voices ? 1 : 0} browser=${record.browser ? 1 : 0} rootEmpty=${record.rootEmpty === null ? 'na' : record.rootEmpty ? 1 : 0} overflow=${record.overflow}${record.frag.length ? ' frag=' + record.frag.join(',') : ''}${record.wide.length ? ' wide=' + record.wide.join(',') : ''} errors=${record.errors.length}`;
    console.log(`${pagePathValue} ${flags}`);
  }
  console.log(`sweep done: ${paths.length} pages at ${width}px -> ${outFile}`);
}

// Canvas text audit. Every scene paint starts by filling or clearing the whole
// logical canvas from the origin (the models draw 900 by 486 units under a
// scale transform, so the device size is no guide); that call starts a frame.
const TEXT_PATCH = `(() => {
  const P = CanvasRenderingContext2D.prototype;
  window.__frames = [[]];
  const begin = () => { window.__frames.push([]); if (window.__frames.length > 4) window.__frames.shift(); };
  const origText = P.fillText, origFill = P.fillRect, origClear = P.clearRect;
  P.fillRect = function (x, y, w, h) { if (x === 0 && y === 0 && w >= 400 && h >= 200) begin(); return origFill.call(this, x, y, w, h); };
  P.clearRect = function (x, y, w, h) { if (x === 0 && y === 0 && w >= 400 && h >= 200) begin(); return origClear.call(this, x, y, w, h); };
  P.fillText = function (text, x, y, maxWidth) {
    try {
      const s = String(text); const w = this.measureText(s).width;
      const size = parseFloat((this.font.match(/(\\d+(?:\\.\\d+)?)px/) || [0, 12])[1]);
      let left = x; if (this.textAlign === 'center') left = x - w / 2; else if (this.textAlign === 'right' || this.textAlign === 'end') left = x - w;
      const dpr = window.devicePixelRatio || 1;
      window.__frames[window.__frames.length - 1].push({ t: s, l: left, r: left + w, top: y - size * 0.78, bot: y + size * 0.22, a: this.globalAlpha, cw: this.canvas.width / dpr, ch: this.canvas.height / dpr });
    } catch (e) {}
    return origText.call(this, text, x, y, maxWidth);
  };
})();`;

const ANALYZE = `(() => {
  const frames = window.__frames; const frame = [...frames].reverse().find((f) => f.length) || [];
  const seen = new Set(); const texts = [];
  for (const b of frame) { const k = b.t + '@' + Math.round(b.l) + ',' + Math.round(b.top); if (seen.has(k)) continue; seen.add(k); texts.push(b); }
  const clipped = texts.filter((b) => b.a >= 0.15 && (b.r > b.cw + 1 || b.l < -1 || b.bot > b.ch + 1 || b.top < -1)).map((b) => b.t + ' [' + Math.round(b.l) + '..' + Math.round(b.r) + ' x ' + Math.round(b.top) + '..' + Math.round(b.bot) + '] canvas ' + b.cw + 'x' + b.ch);
  const overlaps = [];
  for (let i = 0; i < texts.length; i += 1) for (let j = i + 1; j < texts.length; j += 1) {
    const a = texts[i], b = texts[j]; if (a.a < 0.3 || b.a < 0.3) continue;
    const w = Math.min(a.r, b.r) - Math.max(a.l, b.l), h = Math.min(a.bot, b.bot) - Math.max(a.top, b.top);
    if (w <= 0 || h <= 0) continue;
    const area = w * h, small = Math.min((a.r - a.l) * (a.bot - a.top), (b.r - b.l) * (b.bot - b.top));
    if (small > 0 && area / small >= 0.35) overlaps.push('"' + a.t + '" over "' + b.t + '" (' + Math.round(100 * area / small) + '% of the smaller)');
  }
  const stat = document.querySelector('.viz-stat');
  return JSON.stringify({ step: stat ? stat.textContent.trim() : '?', texts: texts.length, clipped: clipped.slice(0, 6), overlaps: overlaps.slice(0, 6) });
})()`;

const report = (facts) => `${facts.clipped.map((c) => '  CLIPPED ' + c).join('\n')}${facts.clipped.length ? '\n' : ''}${facts.overlaps.map((o) => '  OVERLAP ' + o).join('\n')}${facts.overlaps.length ? '\n' : ''}`;

export async function clipAudit(api, base, outFile, slugs) {
  mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
  writeFileSync(outFile, '');
  let flaggedFigures = 0;
  for (const slug of slugs) {
    const page = await api.newPage();
    try {
      await page.send('Page.enable');
      await page.send('Page.addScriptToEvaluateOnNewDocument', { source: TEXT_PATCH });
      await page.load(`${base}${pagePath(slug)}?viz-t=0`, { width: 1200, height: 900, mobile: false });
      let previous = '';
      let flagged = 0;
      const stepped = await page.evaluate(`Boolean([...document.querySelectorAll('.viz-controls button')].find((x) => x.textContent.trim() === 'Next step'))`);
      if (!stepped) {
        // A continuous figure (the legacy pages): sample the playing frame at several moments.
        await page.evaluate(`window.scrollTo(0, (document.querySelector('canvas') || document.body).getBoundingClientRect().top + window.scrollY - 100)`);
        for (const wait of [1500, 2500, 3000, 4000, 5000]) {
          await sleep(wait);
          const facts = JSON.parse(await page.evaluate(ANALYZE));
          previous = `sampled ${facts.texts} texts`;
          if (facts.clipped.length || facts.overlaps.length) { flagged += 1; appendFileSync(outFile, `${slug} after ${wait}ms more (${facts.texts} texts)\n${report(facts)}`); }
        }
        appendFileSync(outFile, `${slug}: ${previous}, ${flagged} flagged samples\n`);
      } else {
        for (let step = 0; step < 40; step += 1) {
          await sleep(500);
          const facts = JSON.parse(await page.evaluate(ANALYZE));
          if (facts.step === previous) break;
          previous = facts.step;
          if (facts.clipped.length || facts.overlaps.length) { flagged += 1; appendFileSync(outFile, `${slug} ${facts.step} (${facts.texts} texts)\n${report(facts)}`); }
          await page.evaluate(NEXT_STEP);
        }
        appendFileSync(outFile, `${slug}: ${previous}, ${flagged} flagged steps\n`);
      }
      if (flagged) flaggedFigures += 1;
      console.log(`${slug}: ${previous}, ${flagged} flagged`);
    } catch (error) {
      flaggedFigures += 1;
      appendFileSync(outFile, `${slug} FAILED ${error.message}\n`);
      console.log(`${slug} FAILED ${error.message}`);
    } finally {
      await page.close();
    }
  }
  console.log(`clip audit done: ${slugs.length} figures, ${flaggedFigures} flagged -> ${outFile}`);
  return flaggedFigures;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [mode, base, out, ...rest] = process.argv.slice(2);
  if (!['shot', 'sweep', 'clip', 'eval'].includes(mode) || !base || !out) {
    console.error('usage: cdp-shot.mjs shot|sweep|clip|eval <base> <outDir|outFile|path> ...');
    process.exit(2);
  }
  await withChrome(async (api) => {
    if (mode === 'shot') await shot(api, base, out, Number(rest[0]), expandPaths(rest.slice(1)));
    else if (mode === 'sweep') await sweep(api, base, out, expandPaths(rest));
    else if (mode === 'clip') process.exitCode = (await clipAudit(api, base, out, expandPaths(rest))) ? 1 : 0;
    else {
      const page = await api.newPage();
      try {
        const errors = await page.load(`${base}${out}`, { width: 1200, height: 900, mobile: false });
        const value = await page.evaluate(rest.join(' '), { awaitPromise: true });
        console.log(JSON.stringify({ path: out, errors, value }, null, 1));
      } finally {
        await page.close();
      }
    }
  });
}
