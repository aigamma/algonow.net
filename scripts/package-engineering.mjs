// Optional project downloads include answers. The page must reveal the link explicitly.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { LIVE_SCENARIOS } from '../src/data/engineering.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// Keep this whitelist aligned with scripts/check-engineering.mjs.
export const PACKAGE_EXTENSIONS = Object.freeze(['.py', '.toml', '.json', '.jsonl', '.csv', '.txt', '.md', '.lock', '.npy', '.npz', '.png', '.jpg', '.wav']);
const EXTENSIONS = new Set(PACKAGE_EXTENSIONS);
const EXCLUDED_DIRECTORIES = new Set(['__pycache__', 'node_modules', 'build', 'dist', 'venv', 'private', 'secrets', 'credentials']);
const PRIVATE_FILE = /^(?:private|secrets?|credentials?|tokens?|(?:access|refresh|auth)[-_]?tokens?|service[-_]?account|id_(?:rsa|dsa|ecdsa|ed25519))(?:[._-].*)?$/i;
const PRIVATE_SUFFIX = /\.(?:pyc|pyo|pem|key|p12|pfx|keystore)$/i;
const ZIP_LIMIT = 0xffffffff;
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;

export function assertArchivePath(name) {
  if (typeof name !== 'string' || !name || /[\\:"<>|?*\x00-\x1f\x7f]/.test(name)
      || name.split('/').some(part => !part || part === '.' || part === '..'
        || /[. ]$/.test(part) || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part))) {
    throw new Error(`Unsafe archive path: ${String(name)}`);
  }
  if (Buffer.byteLength(name, 'utf8') > 0xffff) throw new Error('Archive filename exceeds the ZIP limit');
  return name;
}

function assertDirectory(directory) {
  const stat = fs.lstatSync(directory);
  if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error(`Expected a regular directory, without links: ${directory}`);
}

// Never read excluded files. Unexpected public files fail instead of entering a download.
export function collectProjectFiles(pythonRoot) {
  assertDirectory(pythonRoot);
  const entries = [];
  const visit = (directory, prefix) => {
    for (const name of fs.readdirSync(directory).sort(compare)) {
      const absolute = path.join(directory, name);
      const archiveName = assertArchivePath(`${prefix}/${name}`);
      const stat = fs.lstatSync(absolute);
      if (stat.isSymbolicLink()) throw new Error(`Project links are not allowed: ${archiveName}`);
      if (stat.isDirectory()) {
        const lower = name.toLowerCase();
        if (name.startsWith('.') || EXCLUDED_DIRECTORIES.has(lower) || lower.endsWith('.egg-info')) continue;
        visit(absolute, archiveName);
      } else if (stat.isFile()) {
        if (name.startsWith('.') || PRIVATE_FILE.test(name) || PRIVATE_SUFFIX.test(name)) continue;
        if (!EXTENSIONS.has(path.extname(name))) throw new Error(`Unexpected project file: ${archiveName}`);
        if (stat.size > ZIP_LIMIT) throw new Error(`Project file exceeds the ZIP limit: ${archiveName}`);
        const data = fs.readFileSync(absolute);
        const after = fs.lstatSync(absolute);
        if (!after.isFile() || after.isSymbolicLink() || after.size !== data.length
            || stat.size !== after.size || stat.mtimeMs !== after.mtimeMs || stat.ino !== after.ino) {
          throw new Error(`Project file changed while being packaged: ${archiveName}`);
        }
        entries.push({ name: archiveName, data });
      } else {
        throw new Error(`Unsupported project filesystem entry: ${archiveName}`);
      }
    }
  };
  visit(pythonRoot, 'python');
  if (!entries.length) throw new Error(`Python project contains no distributable files: ${pythonRoot}`);
  return entries;
}

const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, value) => {
  for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
  return value >>> 0;
});

