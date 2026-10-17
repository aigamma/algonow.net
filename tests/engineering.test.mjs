import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { ENGINEERING_TRACKS, ENGINEERING_SECTIONS, SCENARIOS, LIVE_SCENARIOS, publishedScenarios, scenarioPaths } from '../src/data/engineering.js';
import { checkEngineering, validateScenarioContent, validateScenarioContract, resolveScenarioFile } from '../scripts/check-engineering.mjs';
import { scaffoldEngineeringEntry, scenarioEntrySources } from '../scripts/scaffold-engineering.mjs';
import { buildPuzzleNarrationPlan, PUZZLE_NARRATION_VOICES, PLAYBACK_POLICY, CACHE_CONTROL, CONTENT_TYPE } from '../scripts/narration/puzzle-narration-pipeline.mjs';
import { buildPublicationReceipt, expectedTrackObjectKey, buildPlanForSlug } from '../scripts/narration/release-contract.mjs';
import { buildPuzzleNarrationSegments } from '../src/lib/puzzleNarration.js';

const hash = input => createHash('sha256').update(input).digest('hex');
// These temporary protocol fixtures are not authored scenarios or published content.
function fixture(t) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'algonow-engineering-')));
  t.after(() => fs.rmSync(root,{recursive:true,force:true}));
  const scenario = {slug:'contract-probe',title:'Validation fixture',summary:'Structural test data.',track:'rag',language:'python',status:'draft',difficulty:'foundation',durationMinutes:20,skills:['Protocol validation'],authoringModel:'Claude Fable 5'};
  const paths = scenarioPaths(scenario.slug);
  const directory = path.join(root,paths.directory);
  const write = (file,value) => { fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true}); fs.writeFileSync(path.join(root,file),value); };
  write('package.json','{"type":"module"}');
  scaffoldEngineeringEntry(scenario,{root});
  const sources = {
    'python/pyproject.toml':'[project]\nname = "contract-probe"\nversion = "0.0.0"\nrequires-python = ">=3.11"\ndependencies = []\n',
    'python/src/probe/__init__.py':'',
    'python/src/probe/starter.py':'VALUE = None\n',
    'python/src/probe/solution.py':'VALUE = 1\n',
    'python/tests/test_probe.py':'import unittest\nfrom probe.solution import VALUE\n\nclass ProtocolTest(unittest.TestCase):\n    def test_correctness(self):\n        self.assertEqual(VALUE, 1)\n    def test_failure(self):\n        with self.assertRaises(ValueError):\n            int("invalid")\n    def test_evaluation(self):\n        self.assertEqual(sum([VALUE]), 1)\n',
    'python/fixtures/probe.json':'[1]\n',
    'visuals/probe.svg':'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0 L10 10" /></svg>',
  };
  for (const [name,value] of Object.entries(sources)) write(`${paths.directory}/${name}`,value);
  const files = [
    {path:'python/src/probe/starter.py',language:'python',role:'starter'},
    {path:'python/src/probe/solution.py',language:'python',role:'reference'},
    {path:'python/tests/test_probe.py',language:'python',role:'test'},
    {path:'python/fixtures/probe.json',language:'json',role:'fixture'},
  ];
  const content = `${files.map((file,i) => `import f${i} from './${file.path}?raw';`).join('\n')}
export const content = {
brief:'Fixture', starter:'Fixture', evidence:'Fixture', solution:'Fixture', visual:'Fixture',
files:[${files.map((file,i) => `{path:${JSON.stringify(file.path)},language:${JSON.stringify(file.language)},role:${JSON.stringify(file.role)},description:'Fixture',source:f${i}}`).join(',')}],
tradeoffs:[{name:'A',preferWhen:'Condition A',cost:'Cost A'},{name:'B',preferWhen:'Condition B',cost:'Cost B'}]
};`;
  write(paths.content,content);
  const narration = ENGINEERING_SECTIONS.map(section => ({section,text:`Structural fixture for ${section}.`}));
  write(paths.narration,`export const narration = ${JSON.stringify(narration)};`);
  const contract = {schemaVersion:1,slug:scenario.slug,track:scenario.track,language:'python',
    system:{context:'Fixture',request:'Fixture',inputs:['Fixture'],outputs:['Fixture'],constraints:['Fixture'],successCriteria:['Fixture']},
    python:{package:'probe',dependencies:'stdlib'},
    fixtures:[{path:'python/fixtures/probe.json',description:'Fixture',sha256:hash(sources['python/fixtures/probe.json'])}],
    checks:['correctness','failure','evaluation'].map(kind => ({id:kind,kind,description:'Fixture',file:'python/tests/test_probe.py',function:`test_${kind}`})),
    visuals:[{kind:'svg',path:'visuals/probe.svg',description:'Fixture',correctness:'Structural fixture only.',check:'evaluation'}],
  };
  const saveContract = () => write(paths.contract,JSON.stringify(contract));
  saveContract();
  return {root,scenario,paths,directory,write,content,contract,narration,saveContract};
}

