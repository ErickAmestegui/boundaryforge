import { CreateosSandboxClient } from '@nodeops-createos/sandbox';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { config } from './config.mjs';

export async function connectSandbox() {
  const cfg = config();
  let auth;
  if (cfg.sandboxKey) auth = { apiKey: cfg.sandboxKey };
  else {
    const oauth = JSON.parse(await readFile(join(homedir(), '.createos', '.oauth'), 'utf8'));
    if (!oauth.access_token) throw new Error('CreateOS CLI authentication is missing.');
    auth = { authHeaders: { 'X-Access-Token': oauth.access_token } };
  }
  const client = new CreateosSandboxClient({ ...auth, timeoutMs: 45000, retry: { maxRetries: 1 } });
  const sandbox = await client.getSandbox(cfg.sandboxId);
  return sandbox;
}
