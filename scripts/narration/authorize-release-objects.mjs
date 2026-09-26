// Rotates the narration publisher role onto ONE reviewed release: the two
// exact MP3 object ARNs (Aoede and Algieba) of one page. The role never
// holds a wildcard write; every page's publication is preceded by this
// CloudFormation update, which is the only place a privileged (root or
// infrastructure-operator) session touches IAM. The publisher itself then
// runs as the assumed least-privilege role.
//
// Dry run (no AWS call except reading the stack):
//   node scripts/narration/authorize-release-objects.mjs --slug <slug>
// Execute:
//   node scripts/narration/authorize-release-objects.mjs --slug <slug> --execute
// First-time broker rotation adds --broker-arn <exact user ARN>.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  ROOT,
  TRACK_IDS,
  assert,
  assertSlug,
  buildPlanForSlug,
  loadLocalRelease,
} from './release-contract.mjs';

const MODULE_PATH = fileURLToPath(import.meta.url);
export const DEFAULT_ROLES_STACK = 'algonow-narration-bootstrap';
export const DEFAULT_ROLES_REGION = 'us-east-2';
export const DEFAULT_BUCKET_PATTERN = 'algonow-net-media-prod-*';
export const ROLES_TEMPLATE_PATH = 'infra/media-cdn/bootstrap-roles.yaml';
const BROKER_ARN_PATTERN = /^arn:aws:iam::\d{12}:user\/bootstrap\/algonow-role-broker-[a-z0-9-]+$/;

export function parseAuthorizationArguments(argv) {
  const options = {
    slug: '',
    execute: false,
    stack: DEFAULT_ROLES_STACK,
    region: DEFAULT_ROLES_REGION,
    bucketPattern: DEFAULT_BUCKET_PATTERN,
    brokerArn: '',
    awsPath: '',
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--execute') options.execute = true;
    else if (argument === '--slug') options.slug = assertSlug(argv[++index] || '');
    else if (argument === '--stack') options.stack = argv[++index] || '';
    else if (argument === '--region') options.region = argv[++index] || '';
    else if (argument === '--bucket-pattern') options.bucketPattern = argv[++index] || '';
    else if (argument === '--broker-arn') options.brokerArn = argv[++index] || '';
    else if (argument === '--aws-path') options.awsPath = argv[++index] || '';
    else throw new Error(`Unknown argument: ${argument}`);
  }
  assert(options.slug, '--slug is required');
  assert(/^[A-Za-z][-A-Za-z0-9]{0,127}$/.test(options.stack), 'Roles stack name is invalid');
  assert(/^[a-z]{2}(?:-gov)?-[a-z]+-\d+$/.test(options.region), 'Roles stack region is invalid');
  assert(/^[a-z0-9][a-z0-9.*-]*$/.test(options.bucketPattern), 'Bucket pattern is invalid');
  if (options.brokerArn) {
    assert(BROKER_ARN_PATTERN.test(options.brokerArn), 'Broker ARN must name a /bootstrap/algonow-role-broker-* user');
  }
  return options;
}

export function releaseObjectArns({ root = ROOT, plan, bucketPattern = DEFAULT_BUCKET_PATTERN } = {}) {
  const release = loadLocalRelease({ root, plan });
  return TRACK_IDS.map((trackId) => `arn:aws:s3:::${bucketPattern}/${release.tracks[trackId].object_key}`);
}

export function buildStackParameters({ objectArns, brokerArn = '' } = {}) {
  assert(Array.isArray(objectArns) && objectArns.length === TRACK_IDS.length, 'Exactly one object ARN per voice is required');
  for (const arn of objectArns) {
    assert(/^arn:aws:s3:::[a-z0-9.*-]+\/narration\/v1\/puzzles\/[a-z0-9-]+\/[a-f0-9]{20}\/(?:aoede|algieba)-[a-f0-9]{16}\.mp3$/.test(arn), `Object ARN is not a reviewed narration object: ${arn}`);
    assert(!arn.includes(','), 'Object ARNs cannot contain commas');
  }
  return [
    brokerArn
      ? { ParameterKey: 'BrokerArn', ParameterValue: brokerArn }
      : { ParameterKey: 'BrokerArn', UsePreviousValue: true },
    { ParameterKey: 'ReleaseObjectArns', ParameterValue: objectArns.join(',') },
  ];
}

