// One source of truth for the stable links shared by the React shell and the
// prerendered reference pages. Tones alternate after the green new-puzzle
// status pill so every destination reads as part of one navigation system.
export const HEADER_LINKS = [
  { href: '/#pairs', label: 'pairs', tone: 'blue' },
  { href: '/atlas/', label: 'atlas', tone: 'white' },
  { href: '/problem/', label: 'problems', tone: 'blue' },
  { href: '/category/', label: 'fields', tone: 'white' },
  { href: '/#listen', label: 'listen', tone: 'blue' },
  { href: 'https://aigamma.com/', label: 'quant', tone: 'white' },
  { href: 'https://ai-firehose.com/', label: 'AI', tone: 'blue' },
  { href: 'https://worldthought.com/', label: 'philosophy', tone: 'white' },
];

export const CREATOR_LINK = {
  href: 'https://about.aigamma.com/',
  label: 'Created by Eric Allione',
};
