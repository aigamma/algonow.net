import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { PUZZLES, VITE_ENTRIES, SITE_HOST, SITE_NAME } from './src/data/puzzles.js';

// Emit dist/sitemap.xml at build time from the canonical registry, so a pair
// added to puzzles.js becomes search-discoverable on the next deploy without
// a parallel sitemap edit.
function sitemapPlugin() {
  return {
    name: 'sitemap-generator',
    apply: 'build',
    generateBundle() {
      const urls = ['/', ...Object.keys(PUZZLES)].map((p) => `${SITE_HOST}${p}`);
      const xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...urls.map((url) => `  <url><loc>${url}</loc></url>`),
        '</urlset>',
        '',
      ].join('\n');
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: xml });
    },
  };
}

// Promote each entry HTML's <title> + <meta name="description"> into canonical
// link, Open Graph / Twitter tags, and JSON-LD. Puzzle pages emit a
// LearningResource (teaches the pair, programmingLanguage Python); the
// homepage emits WebSite.
function seoChromePlugin() {
  return {
    name: 'seo-chrome',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const titleMatch = html.match(/<title>([^<]+)<\/title>/);
        const descMatch = html.match(
          /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i
        );
        if (!titleMatch || !descMatch) return html;

        const rawPath = (ctx.path || '/').split('?')[0].split('#')[0];
        const path = rawPath.endsWith('/index.html')
          ? rawPath.slice(0, -'index.html'.length)
          : rawPath;
        const url = `${SITE_HOST}${path}`;
        const title = escapeAttr(titleMatch[1]);
        const desc = escapeAttr(descMatch[1]);

        const puzzle = PUZZLES[path];
        const jsonLd = puzzle
          ? {
              '@context': 'https://schema.org',
              '@type': 'LearningResource',
              url,
              name: titleMatch[1],
              description: descMatch[1],
              learningResourceType: 'lesson',
              educationalLevel: 'intermediate',
              teaches: [puzzle.algorithm, puzzle.heuristic, puzzle.domain],
              programmingLanguage: 'Python',
              isAccessibleForFree: true,
            }
          : path === '/'
            ? {
                '@context': 'https://schema.org',
                '@type': 'WebSite',
                name: SITE_NAME,
                url: SITE_HOST,
                description: descMatch[1],
              }
            : null;
        const jsonLdTag = jsonLd
          ? `    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>\n`
          : '';

        const inject = `    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="canonical" href="${url}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:url" content="${url}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${desc}" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${desc}" />
    <meta name="theme-color" content="#0a0d13" />
${jsonLdTag}`;

        return html.replace('</head>', `${inject}  </head>`);
      },
    },
  };
}

function escapeAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Multi-page build: one entry per pair plus the homepage. The input map is
// derived from the registry; adding a page never edits this file.
export default defineConfig({
  plugins: [react(), sitemapPlugin(), seoChromePlugin()],
  build: {
    rollupOptions: {
      input: Object.fromEntries(
        Object.entries(VITE_ENTRIES).map(([entry, html]) => [
          entry,
          fileURLToPath(new URL(`./${html}`, import.meta.url)),
        ])
      ),
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom/')) return 'vendor';
          if (id.includes('node_modules/react/')) return 'vendor';
          if (id.includes('node_modules/scheduler/')) return 'vendor';
          return undefined;
        },
      },
    },
  },
});
