import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Injects the list of built files into dist/sw.js after the build, so the service worker can pre-cache
 * the app shell (hashed JS / CSS chunks, icons, offline page). A hash of the file list + contents becomes the
 * BUILD_ID: every new build produces a new sw.js (so browsers see an update) and a new versioned cache.
 * `api/` (runtime-cached public data), `sw.js` itself and host files are not pre-cached.
 */
function precacheManifest() {
  const EXCLUDE = [/^sw\.js$/, /^api\//, /^_redirects$/, /^404\.html$/, /\.map$/, /^\./];
  let outDir = 'dist';

  function walk(dir) {
    return readdirSync(dir).flatMap((name) => {
      const full = join(dir, name);
      return statSync(full).isDirectory() ? walk(full) : [full];
    });
  }

  return {
    name: 'bookshelf-precache-manifest',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      const files = walk(outDir)
        .map((file) => relative(outDir, file).split(sep).join('/'))
        .filter((file) => !EXCLUDE.some((pattern) => pattern.test(file)))
        .sort();

      const hash = createHash('sha256');
      files.forEach((file) => hash.update(file).update(readFileSync(join(outDir, file))));
      const buildId = hash.digest('hex').slice(0, 10);

      const swPath = join(outDir, 'sw.js');
      const source = readFileSync(swPath, 'utf8')
        .replace("const BUILD_ID = '__BUILD_ID__'", `const BUILD_ID = '${buildId}'`)
        .replace('/*__PRECACHE_MANIFEST__*/ []', JSON.stringify(files));
      writeFileSync(swPath, source);
      console.log(`\n[pwa] sw.js: ${files.length} files pre-cached, build ${buildId}`);
    },
  };
}

// BrowserRouter needs absolute asset paths so that deep links like /books/5 load the JS and CSS correctly.
//  - Vercel / Netlify / local dev: served from the domain root → base "/" (default).
//  - GitHub Pages: served from /<repo>/ → the workflow sets VITE_BASE=/<repo>/ for the build.
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react(), precacheManifest()],
});
