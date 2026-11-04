/**
 * Serves the exported web app (`npx expo export --platform web`) as a host
 * would: a file if there is one, otherwise index.html, so a deep link or a
 * reload inside the app opens it. Any real host needs the same rewrite.
 *
 *   node e2e/serve-web.mjs        on :8081
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const ROOT = new URL('../dist/', import.meta.url).pathname;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ttf': 'font/ttf',
};

createServer((request, response) => {
  const path = normalize(decodeURIComponent(new URL(request.url, 'http://x').pathname));
  const wanted = join(ROOT, path);
  const file = wanted.startsWith(ROOT) && existsSync(wanted) && statSync(wanted).isFile() ? wanted : join(ROOT, 'index.html');
  response.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(response);
}).listen(Number(process.env.PORT ?? 8081));
