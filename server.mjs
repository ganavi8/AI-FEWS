import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)));
const port = Number(process.env.PORT || 3000);
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    response.writeHead(400).end('Bad request');
    return;
  }

  if (pathname === '/health') {
    response.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' }).end('ok');
    return;
  }

  if (pathname === '/' || pathname === '/location' || pathname === '/location/') pathname = '/index.html';
  if (pathname === '/manus-routes.json') pathname = '/public/manus-routes.json';

  const filePath = resolve(root, `.${pathname}`);
  if (filePath !== root && !filePath.startsWith(root + sep)) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  try {
    const data = await readFile(filePath);
    response.writeHead(200, {
      'content-type': contentTypes[extname(filePath)] || 'application/octet-stream',
      'cache-control': 'no-cache',
      'x-content-type-options': 'nosniff',
    });
    response.end(data);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' }).end('Not found');
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`AI·FEWS preview server listening on 0.0.0.0:${port}`);
});
