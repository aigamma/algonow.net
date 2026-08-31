import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_RECEIPT_PATH,
  PILOT_SLUG,
  ROOT,
  assert,
  assertPublicManifest,
  buildPilotPlan,
  loadLocalRelease,
  loadPublicationReceipt,
  loadPublicManifest,
  normalizePublicationTarget,
  writeFileAtomic,
} from './release-contract.mjs';

const MODULE_PATH = fileURLToPath(import.meta.url);

export function parseInstallationArguments(argv) {
  const options = {
    execute: false,
    stack: '',
    region: '',
    bucket: '',
    distributionId: '',
    distributionDomain: '',
    receiptPath: DEFAULT_RECEIPT_PATH,
  };
  const explicit = new Set();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--execute') options.execute = true;
    else if (argument === '--stack') {
      options.stack = argv[++index] || '';
      explicit.add('stack');
    } else if (argument === '--region') {
      options.region = argv[++index] || '';
      explicit.add('region');
    } else if (argument === '--bucket') {
      options.bucket = argv[++index] || '';
      explicit.add('bucket');
    } else if (argument === '--distribution-id') {
      options.distributionId = argv[++index] || '';
      explicit.add('distributionId');
    } else if (argument === '--distribution-domain') {
      options.distributionDomain = argv[++index] || '';
      explicit.add('distributionDomain');
    } else if (argument === '--receipt') {
      options.receiptPath = argv[++index] || '';
      explicit.add('receiptPath');
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  const flags = {
    stack: '--stack',
    region: '--region',
    bucket: '--bucket',
    distributionId: '--distribution-id',
    distributionDomain: '--distribution-domain',
  };
  for (const [field, flag] of Object.entries(flags)) {
    assert(explicit.has(field), `${flag} is required for receipt-bound installation`);
  }
  assert(options.receiptPath, '--receipt requires a repository-relative path');
  if (options.execute) assert(explicit.has('receiptPath'), '--receipt is required with --execute');
  normalizePublicationTarget(options);
  return options;
}

export function buildInstallationPlan({
  root = ROOT,
  stack,
  region,
  bucket,
  distributionId,
  distributionDomain,
  receiptPath = DEFAULT_RECEIPT_PATH,
} = {}) {
  const target = normalizePublicationTarget({ stack, region, bucket, distributionId, distributionDomain });
  const plan = buildPilotPlan();
  const current = loadPublicManifest({ root, plan, allowPending: true });
  let manifest;
  let sourceType;
  if (current.manifest.status === 'pending') {
    manifest = loadLocalRelease({ root, plan }).publicManifest;
    sourceType = 'local-complete';
  } else {
    manifest = current.manifest;
    sourceType = 'published-current';
  }
  assertPublicManifest(manifest, plan);
  const receipt = loadPublicationReceipt({
    root,
    receiptPath,
    manifest,
    target,
  });
  const updatedText = `${JSON.stringify(manifest, null, 2)}\n`;
  const originalText = fs.readFileSync(current.filePath, 'utf8');
  return {
    target,
    manifest,
    receipt,
    filePath: current.filePath,
    updatedText,
    sourceType,
    changed: originalText !== updatedText,
  };
}

export function installKalmanNarration({
  root = ROOT,
  execute = false,
  ...options
} = {}) {
  const plan = buildInstallationPlan({ root, ...options });
  if (execute && plan.changed) {
    writeFileAtomic(plan.filePath, plan.updatedText, { encoding: 'utf8' });
  }
  return {
    mode: execute ? 'execute' : 'dry-run',
    slug: PILOT_SLUG,
    sourceType: plan.sourceType,
    changedCount: plan.changed ? 1 : 0,
    unchangedCount: plan.changed ? 0 : 1,
    receiptValidated: true,
    filePath: path.relative(root, plan.filePath).replaceAll('\\', '/'),
  };
}

export function main(argv = process.argv.slice(2)) {
  const options = parseInstallationArguments(argv);
  const result = installKalmanNarration(options);
  console.log(JSON.stringify({
    mode: result.mode,
    slug: result.slug,
    source: result.sourceType,
    files_to_update: result.changedCount,
    files_unchanged: result.unchangedCount,
    publication_receipt_validated: result.receiptValidated,
    public_manifest: result.filePath,
  }, null, 2));
  if (!options.execute) {
    console.log('Dry run complete. Re-run with the same target arguments, --receipt, and --execute to install.');
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(MODULE_PATH)) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
