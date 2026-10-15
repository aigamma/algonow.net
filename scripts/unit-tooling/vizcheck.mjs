// Bundle a viz module with esbuild and drive its exported makeScene/sceneTick
// model for N cycles in Node, reporting ticks per cycle and any tick on which
// the scene reports a broken invariant (sc.ok === false).
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkSceneModel, sceneArgumentVariants } from './scene-check.mjs';

const [vizPath, cyclesArg, seedArg] = process.argv.slice(2);
const cycles = Number(cyclesArg || 20);
const seed = Number(seedArg || 20261010);
if (!vizPath || !Number.isSafeInteger(cycles) || cycles < 1 || !Number.isSafeInteger(seed)) {
  throw new Error('Usage: node vizcheck.mjs <vizPath> [positive cycles] [integer seed]');
}
const out = path.resolve(process.cwd(), 'build', 'vizcheck', path.basename(vizPath).replace(/\.jsx$/, '.mjs'));
const esbuild = await import(pathToFileURL(path.resolve(process.cwd(), 'node_modules/esbuild/lib/main.js')).href);
await esbuild.build({
  entryPoints: [vizPath],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: out,
  external: ['react', 'react-dom'],
  jsx: 'automatic',
  logLevel: 'error',
});
const mod = await import(pathToFileURL(out).href);
let ticks = 0;
let broken = 0;
let maxTicks = 0;
const extras = {};
const variants = sceneArgumentVariants(vizPath);
for (let c = 0; c < cycles; c += 1) {
  for (const [variant, sceneArgs] of variants.entries()) {
    const result = checkSceneModel(mod, { seed: seed + c * 7919, sceneArgs });
    ticks += result.ticks;
    maxTicks = Math.max(maxTicks, result.ticks);
    broken += result.invariantBreaks;
    if (c === 0 && variant === 0) extras.firstLast = result.last;
    if (result.summary) extras[`cycle${c}${variants.length > 1 ? `variant${variant}` : ''}`] = result.summary;
  }
}
const modelRuns = cycles * variants.length;
console.log(JSON.stringify({ cycles, modelRuns, ticksPerCycle: ticks / modelRuns, maxTicks, invariantBreaks: broken, ...extras }, null, 1));
if (broken > 0) process.exitCode = 1;
