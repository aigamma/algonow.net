import test from 'node:test';
import assert from 'node:assert/strict';
import { createNarrator } from '../src/lib/tts.js';

function speechHarness(t) {
  const utterances = [];
  const timers = new Map();
  const paragraphs = ['First sentence.', 'Second sentence.', 'Third sentence.']
    .map((text) => ({ section: 'puzzle', text }));
  let nextTimer = 0;
  let onCancel = () => {};
  class Utterance {
    constructor(text) {
      this.text = text;
    }
  }
  const originals = new Map(['window', 'SpeechSynthesisUtterance'].map((key) => [
    key, Object.getOwnPropertyDescriptor(globalThis, key),
  ]));
  globalThis.window = {
    speechSynthesis: {
      speak: (utterance) => utterances.push(utterance),
      cancel: () => onCancel(),
    },
    SpeechSynthesisUtterance: Utterance,
  };
  globalThis.SpeechSynthesisUtterance = Utterance;
  t.mock.method(globalThis, 'setTimeout', (callback) => {
    timers.set(++nextTimer, callback);
    return nextTimer;
  });
  t.mock.method(globalThis, 'clearTimeout', (id) => timers.delete(id));
  t.after(() => {
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  const narrator = createNarrator(paragraphs, {});
  return {
    narrator, utterances, timers, paragraphs,
    onCancel(callback) { onCancel = callback; },
  };
}

test('late events from a replaced utterance do not skip the new selection', (t) => {
  const { narrator, utterances, paragraphs } = speechHarness(t);
  narrator.playFrom(0);
  const replaced = utterances[0];
  narrator.playFrom(1);
  replaced.onend();
  replaced.onerror();
  assert.equal(utterances.length, 2, 'stale events must not queue more speech');
  assert.equal(narrator.charsSpoken(), paragraphs[0].text.length);
  utterances[1].onend();
  assert.equal(utterances[2].text, paragraphs[2].text);
});

test('an event from canceled speech stays stale after pause and resume', (t) => {
  const { narrator, utterances } = speechHarness(t);
  narrator.playFrom(0);
  const canceled = utterances[0];
  narrator.pause();
  narrator.resume();
  canceled.onerror();
  assert.equal(utterances.length, 2);
  assert.equal(narrator.charsSpoken(), 0);
  utterances[1].onend();
  assert.equal(utterances.length, 3);
});

test('watchdog recovery and a late end event advance a chunk only once', (t) => {
  const { narrator, utterances, timers, paragraphs } = speechHarness(t);
  narrator.playFrom(0);
  const stalled = utterances[0];
  const watchdog = [...timers.values()][0];
  watchdog();
  stalled.onend();
  assert.equal(utterances.length, 2);
  assert.equal(narrator.charsSpoken(), paragraphs[0].text.length);
  assert.equal(timers.size, 1, 'the next chunk keeps its own watchdog');
});

test('a synchronous cancellation event cannot reenter playFrom', (t) => {
  const harness = speechHarness(t);
  const { narrator, utterances, paragraphs } = harness;
  narrator.playFrom(0);
  const canceled = utterances[0];
  harness.onCancel(() => canceled.onerror());
  narrator.playFrom(1);
  assert.equal(utterances.length, 2);
  assert.equal(utterances[1].text, paragraphs[1].text);
  assert.equal(narrator.charsSpoken(), paragraphs[0].text.length);
});
