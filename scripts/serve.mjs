import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';

const root = path.resolve('dist');
const port = Number(process.env.PORT || 4173);
const types = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };

createServer(async (request, response) => {
  const requestedPath = new URL(request.url, 'http://localhost').pathname;
  let file = path.resolve(root, `.${requestedPath === '/' ? '/index.html' : requestedPath}`);
  if (!file.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403).end('Forbidden');
    return;
  }
  try {
    if (!(await stat(file)).isFile()) throw new Error('not a file');
  } catch {
    file = path.join(root, 'index.html');
  }
  response.setHeader('Content-Type', `${types[path.extname(file)] || 'application/octet-stream'}; charset=utf-8`);
  createReadStream(file).pipe(response);
}).listen(port, '127.0.0.1', () => console.log(`Previewing Lingua Live at http://127.0.0.1:${port}`));
