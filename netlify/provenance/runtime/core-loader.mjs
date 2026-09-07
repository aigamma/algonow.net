// This module belongs only in the dedicated producer/consumer runtime bundle.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import * as core from './core/prov_wasm.js';

let pending;
export function loadCore(artifactDirectory = new URL('./core/', import.meta.url)) {
  pending ??= (async () => {
    const [js, wasm] = await Promise.all([
      readFile(new URL('prov_wasm.js', artifactDirectory)), readFile(new URL('prov_wasm_bg.wasm', artifactDirectory)),
    ]);
    if (createHash('sha256').update(js.toString('utf8').replace(/\r\n/g, '\n')).digest('hex') !== '4b31dd0351bec764379f89ea735abbeb18af270cc18c09ef53115b1d8bcd729f' ||
      createHash('sha256').update(wasm).digest('hex') !== '39caf277dc5d1182aae286a668be116cf476ed682cfd77ed401628d81169dc0b') throw new Error('reference_core_digest_mismatch');
    core.initSync({ module: wasm });
    return core;
  })();
  return pending;
}
