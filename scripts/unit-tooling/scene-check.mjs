// Drive an exported visualization model, including the completing tick.
export function checkSceneModel(model, { seed, sceneArgs = [], maxTicks = 50_000 } = {}) {
  if (typeof model.makeScene !== 'function' || typeof model.sceneTick !== 'function') {
    throw new Error('The model must export makeScene and sceneTick');
  }
  if (!Number.isSafeInteger(maxTicks) || maxTicks < 1) {
    throw new Error('maxTicks must be a positive integer');
  }
  const scene = model.makeScene(seed, ...sceneArgs);
  let invariantBreaks = 0;
  let invariantObserved = false;
  let firstBrokenTick = null;
  function inspect(tick) {
    if (typeof scene.ok === 'boolean') invariantObserved = true;
    if (scene.ok === false) {
      invariantBreaks += 1;
      firstBrokenTick ??= tick;
    }
  }
  inspect(0);
  for (let ticks = 1; ticks <= maxTicks; ticks += 1) {
    const done = Boolean(model.sceneTick(scene));
    inspect(ticks);
    if (done) {
      const terminalCheck = typeof model.isCorrect === 'function' ? model.isCorrect(scene) : null;
      if (terminalCheck === false) {
        invariantBreaks += 1;
        firstBrokenTick ??= ticks;
      }
      return {
        seed, sceneArgs, ticks, invariantObserved, invariantBreaks, firstBrokenTick,
        terminalOk: typeof scene.ok === 'boolean' ? scene.ok : null,
        terminalCheck,
        last: scene.last ?? null,
        ...(typeof model.summarize === 'function' ? { summary: model.summarize(scene) } : {}),
      };
    }
  }
  throw new Error(`Scene did not finish within ${maxTicks} ticks (seed ${seed})`);
}

// These arguments match the alternate scenes wired by their page components.
// Do not call required multi-argument initializers with undefined parameters.
export function sceneArgumentVariants(vizPath) {
  const name = vizPath.split(/[\\/]/).pop();
  const variants = {
    'CgViz.jsx': [[false], [true]],
    'GaussianViz.jsx': [[0.0001], [0]],
    'GroverViz.jsx': [[1], [2]],
    'ScanViz.jsx': [['blelloch'], ['hillis']],
  };
  return variants[name] || [[]];
}