function installSyntheticAudio(f) {
  const plan = buildPuzzleNarrationPlan({slug:f.scenario.slug,narration:f.narration,sourcePath:f.paths.narration});
  const tracks = Object.fromEntries(Object.entries(PUZZLE_NARRATION_VOICES).map(([id,voice]) => {
    const audioHash = hash(`synthetic metadata ${id}`);
    return [id,{...voice,object_key:expectedTrackObjectKey(plan,id,audioHash),content_type:CONTENT_TYPE,cache_control:CACHE_CONTROL,bytes:2048,sha256:audioHash,
      request_parts:plan.requests.map(r => ({request_index:r.index,request_sha256:r.sha256,bytes:2048,sha256:audioHash}))}];
  }));
  const manifest = {schema_version:1,content_id:plan.contentId,source_path:plan.sourcePath,source_sha256:plan.sourceHash,source_characters:plan.charactersPerVoice,
    recipe:plan.recipe,recipe_sha256:plan.recipeHash,release_sha256:plan.releaseHash,generated_at:'2026-10-17T00:00:00Z',generated_characters:plan.plannedBillableCharacters,
    ...PLAYBACK_POLICY,request_chunks:plan.requestChunks,assembly:plan.assembly,segments:plan.segments,tracks};
  const receipt = buildPublicationReceipt({manifest,target:{stack:'algonow-test',region:'us-east-2',bucket:'test-private-bucket',distributionId:'E123456789ABC',distributionDomain:'d111111abcdef8.cloudfront.net'},
    plan,resultsByTrack:{aoede:'uploaded',algieba:'uploaded'}});
  f.write(f.paths.manifest,JSON.stringify(manifest)); f.write(f.paths.receipt,JSON.stringify(receipt));
  return {manifest,receipt};
}

test('engineering registry uses six tracks and exposes only published scenarios', async () => {
  assert.deepEqual(ENGINEERING_TRACKS.map(t => t.id),['rag','data-pipelines','fine-tuning','distillation','evaluation','serving']);
  assert.deepEqual(LIVE_SCENARIOS,publishedScenarios(SCENARIOS));
  assert.deepEqual((await checkEngineering()).errors,[]);
});

test('publication projection excludes drafts and derives canonical scenario routes', () => {
  const rows = publishedScenarios([{slug:'one',status:'draft'},{slug:'two',status:'published',title:'T',href:'/wrong/'}]);
  assert.equal(rows.length,1); assert.equal(rows[0].href,'/scenarios/two/');
  assert.equal(rows[0].html,'scenarios/two/index.html'); assert.equal(rows[0].vite,'scenario-two');
  assert.throws(() => scenarioPaths('../escape'));
});

test('registry rejects non-Python, non-engineering, duplicate, and legacy-shaped rows', async t => {
  const f=fixture(t);
  const bad={...f.scenario,language:'javascript',track:'sorting',algorithm:'A',heuristic:'B',authoringModel:'Other'};
  const result=await checkEngineering({root:f.root,scenarios:[bad,bad]});
  for(const pattern of [/must be python/,/engineering track/,/Duplicate/,/pairing schema/,/attributed/]) assert.match(result.errors.join('\n'),pattern);
});

test('complete draft package runs real Python tests but remains unpublished', async t => {
  const f=fixture(t);
  const result=await checkEngineering({root:f.root,scenarios:[f.scenario],includeDrafts:true,runPython:true});
  assert.deepEqual(result.errors,[]); assert.equal(result.published,0); assert.deepEqual(result.checked,[f.scenario.slug]);
  const releasePlan=await buildPlanForSlug(f.scenario.slug,{root:f.root});
  assert.equal(releasePlan.sourcePath,f.paths.narration);
  assert.match(releasePlan.sourceHash,/^[a-f0-9]{64}$/);
});

test('test runner rejects failure and zero discovered tests', async t => {
  const f=fixture(t);
  f.write(`${f.paths.directory}/python/src/probe/solution.py`,'VALUE = 2\n');
  let result=await checkEngineering({root:f.root,scenarios:[f.scenario],includeDrafts:true,runPython:true});
  assert.match(result.errors.join('\n'),/Python unittest failed/);
  f.write(`${f.paths.directory}/python/tests/test_probe.py`,'def test_correctness(): pass\ndef test_failure(): pass\ndef test_evaluation(): pass\n');
  result=await checkEngineering({root:f.root,scenarios:[f.scenario],includeDrafts:true,runPython:true});
  assert.match(result.errors.join('\n'),/ran no tests/);
});