function resolveAwsCliPath(explicitPath = '') {
  const requested = String(explicitPath || process.env.AWS_PATH || '').trim();
  if (requested) return requested;
  const candidates = [
    'C:\\Program Files\\Amazon\\AWSCLIV2\\aws.exe',
    'C:\\Program Files (x86)\\Amazon\\AWSCLIV2\\aws.exe',
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || 'aws';
}

export function runAwsCli(args, { awsPath = '' } = {}) {
  const result = spawnSync(resolveAwsCliPath(awsPath), args, {
    encoding: 'utf8',
    env: { ...process.env, AWS_CLI_AUTO_PROMPT: 'off', AWS_PAGER: '' },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error) throw new Error(`AWS CLI could not start: ${result.error.message}`);
  return { status: result.status, stdout: result.stdout || '', stderr: result.stderr || '' };
}

function parseJson(result, operation) {
  if (result.status !== 0) {
    throw new Error(`AWS ${operation} failed: ${(result.stderr || result.stdout).trim().slice(0, 400)}`);
  }
  try {
    return result.stdout.trim() ? JSON.parse(result.stdout) : {};
  } catch (error) {
    throw new Error(`AWS ${operation} returned invalid JSON: ${error.message}`);
  }
}

export async function authorizeReleaseObjects({
  root = ROOT,
  slug,
  execute = false,
  stack = DEFAULT_ROLES_STACK,
  region = DEFAULT_ROLES_REGION,
  bucketPattern = DEFAULT_BUCKET_PATTERN,
  brokerArn = '',
  awsPath = '',
  runner = (args) => runAwsCli(args, { awsPath }),
  plan = null,
} = {}) {
  const narrationPlan = plan || await buildPlanForSlug(slug, { root });
  const objectArns = releaseObjectArns({ root, plan: narrationPlan, bucketPattern });
  const parameters = buildStackParameters({ objectArns, brokerArn });
  const templatePath = path.join(root, ROLES_TEMPLATE_PATH);
  assert(fs.existsSync(templatePath), 'Roles template is missing');

  const stackResponse = parseJson(runner([
    'cloudformation', 'describe-stacks', '--region', region, '--stack-name', stack, '--output', 'json',
  ]), 'roles stack lookup');
  const current = stackResponse.Stacks?.[0];
  assert(current && current.StackName === stack, 'Roles stack lookup returned the wrong stack');
  assert(
    ['CREATE_COMPLETE', 'UPDATE_COMPLETE'].includes(current.StackStatus),
    `Roles stack is not in a complete state (${current.StackStatus})`
  );
  const currentArns = String(
    (current.Parameters || []).find((p) => p.ParameterKey === 'ReleaseObjectArns')?.ParameterValue || ''
  ).split(',').filter(Boolean);
  const alreadyAuthorized = !brokerArn
    && currentArns.length === objectArns.length
    && objectArns.every((arn) => currentArns.includes(arn));

  const report = {
    mode: execute ? 'execute' : 'dry-run',
    slug: narrationPlan.slug,
    release_sha256: narrationPlan.releaseHash,
    stack,
    region,
    object_arns: objectArns,
    broker_rotation: Boolean(brokerArn),
    already_authorized: alreadyAuthorized,
  };
  if (!execute || alreadyAuthorized) return { ...report, updated: false };

  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'algonow-roles-'));
  const parametersPath = path.join(temporaryDirectory, 'parameters.json');
  try {
    fs.writeFileSync(parametersPath, JSON.stringify(parameters), 'utf8');
    const update = runner([
      'cloudformation', 'update-stack',
      '--region', region,
      '--stack-name', stack,
      '--template-body', `file://${templatePath}`,
      '--parameters', `file://${parametersPath}`,
      '--capabilities', 'CAPABILITY_NAMED_IAM',
      '--output', 'json',
    ]);
    if (update.status !== 0) {
      if (/No updates are to be performed/i.test(`${update.stdout}\n${update.stderr}`)) {
        return { ...report, updated: false, already_authorized: true };
      }
      throw new Error(`AWS roles stack update failed: ${(update.stderr || update.stdout).trim().slice(0, 400)}`);
    }
    const wait = runner([
      'cloudformation', 'wait', 'stack-update-complete', '--region', region, '--stack-name', stack,
    ]);
    assert(wait.status === 0, `Roles stack update did not complete: ${(wait.stderr || wait.stdout).trim().slice(0, 400)}`);
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
  const after = parseJson(runner([
    'cloudformation', 'describe-stacks', '--region', region, '--stack-name', stack, '--output', 'json',
  ]), 'roles stack verification').Stacks?.[0];
  assert(after?.StackStatus === 'UPDATE_COMPLETE', 'Roles stack is not UPDATE_COMPLETE after the update');
  const installed = String(
    (after.Parameters || []).find((p) => p.ParameterKey === 'ReleaseObjectArns')?.ParameterValue || ''
  ).split(',');
  assert(
    installed.length === objectArns.length && objectArns.every((arn) => installed.includes(arn)),
    'Roles stack parameters do not carry the reviewed object ARNs after the update'
  );
  return { ...report, updated: true };
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseAuthorizationArguments(argv);
  const result = await authorizeReleaseObjects(options);
  console.log(JSON.stringify(result, null, 2));
  if (!options.execute) {
    console.log('Dry run complete. Re-run with --execute to rotate the publisher role onto this release.');
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(MODULE_PATH)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