export function crc32(data) {
  let value = 0xffffffff;
  for (const byte of data) value = CRC_TABLE[(value ^ byte) & 255] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

// Stored entries, UTF-8 names, 1980-01-01 timestamps, and stable file permissions.
export function buildStoredZip(entries) {
  if (!Array.isArray(entries) || entries.length > 0xffff) throw new Error('ZIP entry count exceeds the supported limit');
  const sorted = [...entries].sort((a, b) => compare(a.name, b.name));
  const names = new Set();
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  let centralSize = 0;
  for (const { name, data } of sorted) {
    assertArchivePath(name);
    const key = name.normalize('NFC').toLowerCase();
    if (names.has(key)) throw new Error(`Duplicate archive path: ${name}`);
    names.add(key);
    if (!Buffer.isBuffer(data)) throw new Error(`Archive entry must contain bytes: ${name}`);
    const filename = Buffer.from(name, 'utf8');
    if (data.length > ZIP_LIMIT || offset + 30 + filename.length + data.length > ZIP_LIMIT) throw new Error('Archive exceeds the supported ZIP size');
    const checksum = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(33, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(filename.length, 26);
    localParts.push(local, filename, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE((3 << 8) | 20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(33, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(filename.length, 28);
    central.writeUInt32LE((0o100644 << 16) >>> 0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, filename);
    centralSize += central.length + filename.length;
    offset += local.length + filename.length + data.length;
  }
  if (centralSize > ZIP_LIMIT || offset + centralSize + 22 > ZIP_LIMIT) throw new Error('Archive exceeds the supported ZIP size');
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(sorted.length, 8);
  end.writeUInt16LE(sorted.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...localParts, ...centralParts, end]);
}

function normalSubdirectory(root, parts, create = false) {
  let directory = root;
  for (const part of parts) {
    directory = path.join(directory, part);
    if (create && !fs.existsSync(directory)) fs.mkdirSync(directory);
    assertDirectory(directory);
  }
  return directory;
}

export function packageEngineering({ root = ROOT, scenarios = LIVE_SCENARIOS } = {}) {
  assertDirectory(root);
  const canonicalRoot = fs.realpathSync(root);
  const slugs = new Set();
  // Validate every project before writing any downloads.
  const projects = scenarios.filter(scenario => scenario.status === 'published').map(scenario => {
    const { slug } = scenario;
    if (!SLUG.test(slug || '') || scenario.language !== 'python' || slugs.has(slug)) throw new Error('Invalid or duplicate published Python scenario');
    slugs.add(slug);
    const pythonRoot = normalSubdirectory(canonicalRoot, ['scenarios', slug, 'python']);
    const entries = collectProjectFiles(pythonRoot);
    return { slug, files: entries.map(entry => entry.name).sort(compare), data: buildStoredZip(entries) };
  });
  if (!projects.length) return [];
  const destination = normalSubdirectory(canonicalRoot, ['dist', 'downloads'], true);
  return projects.map(({ slug, files, data }) => {
    const filename = `${slug}-project.zip`;
    const output = path.join(destination, filename);
    if (fs.existsSync(output) && (!fs.lstatSync(output).isFile() || fs.lstatSync(output).isSymbolicLink())) {
      throw new Error(`Archive destination must be a regular file: ${filename}`);
    }
    const temporary = path.join(destination, `.${filename}.${process.pid}.tmp`);
    fs.writeFileSync(temporary, data, { flag: 'wx' });
    try {
      fs.renameSync(temporary, output);
    } finally {
      if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    }
    return { slug, href: `/downloads/${filename}`, output, files, bytes: data.length };
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const results = packageEngineering();
    for (const result of results) console.log(`PASS engineering package: ${result.slug}, ${result.files.length} files, ${result.bytes} bytes`);
    if (!results.length) console.log('No published engineering projects to package.');
  } catch (error) {
    console.error(`FAIL engineering package: ${error.message}`);
    process.exitCode = 1;
  }
}
