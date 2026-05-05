// Post-build script: copies Next.js static export to ../webroot and gzip-compresses
// text assets so they fit in the ESP32's LittleFS partition.
// ESPAsyncWebServer automatically serves .gz files when the browser accepts gzip.

import { cpSync, rmSync, readdirSync, statSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join, extname } from 'path';
import { gzipSync } from 'zlib';

const OUT = 'out';
const WEBROOT = '../webroot';

// Extensions worth gzip-compressing (text-based formats).
const GZIP_EXTS = new Set(['.js', '.css', '.html', '.svg', '.json', '.txt', '.xml']);

// Files / patterns that are never needed on the ESP.
const REMOVE_PATTERNS = [/^placeholder/i, /\.txt$/];

function shouldRemove(name) {
  return REMOVE_PATTERNS.some((p) => p.test(name));
}

function walkDir(dir, callback) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(full, callback);
    } else {
      callback(full);
    }
  }
}

// 1. Copy build output to webroot
rmSync(WEBROOT, { recursive: true, force: true });
cpSync(OUT, WEBROOT, { recursive: true });

// 2. Remove unnecessary files from webroot root
for (const entry of readdirSync(WEBROOT)) {
  if (shouldRemove(entry)) {
    rmSync(join(WEBROOT, entry), { force: true });
  }
}

// 3. Gzip compressible files and remove originals
let saved = 0;
walkDir(WEBROOT, (filePath) => {
  const ext = extname(filePath).toLowerCase();
  if (GZIP_EXTS.has(ext)) {
    const raw = readFileSync(filePath);
    const compressed = gzipSync(raw, { level: 9 });
    writeFileSync(filePath + '.gz', compressed);
    unlinkSync(filePath);
    saved += raw.length - compressed.length;
  }
});

console.log(`postbuild: saved ~${(saved / 1024).toFixed(0)} KB via gzip`);
