import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { config, ROOT, safeError } from './config.mjs';
import { zipSync, strToU8 } from 'fflate';

const token = randomBytes(32).toString('hex');
const subscribers = new Map();
let latest = null;
let engine = null;
const publicFiles = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/styles.css': ['styles.css', 'text/css'], '/favicon.svg': ['favicon.svg', 'image/svg+xml'] };
async function optionalJson(file) { try { return JSON.parse(await readFile(join(ROOT, file), 'utf8')); } catch { return null; } }
async function getLatest() {
  if (latest) return latest;
  const folders = await readdir(join(ROOT, 'runs'), { withFileTypes: true }).catch(() => []);
  const reports = (await Promise.all(folders.filter(f => f.isDirectory() && /^[a-f0-9-]{36}$/.test(f.name)).map(f => optionalJson(`runs/${f.name}/report.json`)))).filter(Boolean);
  reports.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  latest = reports[0] || null;
  if (latest) latest.evidenceReady = true;
  return latest;
}
function send(res, status, data) { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); }
export function publish(type, run, event) {
  latest = run;
  for (const res of subscribers.get(run.id) || []) res.write(`event: ${type}\ndata: ${JSON.stringify(type === 'progress' ? { run, event } : run)}\n\n`);
}
const server = createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
  try {
    const port = config().port;
    const hosts = [`127.0.0.1:${port}`, `localhost:${port}`];
    if (!hosts.includes(req.headers.host)) return send(res, 403, { error: 'Invalid host' });
    if (req.headers.origin && !hosts.some(h => req.headers.origin === `http://${h}`)) return send(res, 403, { error: 'Invalid origin' });
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    if (req.method === 'GET' && ['/api/baseline', '/api/baseline/evidence.zip'].includes(url.pathname)) {
      const baseline = await optionalJson('runs/baseline.json') || await optionalJson('evidence/recorded-createos-baseline.json');
      if (!baseline?.passed) return send(res, 404, { error: 'No recorded successful baseline' });
      if (url.pathname === '/api/baseline') return send(res, 200, baseline);
      const body = zipSync({
        'baseline.json': strToU8(JSON.stringify(baseline, null, 2)),
        'README.txt': strToU8('Historical maintainer-authored CreateOS baseline. See timestamp in baseline.json. Not a new execution, Gemini inference, patch, or Proof of Fix. The witness reproduced a synthetic canary leak. No repair has been verified.\n'),
        'baseline.test.ts': strToU8(await readFile(join(ROOT, 'fixtures/servicedesk/baseline.test.ts'), 'utf8')),
        'witness.mjs': strToU8(await readFile(join(ROOT, 'fixtures/servicedesk/witness.mjs'), 'utf8')),
      });
      res.writeHead(200, { 'Content-Type': 'application/zip', 'Content-Disposition': 'attachment; filename="boundaryforge-recorded-baseline.zip"' });
      return res.end(body);
    }
    if (req.method === 'GET' && publicFiles[url.pathname]) {
      const [file, type] = publicFiles[url.pathname];
      res.writeHead(200, { 'Content-Type': `${type}; charset=utf-8` });
      return res.end(await readFile(join(ROOT, 'public', file)));
    }
    if (req.method === 'GET' && url.pathname === '/api/status') {
      const preflight = await optionalJson('runs/preflight.json');
      const stripe = await optionalJson('runs/stripe-status.json');
      return send(res, 200, { token, gemini: { configured: !!config().geminiKey, connected: preflight?.gemini?.connected === true, model: config().model }, createos: preflight?.createos || { connected: false }, stripe: stripe || { integrated: false, message: 'Blocked: Projects browser approval required. Integration not yet verified.' }, source: await readFile(join(ROOT, 'fixtures/servicedesk/readFileTool.ts'), 'utf8'), latest: await getLatest() });
    }
    if (req.method === 'POST' && url.pathname === '/api/runs') {
      if (req.headers['x-boundaryforge-token'] !== token) return send(res, 403, { error: 'Missing local request token' });
      if (Number(req.headers['content-length'] || 0) > 1024) return send(res, 413, { error: 'Request too large' });
      if (latest?.outcome === 'running') return send(res, 409, { error: 'An audit is already running' });
      const preflight = await optionalJson('runs/preflight.json');
      if (!config().geminiKey || !preflight?.gemini?.connected) return send(res, 409, { error: 'Gemini preflight is required. Save your key privately in .env.local and run npm run preflight.' });
      try { engine ||= await import('./agent.mjs'); } catch { return send(res, 503, { error: 'The autonomous engine is not ready yet.' }); }
      latest = engine.createRun();
      send(res, 202, latest);
      engine.audit(latest, publish).catch(error => { latest.error = safeError(error); latest.outcome = 'failed'; publish('complete', latest); });
      return;
    }
    const match = url.pathname.match(/^\/api\/runs\/([a-f0-9-]{36})\/(events|evidence\.zip)$/);
    if (req.method === 'GET' && match) {
      const [, id, action] = match;
      if (action === 'evidence.zip') {
        const body = await readFile(join(ROOT, 'runs', id, 'evidence.zip'));
        res.writeHead(200, { 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="boundaryforge-${id}.zip"` });
        return res.end(body);
      }
      if (latest?.id !== id) return send(res, 404, { error: 'Unknown active run' });
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
      res.write(`event: snapshot\ndata: ${JSON.stringify(latest)}\n\n`);
      if (latest.outcome !== 'running') { res.write(`event: complete\ndata: ${JSON.stringify(latest)}\n\n`); return res.end(); }
      if (!subscribers.has(id)) subscribers.set(id, new Set());
      subscribers.get(id).add(res);
      const heartbeat = setInterval(() => res.write(': keepalive\n\n'), 15000);
      req.on('close', () => { clearInterval(heartbeat); subscribers.get(id)?.delete(res); });
      return;
    }
    send(res, 404, { error: 'Not found' });
  } catch (error) { if (!res.headersSent) send(res, 500, { error: safeError(error) }); else res.end(); }
});
server.listen(config().port, '127.0.0.1', () => console.log(`BoundaryForge: http://127.0.0.1:${config().port}`));
