// Capture the actual canvas callbacks without a browser and run their still
// mode to completion. React effects and canvas painting are not simulated.
// The real init/tick/draw functions, RNG, and motion helpers remain unchanged.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { LIVE_PUZZLES } from '../../src/data/puzzles.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let invocation = 0;

export async function auditCanvasCallbacks({
  cycles = 20, output: outputPath = 'build/canvas-callback-audit.json',
  paths = null, onCycle = null, quiet = false,
} = {}) {
const options = { cycles, output: outputPath };
if (!Number.isSafeInteger(options.cycles) || options.cycles < 1) throw new Error('Invalid cycles');
const output = path.resolve(root, options.output);
fs.mkdirSync(path.dirname(output), { recursive: true });
const cacheDir = path.join(root, 'node_modules', '.cache', 'canvas-callback-audit');
fs.mkdirSync(cacheDir, { recursive: true });
const vizPaths = paths || [...new Set(LIVE_PUZZLES.flatMap((puzzle) => {
  const source = fs.readFileSync(path.join(root, 'src/content', `${puzzle.slug}.jsx`), 'utf8');
  return [...source.matchAll(/from\s+['"]\.\.\/viz\/([^'"]+)['"]/g)].map((match) => `src/viz/${match[1]}`);
}))];
const transformedCycles = new Set();
const bundlePath = path.join(cacheDir, `callbacks-${process.pid}-${invocation++}.mjs`);
await build({
  stdin: {
    contents: [
      "export { setLevel, PACE_KEY } from './src/lib/motion.js';",
      ...vizPaths.map((name, index) => `import Viz${index} from './${name}';`),
      `export const components = [${vizPaths.map((_, index) => `Viz${index}`).join(',')}];`,
    ].join('\n'),
    resolveDir: root, loader: 'jsx',
  },
  outfile: bundlePath, bundle: true, format: 'esm', platform: 'node', jsx: 'automatic',
  external: ['react/jsx-runtime'], logLevel: 'silent',
  plugins: [{
    name: 'capture-canvas-callbacks',
    setup(builder) {
      builder.onResolve({ filter: /^react$/ }, () => ({ path: 'hooks', namespace: 'audit' }));
      builder.onLoad({ filter: /.*/, namespace: 'audit' }, () => ({
        contents: `
          export const useRef = (value) => ({ current: value });
          export const useState = (value) => [typeof value === 'function' ? value() : value, () => {}];
          export const useEffect = () => {};
          export const useMemo = (fn) => fn();
          export const useCallback = (fn) => fn;
          export const useId = () => 'canvas-audit';
        `,
        loader: 'js',
      }));
      builder.onLoad({ filter: /[\\/]useCanvasLoop\.js$/ }, (entry) => ({
        contents: fs.readFileSync(entry.path, 'utf8')
          .replace('export function useCanvasLoop(', 'function unusedCanvasLoop(')
          + '\nexport function useCanvasLoop(ref, model) { globalThis.__canvasAudit.models.push(model); return { current: null }; }\n',
        loader: 'js', resolveDir: path.dirname(entry.path),
      }));
      builder.onLoad({ filter: /[\\/]viz[\\/].*\.jsx$/ }, (entry) => {
        const source = fs.readFileSync(entry.path, 'utf8');
        const contents = source.replace(/(const\s+cycle(?:Ref)?\s*=\s*useRef\()0(\))/g, (match, prefix, suffix) => {
          transformedCycles.add(path.relative(root, entry.path).replaceAll('\\', '/'));
          return `${prefix}globalThis.__canvasAudit.cycle${suffix}`;
        });
        return { contents, loader: 'jsx', resolveDir: path.dirname(entry.path) };
      });
    },
  }],
});
const bundled = await import(pathToFileURL(bundlePath).href);
bundled.setLevel('still');

function mockContext(warnings) {
  const context = {};
  const methods = 'arc beginPath bezierCurveTo clearRect clip closePath drawImage ellipse fill fillRect fillText lineTo moveTo putImageData quadraticCurveTo rect restore rotate roundRect save setLineDash setTransform stroke strokeRect translate'.split(' ');
  for (const method of methods) {
    context[method] = (...values) => {
      if (values.some((value) => typeof value === 'number' && !Number.isFinite(value))) {
        warnings.add(`Nonfinite numeric argument to ${method}`);
      }
      if (method === 'fillText' && /\b(?:NaN|undefined)\b|\[object Object\]/.test(String(values[0]))) {
        warnings.add(`Suspicious drawn text: ${String(values[0]).slice(0, 180)}`);
      }
    };
  }
  context.measureText = (value) => ({ width: String(value).length * 6 });
  context.createImageData = (width, height) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) });
  return context;
}
const previousGlobals = new Map(['getComputedStyle', 'document', '__canvasAudit']
  .map((key) => [key, { own: Object.hasOwn(globalThis, key), value: globalThis[key] }]));
