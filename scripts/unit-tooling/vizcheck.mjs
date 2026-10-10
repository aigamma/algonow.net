// Bundle a viz module with esbuild and drive its exported makeScene/sceneTick
// model for N cycles in Node, reporting ticks per cycle and any tick on which
// the scene reports a broken invariant (sc.ok === false).
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [vizPath, cyclesArg, seedArg] = process.argv.slice(2);
const cycles = Number(cyclesArg || 20);
const seed = Number(seedArg || 20261010);
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
for (let c = 0; c < cycles; c += 1) {
  const sc = mod.makeScene(seed + c * 7919);
  let t = 0;
  while (!mod.sceneTick(sc)) {
    t += 1;
    if (sc.ok === false) broken += 1;
    if (t > 50000) throw new Error('scene never finished');
  }
  ticks += t;
  maxTicks = Math.max(maxTicks, t);
  if (c === 0) extras.firstLast = sc.last;
  if (typeof mod.summarize === 'function') extras[`cycle${c}`] = mod.summarize(sc);
}
console.log(JSON.stringify({ cycles, ticksPerCycle: ticks / cycles, maxTicks, invariantBreaks: broken, ...extras }, null, 1));
