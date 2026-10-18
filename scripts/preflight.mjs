import { GoogleGenAI } from '@google/genai';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { config, ROOT, safeError } from '../src/config.mjs';
import { connectSandbox } from '../src/createos.mjs';

const cfg = config();
const status = { timestamp: new Date().toISOString(), gemini: {}, createos: {} };
try {
  const sb = await connectSandbox();
  const result = await sb.runCommand('node', ['--version']);
  const egress = await sb.getEgress();
  status.createos = { connected: true, id: cfg.sandboxId, runtime: result, egress };
} catch (e) { status.createos = { connected: false, error: safeError(e) }; }
if (!cfg.geminiKey) {
  status.gemini = { connected: false, error: 'Set GEMINI_API_KEY privately in .env.local.' };
} else {
  try {
    const ai = new GoogleGenAI({ apiKey: cfg.geminiKey, httpOptions: { timeout: 30000 } });
    const response = await ai.models.generateContent({
      model: cfg.model,
      contents: 'Return JSON with action="write_file", path="sample.ts", code containing a one-line TypeScript function that adds two numbers. No markdown.',
      config: { responseMimeType: 'application/json', maxOutputTokens: 256, thinkingConfig: { thinkingLevel: 'LOW' } },
    });
    const action = JSON.parse(response.text);
    if (action.action !== 'write_file' || action.path !== 'sample.ts' || typeof action.code !== 'string' || !action.code.includes('return')) throw new Error('Invalid generated tool-action protocol.');
    status.gemini = { connected: true, model: cfg.model, action, usage: response.usageMetadata, responseId: response.responseId, billing: 'Public free tier documented; account billing state is not exposed by inference API.' };
  } catch (e) { status.gemini = { connected: false, model: cfg.model, error: safeError(e) }; }
}
await mkdir(join(ROOT, 'runs'), { recursive: true });
await writeFile(join(ROOT, 'runs', 'preflight.json'), JSON.stringify(status, null, 2));
console.log(JSON.stringify(status, null, 2));
if (!status.gemini.connected || !status.createos.connected) process.exitCode = 1;
