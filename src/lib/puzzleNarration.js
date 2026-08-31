export const PUZZLE_NARRATION_SCHEMA_VERSION = 1;

export const AI_NARRATION_DISCLOSURE =
  'This is an AI-generated narration of the authored lesson on this page. The executable source code is intentionally omitted.';

export const PUZZLE_NARRATION_EXCLUDED_FIELDS = Object.freeze([
  'content.code',
  'solution source',
  'inline literal code tokens',
  'rendered code editor payloads',
  'copy controls',
  'language badges',
  'line numbers',
  'output consoles',
  'syntax highlighting labels',
  'navigation',
  'player controls',
]);

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const SECTION_LABELS = Object.freeze({
  puzzle: 'The Puzzle',
  origins: 'Origins',
  pair: 'The Pair',
  picture: 'Picture It',
  run: 'Run It',
  signals: 'Signals',
  tradeoffs: 'Tradeoffs and Rivals',
  code: 'Code Walkthrough',
});

function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

export function normalizePuzzleNarrationText(value) {
  return decodeHtmlEntities(value)
    .replace(/\r\n?/g, '\n')
    .replace(/\u2014/g, ', ')
    .replace(/\u2013/g, ' to ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function excludedFields() {
  return [...PUZZLE_NARRATION_EXCLUDED_FIELDS];
}

export function buildPuzzleNarrationSegments({ slug, narration } = {}) {
  if (!SLUG_PATTERN.test(slug || '')) {
    throw new Error('Puzzle slug must contain only lowercase letters, numbers, and single hyphens');
  }
  if (!Array.isArray(narration) || narration.length === 0) {
    throw new Error(`${slug}: canonical narration must be a nonempty array`);
  }

  const segments = [{
    id: `${slug}.00-disclosure`,
    label: 'AI Narration Disclosure',
    source_fields: [],
    excluded_fields: excludedFields(),
    text: AI_NARRATION_DISCLOSURE,
  }];

  narration.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(`${slug}: narration entry ${index} must be an object`);
    }
    if (!Object.hasOwn(SECTION_LABELS, entry.section)) {
      throw new Error(`${slug}: narration entry ${index} has an unsupported section`);
    }
    if (typeof entry.text !== 'string') {
      throw new Error(`${slug}: narration entry ${index} text must be a string`);
    }

    const text = normalizePuzzleNarrationText(entry.text);
    if (!text) return;
    segments.push({
      id: `${slug}.${String(index + 1).padStart(2, '0')}-${entry.section}`,
      label: SECTION_LABELS[entry.section],
      source_fields: [
        `narration[${index}].section`,
        `narration[${index}].text`,
      ],
      excluded_fields: excludedFields(),
      text,
    });
  });

  if (segments.length === 1) {
    throw new Error(`${slug}: canonical narration contains no spoken text`);
  }
  return segments;
}

export function buildPuzzleNarrationText(puzzle) {
  return buildPuzzleNarrationSegments(puzzle)
    .map((segment) => segment.text)
    .join('\n\n');
}
