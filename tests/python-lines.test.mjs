import test from 'node:test';
import assert from 'node:assert/strict';
import { pythonLines, tokenizePython } from '../src/lib/pyhl.js';

test('display lines preserve source, blank lines, tabs and trailing whitespace', () => {
  for (const newline of ['\n', '\r\n', '\r']) {
    const source = ['def example():', '\tvalue = "<&>"  ', '', '    return value', '', ''].join(newline);
    const lines = pythonLines(source);
    assert.equal(lines.flatMap((line) => line.tokens).map((token) => token.s).join(''), source);
    assert.equal(lines.length, 5);
    assert.equal(lines[1].indent, 4);
    assert.equal(lines[2].indent, 0);
    assert.equal(lines[3].indent, 4);
  }
  assert.deepEqual(pythonLines(''), [{ tokens: [], indent: 0 }]);
  assert.equal(pythonLines(' \t  value = 1')[0].indent, 6);
});

test('splitting highlighted lines preserves multiline strings and every token character', () => {
  const source = 'message = """first\n    class is still string content\nlast"""\n# comment\nreturn message';
  const expand = (tokens) => tokens.flatMap(({ t, s }) => [...s].map((char) => [t, char]));
  const lines = pythonLines(source);
  assert.deepEqual(expand(lines.flatMap((line) => line.tokens)), expand(tokenizePython(source)));
  assert.ok(lines[1].tokens.every((token) => token.t === 'str'));
});

test('Windows line endings after comments count as one source line', () => {
  for (const comment of ['# comment', 'value = 1  # inline comment']) {
    const source = `${comment}\r\nprint(1)\r\n`;
    const lines = pythonLines(source);
    assert.equal(lines.length, 2);
    assert.equal(lines.map((line) => line.tokens.map((token) => token.s).join('')).join(''), source);
    assert.equal(lines[0].tokens.at(-1).s, '\r\n');
  }
});
