"""Merge the third-wave fork records (186 to 190) into docs/pending-registry.json.
Usage: python merge_wave3.py [num ...]  (default: every record present in queue/)."""
import json
import os
import sys

qd = os.path.join(os.environ['TEMP'], 'claude', 'D--algonow-net', '72804c69-ec72-4da2-b499-7f26b34272d8', 'scratchpad', 'queue')
FILES = {
    186: '186-ski-rental-break-even-deterministic-rule.json',
    187: '187-reaching-definitions-forward-dataflow.json',
    188: '188-two-opt-edge-uncrossing-swaps.json',
    189: '189-vickrey-auction-second-price-rule.json',
    190: '190-connected-component-labeling-two-pass-union-find.json',
    192: '192-random-search-uniform-hyperparameter-sampling.json',
    194: '194-set-associative-cache-index-tag-lookup.json',
    195: '195-shannon-entropy-estimation-maximum-likelihood-plug-in.json',
    191: '191-perlin-noise-gradient-lattice-interpolation.json',
    193: '193-distance-vector-routing-bellman-ford-exchange.json',
    196: '196-blast-seed-and-extend-word-matches.json',
    197: '197-gaussian-process-regression-rbf-kernel.json',
    198: '198-fruchterman-reingold-force-directed-placement.json',
    199: '199-sharding-hash-partitioning.json',
    200: '200-template-matching-normalized-cross-correlation.json',
    201: '201-importance-sampling-variance-reducing-proposal.json',
}
NOTE = " Authored by a fork agent of this Fable 5.1 session at the owner's explicit request for parallel authoring; the main thread re-ran the solution, the viz check, the narration plan, and the static checks before accepting it."
want = [int(a) for a in sys.argv[1:]] or list(FILES)
p = 'docs/pending-registry.json'
d = json.load(open(p, encoding='utf8'))
have = {u['number'] for u in d['units']}
for num in want:
    fname = FILES[num]
    fp = os.path.join(qd, fname)
    if not os.path.exists(fp):
        print('missing record', fname)
        continue
    q = json.load(open(fp, encoding='utf8'))
    assert q['number'] == num and q['plan_row_id'] == f'F{num - 6}', (q['number'], q['plan_row_id'])
    for k in ('slug', 'problemSlug', 'category', 'algorithm', 'heuristic', 'domain', 'oneLiner', 'description', 'listenMinutes', 'time', 'space', 'baseline', 'narration_plan', 'plan_row'):
        assert k in q, (num, k)
    assert q['narration_plan']['price_usd'] and len(q['narration_plan']['approval_sha256']) == 64, num
    if len(q['description']) > 380:
        q['description'] = q['description'][:377].rsplit(' ', 1)[0] + '...'
    if 'fork agent' not in q['plan_row']:
        q['plan_row'] = q['plan_row'] + NOTE
    if num not in have:
        d['units'].append(q)
        print('added', num, q['slug'])
    else:
        print('already present', num)
d['units'].sort(key=lambda u: u['number'])
open(p, 'w', encoding='utf8', newline='\n').write(json.dumps(d, indent=1, ensure_ascii=False) + '\n')
print('pending units:', [u['number'] for u in d['units']])
