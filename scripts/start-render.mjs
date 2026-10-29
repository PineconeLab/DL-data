import { cpSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const standalone = resolve(root, '.next/standalone');
if (!existsSync(resolve(standalone, 'server.js'))) {
  throw new Error('Standalone build missing. Run npm run build first.');
}
// Next.js deliberately leaves public and static assets out of standalone output.
for (const [source, target] of [['.next/static', '.next/static'], ['public', 'public']]) {
  if (existsSync(resolve(root, source))) {
    cpSync(resolve(root, source), resolve(standalone, target), { recursive: true });
  }
}
process.env.HOSTNAME = process.env.APP_BIND_HOST || '0.0.0.0';
process.env.PORT ||= '3000';
process.env.NODE_ENV = 'production';
await import(pathToFileURL(resolve(standalone, 'server.js')).href);
