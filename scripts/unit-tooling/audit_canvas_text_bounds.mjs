// Optional native-canvas audit. The renderer is a verification dependency,
// never part of the website bundle. Supply its module path with --canvas-module.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { LIVE_PUZZLES } from '../../src/data/puzzles.js';
import { auditCanvasCallbacks } from './audit_canvas_callbacks.mjs';

const require = createRequire(import.meta.url);
const hash = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');

export function textBounds(metrics, x, y, transform, maxWidth = Infinity) {
  const sx = Math.min(1, maxWidth / metrics.width);
  const left = x - metrics.actualBoundingBoxLeft * sx;
  const right = x + metrics.actualBoundingBoxRight * sx;
  const top = y - metrics.actualBoundingBoxAscent;
  const bottom = y + metrics.actualBoundingBoxDescent;
  const points = [[left, top], [right, top], [left, bottom], [right, bottom]]
    .map(([px, py]) => ({ x: transform.a * px + transform.c * py + transform.e,
      y: transform.b * px + transform.d * py + transform.f }));
  return {
    left: Math.min(...points.map((p) => p.x)), right: Math.max(...points.map((p) => p.x)),
    top: Math.min(...points.map((p) => p.y)), bottom: Math.max(...points.map((p) => p.y)),
  };
}

export async function auditCanvasTextBounds({ canvasModule = '@napi-rs/canvas',
  font = null, from = 1, to = Infinity, cycles = 1,
  output = 'build/canvas-text-bounds.json' } = {}) {
  const { createCanvas, GlobalFonts } = require(canvasModule);
  if (font) {
    if (!GlobalFonts.registerFromPath(font, 'AuditMono')) throw new Error(`Cannot load font: ${font}`);
  }
  const palette = Object.fromEntries([...fs.readFileSync('src/theme.css', 'utf8')
    .matchAll(/(--[\w-]+):\s*(#[\da-fA-F]+);/g)].map((m) => [m[1], m[2]]));
  const rows = LIVE_PUZZLES.filter((p) => p.number >= from && p.number <= to).map((p) => {
    const viz = `src/viz/${fs.readFileSync(`src/content/${p.slug}.jsx`, 'utf8').match(/from ['"]\.\.\/viz\/([^'"]+)/)[1]}`;
    return { number: p.number, slug: p.slug, viz, sha256Before: hash(viz), frames: 0, textCalls: 0, warnings: [] };
  });
  const byPath = new Map(rows.map((row) => [row.viz, row]));
  const callbacks = await auditCanvasCallbacks({ cycles, quiet: true, paths: rows.map((row) => row.viz),
    output: output.replace(/\.json$/, '-callbacks.json'),
    onCycle: ({ vizPath, cycle, model }) => {
      const row = byPath.get(vizPath);
      const probe = model.init();
      const limit = model.maxTicks || 20_000;
      let total = 0;
      while (total < limit) { total += 1; if (model.tick(probe) === false) break; }
      const targets = [...new Set([0, 0.25, 0.5, 0.75, 1].map((fraction) => Math.floor(total * fraction)))];
      const state = model.init();
      let tick = 0;
      const oldStyle = globalThis.getComputedStyle;
      const oldCreate = globalThis.document.createElement;
      globalThis.getComputedStyle = () => ({ getPropertyValue: (key) => palette[key] || '' });
      globalThis.document.createElement = () => createCanvas(1, 1);
      try {
        for (const target of targets) {
          while (tick < target) { model.tick(state); tick += 1; }
          const canvas = createCanvas(model.width, model.height);
          const ctx = canvas.getContext('2d');
          const fillText = ctx.fillText.bind(ctx);
          ctx.fillText = (value, x, y, maxWidth) => {
            if (font) ctx.font = ctx.font.replaceAll('ui-monospace', 'AuditMono');
            const text = String(value);
            const bounds = textBounds(ctx.measureText(text), x, y, ctx.getTransform(), maxWidth);
            row.textCalls += 1;
            if (bounds.left < -1 || bounds.right > model.width + 1 || bounds.top < -1 || bounds.bottom > model.height + 1) {
              row.warnings.push({ cycle, tick, text, font: ctx.font, ...bounds, width: model.width, height: model.height });
            }
            if (maxWidth === undefined) fillText(text, x, y);
            else fillText(text, x, y, maxWidth);
          };
          model.draw(ctx, state, model.width, model.height);
          row.frames += 1;
        }
      } finally {
        globalThis.getComputedStyle = oldStyle;
        globalThis.document.createElement = oldCreate;
      }
    },
  });
  for (const row of rows) {
    row.sha256After = hash(row.viz);
    row.sourceStable = row.sha256Before === row.sha256After;
  }
  const report = { generatedAt: new Date().toISOString(), font, cycles,
    scope: 'Actual canvas text bounds at initial, quarter, middle, three-quarter, and final model states',
    limitations: 'Checks the canvas edge only. Internal overlaps, color contrast, and explanatory accuracy require visual review.',
    summary: { visualizations: rows.length, frames: rows.reduce((sum, r) => sum + r.frames, 0),
      warnings: rows.reduce((sum, r) => sum + r.warnings.length, 0), unstableSources: rows.filter((r) => !r.sourceStable).length,
      callbackFailures: callbacks.summary.failedVisualizations },
    callbackErrors: callbacks.visualizations.filter((row) => row.errors.length).map(({ path: viz, errors }) => ({ viz, errors })), rows };
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const options = {};
  const names = { '--canvas-module': 'canvasModule', '--font': 'font', '--from': 'from', '--to': 'to', '--cycles': 'cycles', '--output': 'output' };
  for (let i = 2; i < process.argv.length; i += 2) {
    const key = names[process.argv[i]];
    if (!key || !process.argv[i + 1]) throw new Error(`Invalid argument ${process.argv[i]}`);
    options[key] = ['from', 'to', 'cycles'].includes(key) ? Number(process.argv[i + 1]) : process.argv[i + 1];
  }
  const report = await auditCanvasTextBounds(options);
  console.log(JSON.stringify(report.summary, null, 2));
  if (report.summary.warnings || report.summary.unstableSources || report.summary.callbackFailures) process.exitCode = 1;
}
