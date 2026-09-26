import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  PILOT_SLUG,
  ROOT,
  assert,
  assertPublicManifest,
  assertSlug,
  buildPilotPlan,
  buildPlanForSlug,
  defaultReceiptPath,
  loadLocalRelease,
  loadPublicationReceipt,
  loadPublicManifest,
  normalizePublicationTarget,
  writeFileAtomic,
} from './release-contract.mjs';

const MODULE_PATH = fileURLToPath(import.meta.url);

export function parseInstallationArguments(argv) {
  const options = {
    slug: PILOT_SLUG,
    execute: false,
    stack: '',
    region: '',
    bucket: '',
    distributionId: '',
    distributionDomain: '',
    receiptPath: '',
  };
  const explicit = new Set();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--execute') options.execute = true;
    else if (argument === '--slug') options.slug = assertSlug(argv[++index] || '');
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
  if (!explicit.has('receiptPath')) options.receiptPath = defaultReceiptPath(options.slug);
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
  plan = buildPilotPlan(),
  receiptPath = defaultReceiptPath(plan.slug),
} = {}) {
  const target = normalizePublicationTarget({ stack, region, bucket, distributionId, distributionDomain });
  const current = loadPublicManifest({ root, plan, allowPending: true, allowMissing: true });
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
    plan,
    receiptPath,
    manifest,
    target,
  });
  const updatedText = `${JSON.stringify(manifest, null, 2)}\n`;
  const originalText = current.missing ? '' : fs.readFileSync(current.filePath, 'utf8');
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

export function installPuzzleNarration({
  root = ROOT,
  execute = false,
  plan = buildPilotPlan(),
  ...options
} = {}) {
  const installation = buildInstallationPlan({ root, plan, ...options });
  if (execute && installation.changed) {
    writeFileAtomic(installation.filePath, installation.updatedText, { encoding: 'utf8' });
  }
  return {
    mode: execute ? 'execute' : 'dry-run',
    slug: plan.slug,
    sourceType: installation.sourceType,
    changedCount: installation.changed ? 1 : 0,
    unchangedCount: installation.changed ? 0 : 1,
    receiptValidated: true,
    filePath: path.relative(root, installation.filePath).replaceAll('\\', '/'),
  };
}

// The pilot's name survives for the offline test suite and the runbook.
export const installKalmanNarration = installPuzzleNarration;

export async function main(argv = process.argv.slice(2)) {
  const { slug, ...options } = parseInstallationArguments(argv);
  const plan = await buildPlanForSlug(slug);
  const result = installPuzzleNarration({ ...options, plan });
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
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
