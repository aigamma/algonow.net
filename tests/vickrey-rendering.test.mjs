import test from 'node:test';
import assert from 'node:assert/strict';
import { auditCanvasCallbacks } from '../scripts/unit-tooling/audit_canvas_callbacks.mjs';

test('Vickrey payoff drawing preserves losses from overbidding and gains from winning', async () => {
  const report = await auditCanvasCallbacks({
    paths: ['src/viz/VickreyViz.jsx'], cycles: 1, quiet: true,
    output: 'build/test-vickrey-payoff-render.json',
    onCycle({ model, state, context }) {
      for (const value of [0.2, 0.8]) {
        const rival = 0.5;
        Object.assign(state.scene, {
          t: 1, probe: 0, values: [value, rival, 0.1], probeM: rival,
          probeCurve: Array.from({ length: 41 }, (_, i) => i / 40 > rival ? value - rival : 0),
        });
        const paths = [];
        let path;
        context.beginPath = () => { path = []; };
        context.moveTo = (x, y) => path.push([x, y]);
        context.lineTo = (x, y) => path.push([x, y]);
        context.stroke = () => paths.push(path);
        model.draw(context, state, model.width, model.height);
        const payoff = paths.find((p) => p.length === 41 && p[0][0] === 30 && p.at(-1)[0] === 300);
        assert.ok(payoff, 'the actual draw callback paints the complete payoff curve');
        const zeroY = payoff[0][1];
        assert.ok(paths.some((p) => p.length === 2 && p[0][0] === 30 && p[1][0] === 300
          && p.every((point) => point[1] === zeroY)), 'payoffs have a visible zero baseline');
        assert.ok(value < rival ? payoff.at(-1)[1] > zeroY : payoff.at(-1)[1] < zeroY,
          'negative utility is below zero and positive utility is above zero');
        assert.ok(payoff.every(([, y]) => y > 224 && y < model.height - 24),
          'the payoff curve stays between its heading and footer');
      }
    },
  });
  assert.equal(report.summary.failedVisualizations, 0, JSON.stringify(report.visualizations));
});
