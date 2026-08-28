import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import {
  PUZZLES,
  SOCIAL_CARD,
  VITE_ENTRIES,
  SITE_HOST,
  SITE_NAME,
} from './src/data/puzzles.js';

// The sitemap is owned by scripts/prerender.mjs, which emits a chunked
// sitemapindex over the full data surface AFTER the Vite build. An earlier
// in-build generator lived here and was dead code with a live failure mode:
// its ~10-URL urlset was overwritten on every normal build, but any
// vite-build-only deploy would have silently shipped it as the whole sitemap.

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
        // The capture must run to the MATCHING quote, not the first quote of
        // either kind: with the old [^"'] class, an apostrophe inside a
        // double-quoted description ("Dijkstra's...") truncated og:description,
        // twitter:description, and the JSON-LD on every page that shipped one.
        const descMatch = html.match(
          /<meta\s+name=["']description["']\s+content=(["'])(.*?)\1/i
        );
        if (!titleMatch || !descMatch) return html;

        const rawPath = (ctx.path || '/').split('?')[0].split('#')[0];
        const path = rawPath.endsWith('/index.html')
          ? rawPath.slice(0, -'index.html'.length)
          : rawPath;
        const url = `${SITE_HOST}${path}`;
        const title = escapeAttr(titleMatch[1]);
        const desc = escapeAttr(descMatch[2]);

        const puzzle = PUZZLES[path];
        const jsonLd = puzzle
          ? {
              '@context': 'https://schema.org',
              '@type': 'LearningResource',
              url,
              name: titleMatch[1],
              description: descMatch[2],
              learningResourceType: 'lesson',
              educationalLevel: 'intermediate',
              teaches: [puzzle.algorithm, puzzle.heuristic, puzzle.domain],
              programmingLanguage: 'Python',
              isAccessibleForFree: true,
              image: SOCIAL_CARD.url,
            }
          : path === '/'
            ? {
                '@context': 'https://schema.org',
                '@type': 'WebSite',
                name: SITE_NAME,
                url: SITE_HOST,
                description: descMatch[2],
                image: SOCIAL_CARD.url,
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
    <meta property="og:image" content="${SOCIAL_CARD.url}" />
    <meta property="og:image:secure_url" content="${SOCIAL_CARD.url}" />
    <meta property="og:image:type" content="${SOCIAL_CARD.type}" />
    <meta property="og:image:width" content="${SOCIAL_CARD.width}" />
    <meta property="og:image:height" content="${SOCIAL_CARD.height}" />
    <meta property="og:image:alt" content="${SOCIAL_CARD.alt}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${desc}" />
    <meta name="twitter:image" content="${SOCIAL_CARD.url}" />
    <meta name="twitter:image:alt" content="${SOCIAL_CARD.alt}" />
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
  plugins: [react(), seoChromePlugin()],
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
