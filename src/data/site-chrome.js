// One source of truth for the stable links shared by the React shell and the
// prerendered reference pages. Tones alternate after the green new-puzzle
// status pill so every destination reads as part of one navigation system.
export const HEADER_LINKS = [
  { href: '/#scenarios', label: 'AI scenarios', tone: 'blue' },
  { href: '/#tracks', label: 'practice areas', tone: 'white' },
  { href: '/legacy/', label: 'algo puzzles', tone: 'white' },
];

export const RELATED_LINKS = [
  { href: 'https://aigamma.com/', label: 'Quant' },
  { href: 'https://ai-firehose.com/', label: 'AI news' },
  { href: 'https://worldthought.com/', label: 'Philosophy' },
];

export const CREATOR_LINK = {
  href: 'https://about.aigamma.com/',
  label: 'Created by Eric Allione',
};