test('fixture drift, missing test symbols, and unrelated visual checks fail', t => {
  const f=fixture(t);
  f.contract.fixtures[0].sha256='0'.repeat(64);
  f.contract.checks[0].function='test_absent'; f.contract.visuals[0].check='absent';
  const errors=validateScenarioContract(f.contract,f.scenario,{directory:f.directory}).join('\n');
  assert.match(errors,/fixture hash mismatch/); assert.match(errors,/named test function is missing/); assert.match(errors,/declared executable check/);
});

test('package rejects foreign executable source and escaping asset paths', t => {
  const f=fixture(t);
  f.write(`${f.paths.directory}/python/solution.js`,'throw 0;');
  f.contract.fixtures[0].path='../../outside.json';
  const errors=validateScenarioContract(f.contract,f.scenario,{directory:f.directory}).join('\n');
  assert.match(errors,/non-Python executable/); assert.match(errors,/Unsafe relative/);
  assert.throws(()=>resolveScenarioFile(f.directory,'C:/outside.py'));
  assert.throws(()=>resolveScenarioFile(f.directory,'../outside.py'));
});

test('content files must reference actual raw imports with Python executable roles', t => {
  const f=fixture(t);
  assert.deepEqual(validateScenarioContent(f.content,{directory:f.directory}),[]);
  assert.match(validateScenarioContent(f.content.replace('source:f0',"source:'copied snippet'"),{directory:f.directory}).join('\n'),/actual file/);
  assert.match(validateScenarioContent(f.content.replace("language:\"python\"","language:\"text\""),{directory:f.directory}).join('\n'),/must be Python/);
  assert.match(validateScenarioContent('export const content = null;',{directory:f.directory}).join('\n'),/literal content object/);
});

test('published scenario is blocked by absent, stale, or incomplete recorded narration', async t => {
  const f=fixture(t); f.scenario.status='published'; f.scenario.added='2026-10-17'; f.scenario.listenMinutes=1;
  let result=await checkEngineering({root:f.root,scenarios:[f.scenario]}); assert.ok(result.errors.length);
  const {manifest}=installSyntheticAudio(f);
  result=await checkEngineering({root:f.root,scenarios:[f.scenario]}); assert.deepEqual(result.errors,[]);
  manifest.tracks.algieba.voice_id='wrong'; f.write(f.paths.manifest,JSON.stringify(manifest));
  result=await checkEngineering({root:f.root,scenarios:[f.scenario]}); assert.ok(result.errors.length);
  installSyntheticAudio(f);
  f.write(f.paths.narration,`export const narration = ${JSON.stringify(f.narration.map((n,i)=>i ? n : {...n,text:'Changed canonical prose.'}))};`);
  result=await checkEngineering({root:f.root,scenarios:[f.scenario]}); assert.match(result.errors.join('\n'),/does not match the current source/i);
});

test('receipt inventory must bind both voices to the current release', async t => {
  const f=fixture(t); f.scenario.status='published'; f.scenario.added='2026-10-17'; f.scenario.listenMinutes=1;
  const {receipt}=installSyntheticAudio(f); receipt.objects[0].sha256='0'.repeat(64); f.write(f.paths.receipt,JSON.stringify(receipt));
  const result=await checkEngineering({root:f.root,scenarios:[f.scenario]}); assert.match(result.errors.join('\n'),/receipt does not match/);
});

test('scenario narration sections preserve order while legacy hashes remain current', async () => {
  const segments=buildPuzzleNarrationSegments({slug:'section-probe',narration:ENGINEERING_SECTIONS.map(section=>({section,text:`Fixture ${section}.`}))});
  assert.deepEqual(segments.slice(1).map(s=>s.id.split('-').at(-1)),ENGINEERING_SECTIONS);
  const manifest=JSON.parse(fs.readFileSync(new URL('../src/data/narration/kalman-covariance-correction.json',import.meta.url),'utf8'));
  assert.equal((await buildPlanForSlug('kalman-covariance-correction')).sourceHash,manifest.source_sha256);
});

test('entry scaffold includes real page/audio wiring and never overwrites authored files', t => {
  const f=fixture(t); const files=scenarioEntrySources(f.scenario);
  assert.match(files[f.paths.main],/ScenarioPage scenario=\{scenario\} content=\{content\} narrationPlayer=\{narrationPlayer\}/);
  assert.match(files[f.paths.main],/if \(manifestProblem\) throw/);
  assert.match(files[f.paths.html],/https:\/\/algonow.net\/scenarios\/contract-probe\//);
  assert.throws(()=>scaffoldEngineeringEntry(f.scenario,{root:f.root}),/Refusing to overwrite/);
});
