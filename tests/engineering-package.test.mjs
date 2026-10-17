import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PACKAGE_EXTENSIONS, assertArchivePath, collectProjectFiles, buildStoredZip, crc32, packageEngineering } from '../scripts/package-engineering.mjs';

// These are transport fixtures only, not authored learning examples.
function temporaryProject(t) {
  const temporaryRoot = fs.realpathSync(os.tmpdir());
  const root = fs.mkdtempSync(path.join(temporaryRoot, 'algonow-package-test-'));
  t.after(() => {
    const resolved = fs.realpathSync(root);
    assert.equal(path.dirname(resolved), temporaryRoot);
    assert.ok(path.basename(resolved).startsWith('algonow-package-test-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  return root;
}

function write(root, relative, data = Buffer.from('transport fixture\r\n')) {
  const absolute = path.join(root, relative);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, data);
  return absolute;
}

const published = { slug: 'package-probe', status: 'published', language: 'python' };
const project = 'scenarios/package-probe/python';

test('download file types stay aligned with the publication validator', () => {
  const checker = fs.readFileSync(fileURLToPath(new URL('../scripts/check-engineering.mjs', import.meta.url)), 'utf8');
  const declaration = checker.match(/const PACKAGE_EXTENSIONS = new Set\(\[([^\]]+)\]\)/);
  assert.ok(declaration, 'the checker extension whitelist must remain explicit');
  const extensions = [...declaration[1].matchAll(/'([^']+)'/g)].map(match => match[1]);
  assert.deepEqual([...PACKAGE_EXTENSIONS].sort(), extensions.sort());
});

test('stored ZIP has valid CRCs, fixed metadata, UTF-8 names, and exact source bytes in Python zipfile', t => {
  const root = temporaryProject(t);
  const files = new Map([
    ['python/pyproject.toml', Buffer.from('[tool.transport]\r\n')],
    ['python/src/probe/starter.py', Buffer.from('# transport fixture\r\n')],
    ['python/src/probe/solution.py', Buffer.from('# reference transport fixture\n')],
    ['python/fixtures/bytes.npz', Buffer.from([0, 255, 17, 128, 10, 13])],
    ['python/fixtures/caf\u00e9.json', Buffer.from('{"transport":true}\n')],
    ['python/fixtures/runbooks/api-keys.md', Buffer.from('public transport fixture\n')],
    ['python/tests/test_empty.py', Buffer.alloc(0)],
  ]);
  for (const [name, data] of files) write(root, `scenarios/package-probe/${name}`, data);
  const [result] = packageEngineering({ root, scenarios: [published] });
  assert.equal(result.href, '/downloads/package-probe-project.zip');
  assert.equal(result.output, path.join(root, 'dist', 'downloads', 'package-probe-project.zip'));
  assert.equal(result.files.length, files.size);
  assert.equal(crc32(Buffer.from('123456789')), 0xcbf43926);
  const verification = spawnSync(process.env.PYTHON || 'python', ['-B', '-c', [
    'import base64, json, pathlib, sys, zipfile',
    'expected = json.load(sys.stdin.buffer)',
    'with zipfile.ZipFile(sys.argv[1]) as archive:',
    '    assert archive.testzip() is None',
    '    assert archive.namelist() == sorted(expected)',
    '    assert archive.comment == b""',
    '    for info in archive.infolist():',
    '        actual = archive.read(info.filename)',
    '        assert actual == base64.b64decode(expected[info.filename])',
    '        assert actual == pathlib.Path(sys.argv[2], info.filename).read_bytes()',
    '        assert info.compress_type == zipfile.ZIP_STORED',
    '        assert info.flag_bits == 0x800',
    '        assert info.date_time == (1980, 1, 1, 0, 0, 0)',
    '        assert info.external_attr >> 16 == 0o100644',
    '        assert info.extra == b"" and info.comment == b""',
    'print("OK: independent ZIP integrity and byte comparison")',
  ].join('\n'), result.output, path.join(root, 'scenarios', 'package-probe')], {
    encoding: 'utf8', input: JSON.stringify(Object.fromEntries([...files].map(([name, data]) => [name, data.toString('base64')]))),
  });
  assert.ifError(verification.error);
  assert.equal(verification.status, 0, verification.stderr || verification.stdout);
  assert.match(verification.stdout, /OK: independent ZIP integrity and byte comparison/);
});

test('archive bytes do not depend on entry order or filesystem timestamps', t => {
  const root = temporaryProject(t);
  const first = write(root, `${project}/src/probe/solution.py`);
  write(root, `${project}/pyproject.toml`);
  const entries = collectProjectFiles(path.join(root, project));
  assert.deepEqual(buildStoredZip(entries), buildStoredZip([...entries].reverse()));
  const [before] = packageEngineering({ root, scenarios: [published] });
  const bytes = fs.readFileSync(before.output);
  fs.utimesSync(first, new Date('2001-01-01'), new Date('2026-10-17'));
  const [after] = packageEngineering({ root, scenarios: [published] });
  assert.deepEqual(fs.readFileSync(after.output), bytes);
});

test('caches, private names, and compiled files never enter the archive', t => {
  const root = temporaryProject(t);
  write(root, `${project}/pyproject.toml`, Buffer.from('public bytes'));
  const excluded = ['.env', '.env.local', '.hidden.json', 'credentials.json', 'service-account-prod.json', 'secret_config.json', 'private.txt', 'token.json', 'id_rsa', 'key.pem', 'output.pyc',
    '__pycache__/cache.pyc', '.venv/bin/python', 'venv/bin/python', 'node_modules/entry.js', 'build/binary.exe', 'dist/asset.js', '.pytest_cache/cache.json', 'probe.egg-info/PKG-INFO', '.git/config', '.private/data.json', 'private/data.json', 'secrets/data.json', 'credentials/data.json'];
  for (const name of excluded) write(root, `${project}/${name}`, Buffer.from('EXCLUDED-PRIVATE-TRANSPORT-MARKER'));
  const entries = collectProjectFiles(path.join(root, project));
  assert.deepEqual(entries.map(entry => entry.name), ['python/pyproject.toml']);
  assert.equal(buildStoredZip(entries).includes(Buffer.from('EXCLUDED-PRIVATE-TRANSPORT-MARKER')), false);
});

test('unexpected files fail before any project downloads are written', t => {
  const root = temporaryProject(t);
  write(root, `${project}/pyproject.toml`);
  write(root, 'scenarios/second-probe/python/unreviewed.js');
  assert.throws(() => packageEngineering({ root, scenarios: [published, { ...published, slug: 'second-probe' }] }), /Unexpected project file: python\/unreviewed.js/);
  assert.equal(fs.existsSync(path.join(root, 'dist')), false);
});

test('draft scenarios are not read or packaged', t => {
  const root = temporaryProject(t);
  write(root, `${project}/pyproject.toml`);
  write(root, 'scenarios/draft-probe/python/unreviewed.js');
  const results = packageEngineering({ root, scenarios: [published, { ...published, slug: 'draft-probe', status: 'draft' }] });
  assert.deepEqual(results.map(result => result.slug), ['package-probe']);
  assert.deepEqual(fs.readdirSync(path.join(root, 'dist', 'downloads')), ['package-probe-project.zip']);
});

test('unsafe paths and archive collisions are rejected', t => {
  for (const name of ['../escape.py', '/absolute.py', 'python/../escape.py', 'python\\escape.py', 'C:/escape.py', 'python//empty.py', 'python/./dot.py', 'python/a:stream.py', 'python/trailing. /x.py', 'python/NUL.txt', 'python/line\nbreak.py']) {
    assert.throws(() => assertArchivePath(name), /Unsafe archive path/);
  }
  const data = Buffer.alloc(0);
  assert.throws(() => buildStoredZip([{ name: 'python/a.py', data }, { name: 'python/A.py', data }]), /Duplicate archive path/);
  assert.throws(() => buildStoredZip([{ name: 'python/caf\u00e9.py', data }, { name: 'python/cafe\u0301.py', data }]), /Duplicate archive path/);
  const root = temporaryProject(t);
  assert.throws(() => packageEngineering({ root, scenarios: [{ ...published, slug: '../escape' }] }), /Invalid or duplicate/);
  write(root, `${project}/pyproject.toml`);
  assert.throws(() => packageEngineering({ root, scenarios: [published, published] }), /Invalid or duplicate/);
});

test('project links and linked output directories fail without following them', t => {
  const root = temporaryProject(t);
  write(root, `${project}/pyproject.toml`);
  const outside = path.join(root, 'outside');
  write(root, 'outside/private.json');
  const link = path.join(root, project, 'linked');
  fs.symlinkSync(outside, link, process.platform === 'win32' ? 'junction' : 'dir');
  try {
    assert.throws(() => packageEngineering({ root, scenarios: [published] }), /Project links are not allowed/);
    assert.equal(fs.existsSync(path.join(root, 'dist')), false);
  } finally {
    fs.unlinkSync(link);
  }
  const dist = path.join(root, 'dist');
  fs.symlinkSync(outside, dist, process.platform === 'win32' ? 'junction' : 'dir');
  try {
    assert.throws(() => packageEngineering({ root, scenarios: [published] }), /Expected a regular directory, without links/);
    assert.deepEqual(fs.readdirSync(outside), ['private.json']);
  } finally {
    fs.unlinkSync(dist);
  }
});