globalThis.getComputedStyle = () => ({ getPropertyValue: () => '' });
globalThis.document = {
  documentElement: { setAttribute() {} },
  createElement: (tag) => {
    if (tag !== 'canvas') throw new Error(`Unexpected DOM request: ${tag}`);
    return { getContext: () => mockContext(new Set()) };
  },
};

function nanPaths(value, prefix = 'state', seen = new WeakSet(), found = []) {
  if (typeof value === 'number') {
    if (Number.isNaN(value) && found.length < 5) found.push(prefix);
  } else if (value && typeof value === 'object' && !seen.has(value)) {
    seen.add(value);
    for (const [key, item] of Object.entries(value)) {
      nanPaths(item, `${prefix}.${key}`, seen, found);
      if (found.length >= 5) break;
    }
  }
  return found;
}

const report = {
  generatedAt: new Date().toISOString(),
  scope: 'Actual canvas callbacks with inert React hooks, real still-mode helpers, and a no-op drawing context',
  limitations: 'No pixels, browser effects, animation timing, user-selected modes, or independent mathematical oracles are checked. Cycles follow each component reset counter.',
  cyclesPerVisualization: options.cycles, visualizations: [], summary: {},
};
for (const [index, vizPath] of vizPaths.entries()) {
  const row = { path: vizPath, cycleCounterVaried: transformedCycles.has(vizPath), runs: [], errors: [], warnings: [] };
  for (let cycle = 0; cycle < options.cycles; cycle += 1) {
    globalThis.__canvasAudit = { cycle, models: [] };
    try {
      bundled.components[index]();
      const models = globalThis.__canvasAudit.models;
      if (models.length !== 1) throw new Error(`Expected one canvas model, captured ${models.length}`);
      const model = models[0];
      const state = model.init();
      state[bundled.PACE_KEY] = Math.max(16, Math.round((model.stepMs || 40) * 0));
      const maximum = model.maxTicks || 20_000;
      let complete = false;
      let ticks = 0;
      let invariantBreaks = 0;
      let invariantObserved = false;
      const inspect = () => {
        for (const scene of [state, state.scene]) {
          if (typeof scene?.ok === 'boolean') invariantObserved = true;
          if (scene?.ok === false) invariantBreaks += 1;
        }
      };
      inspect();
      for (; ticks <= maximum; ticks += 1) {
        complete = model.tick(state) === false;
        inspect();
        if (complete) { ticks += 1; break; }
      }
      if (!complete) throw new Error(`Still-mode callback did not finish within its ${maximum + 1} tick budget`);
      const nan = nanPaths(state);
      if (nan.length) row.warnings.push(`Cycle ${cycle}: NaN in ${nan.join(', ')}`);
      const drawWarnings = new Set();
      model.draw(mockContext(drawWarnings), state, model.width, model.height);
      if (onCycle) await onCycle({ vizPath, cycle, state, model, context: mockContext(drawWarnings) });
      for (const warning of drawWarnings) row.warnings.push(`Cycle ${cycle}: ${warning}`);
      if (invariantBreaks) row.errors.push(`Cycle ${cycle}: ${invariantBreaks} top-level invariant failures`);
      row.runs.push({ cycle, ticks, invariantObserved, invariantBreaks, nanPaths: nan, drawWarnings: [...drawWarnings] });
    } catch (error) {
      row.errors.push(`Cycle ${cycle}: ${error.message}`);
    }
  }
  report.visualizations.push(row);
  if (!quiet && (row.errors.length || row.warnings.length)) console.log(`${vizPath}: ${[...row.errors, ...row.warnings].join(' | ')}`);
}
report.summary = {
  visualizationCount: report.visualizations.length,
  completedRuns: report.visualizations.reduce((sum, row) => sum + row.runs.length, 0),
  callbacksAndTerminalDrawsPassed: report.visualizations.filter((row) => row.errors.length === 0).length,
  failedVisualizations: report.visualizations.filter((row) => row.errors.length).length,
  visualizationsWithWarnings: report.visualizations.filter((row) => row.warnings.length).length,
  modelsWithVariedCycleCounter: report.visualizations.filter((row) => row.cycleCounterVaried).length,
  completedTicks: report.visualizations.reduce((sum, row) => sum + row.runs.reduce((ticks, run) => ticks + run.ticks, 0), 0),
};
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
if (!quiet) {
  console.log(JSON.stringify(report.summary, null, 2));
  console.log(`Evidence: ${path.relative(root, output).replaceAll('\\', '/')}`);
}
for (const [key, previous] of previousGlobals) {
  if (previous.own) globalThis[key] = previous.value;
  else delete globalThis[key];
}
return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    if (!['--cycles', '--output'].includes(key) || !args[index + 1]) throw new Error(`Invalid argument ${key}`);
    options[key.slice(2)] = key === '--output' ? args[++index] : Number(args[++index]);
  }
  const report = await auditCanvasCallbacks(options);
  if (report.summary.failedVisualizations) process.exitCode = 1;
}
