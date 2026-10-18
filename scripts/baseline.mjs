import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { SandboxRunner } from '../src/runner.mjs';
import { ROOT, safeError } from '../src/config.mjs';
const record = { id: randomUUID(), type: 'maintainer-authored baseline; not Gemini-generated', timestamp: new Date().toISOString() };
try {
  const runner = new SandboxRunner(record.id);
  record.safety = await runner.connect();
  await runner.prepare();
  record.baseline = await runner.execute('baseline.test.ts');
  record.witness = await runner.execute('witness.mjs');
  record.passed = record.baseline.exitCode === 0 && JSON.parse(record.witness.stdout).canaryAccessed === true;
} catch (e) { record.error = safeError(e); record.passed = false; }
await mkdir(join(ROOT, 'runs'), { recursive: true });
await writeFile(join(ROOT, `runs/baseline-${record.id}.json`), JSON.stringify(record, null, 2), { flag: 'wx' });
await writeFile(join(ROOT, 'runs/baseline-latest.json'), JSON.stringify(record, null, 2));
// A failed new attempt must not erase the previous successful real baseline.
if (record.passed) await writeFile(join(ROOT, 'runs/baseline.json'), JSON.stringify(record, null, 2));
console.log(JSON.stringify(record, null, 2));
process.exit(record.passed ? 0 : 1);
