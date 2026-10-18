import { readFileSync, existsSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { resolve } from 'node:path';

export const ROOT = resolve(import.meta.dirname, '..');
export function config() {
  const file = resolve(ROOT, '.env.local');
  const local = existsSync(file) ? parseEnv(readFileSync(file, 'utf8')) : {};
  const env = { ...process.env, ...local };
  return {
    geminiKey: env.GEMINI_API_KEY || '',
    model: env.GEMINI_MODEL || 'gemini-3.8-flash',
    sandboxId: env.CREATEOS_SANDBOX_ID || 'sb-01m55s5541nepbqr81ycktv24j',
    sandboxKey: env.CREATEOS_SANDBOX_API_KEY || '',
    port: Number(env.PORT || 4317),
  };
}
export function safeError(error) {
  let message = String(error?.message || error).slice(0, 2000);
  for (const secret of [config().geminiKey, config().sandboxKey]) {
    if (secret) message = message.split(secret).join('[REDACTED]');
  }
  return message.replace(/AIza[\w-]+/g, '[REDACTED]').replace(/Bearer\s+[\w.\-]+/gi, 'Bearer [REDACTED]');
}
