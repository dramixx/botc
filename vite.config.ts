import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import preact from '@preact/preset-vite';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

/** Writes dist/sw.js: precaches every built file so the app works offline. */
function offline(): Plugin {
  let outDir = 'dist';
  return {
    name: 'offline-sw',
    apply: 'build',
    configResolved(c) { outDir = c.build.outDir; },
    closeBundle() {
      const files: string[] = [];
      const walk = (dir: string) => {
        for (const f of readdirSync(dir)) {
          const p = join(dir, f);
          if (statSync(p).isDirectory()) walk(p);
          else if (f !== 'sw.js') files.push(relative(outDir, p).split('\\').join('/'));
        }
      };
      walk(outDir);
      const version = Date.now().toString(36);
      const sw = `// Generated at build time.
const CACHE = 'grimoire-${version}';
const FILES = ${JSON.stringify(['./', ...files.map((f) => `./${f}`)])};
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin || url.pathname.includes('/api/')) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).catch(() => caches.match('./index.html')))
  );
});
`;
      writeFileSync(join(outDir, 'sw.js'), sw);
    },
  };
}

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig({
  base: './',
  // Shown discreetly at the bottom of every screen, to check the iPad really runs the latest build.
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [preact(), offline()],
  build: { target: 'es2020' },
  // The live relay (server/live.mjs), started with `npm run live`.
  server: { proxy: { '/api': 'http://127.0.0.1:8081' } },
  preview: { proxy: { '/api': 'http://127.0.0.1:8081' } },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
