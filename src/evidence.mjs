import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { zipSync, strToU8 } from 'fflate';
import { sha256 } from './runner.mjs';
import { ROOT } from './config.mjs';

export async function writeEvidence(run) {
  const directory = join(ROOT, 'runs', run.id);
  await mkdir(directory, { recursive: true });
  const report = { schemaVersion: 1, ...run, limitations: [
    'One synthetic file-reading tool; not a general security certification.',
    'Evidence is recorded by a trusted local backend, not a cryptographic remote attestation.',
    'The operator and CreateOS control plane remain trusted. Model code cannot write evidence.',
    'Static source validation is defense in depth. OS isolation and Node permissions remain required.',
    'File-boundary race conditions against a concurrent privileged attacker are outside this fixture.',
    'Stripe Projects integration is reported separately and is not implied by a successful repair.',
  ] };
  const json = value => JSON.stringify(value ?? { status: 'not_executed' }, null, 2);
  const files = {
    'report.json': json(report),
    'report.md': `# BoundaryForge — ${run.outcome === 'verified' ? 'Proof of Fix' : 'Execution Evidence'}\n\nRun: ${run.id}\n\nStatus: **${run.outcome}**\n\nStarted: ${run.startedAt}\n\nFinished: ${run.finishedAt}\n\n## Finding\n\n${run.hypothesis || 'No model-generated finding yet.'}\n\nAffected file: readFileTool.ts\n\n## Integrity\n\nOriginal test SHA-256: ${run.testHash || 'not generated'}\n\nSame test verified: ${run.integrityVerified === true}\n\n## Results\n\nBefore: ${run.beforeClassification || 'not executed'}\n\nAfter: ${run.afterClassification || 'not executed'}\n\nRegression exit code: ${run.regression?.exitCode ?? 'not executed'}\n\nPatch attempts: ${run.attempts?.length || 0}\n\n${run.error ? `Error: ${run.error}\n\n` : ''}## Source diff\n\n\`\`\`diff\n${run.diff || ''}\n\`\`\`\n\n## Limitations\n\n${report.limitations.map(s => '- ' + s).join('\n')}\n`,
    'generated-attack.test.ts': run.testCode || '// No model-generated test was produced.\n',
    'attack-before.json': json(run.before),
    'patch.diff': run.diff || '',
    'attack-after.json': json(run.after),
    'regression-results.json': json(run.regression),
    'execution-log.txt': (run.executions || []).map(e => `${e.startedAt}\n${JSON.stringify(e.command)}\nexit=${e.exitCode}\n${e.stdout}\n${e.stderr}`).join('\n\n'),
    'original-readFileTool.ts': run.originalSource || '',
    'patched-readFileTool.ts': run.patchedSource || '',
  };
  files['integrity.json'] = json({ algorithm: 'SHA-256', originalTestSha256: run.testHash || null, unchangedAcrossExecution: run.integrityVerified === true, files: Object.fromEntries(Object.entries(files).map(([name, data]) => [name, sha256(data)])), note: 'Self-contained hashes detect changes; they are not a signature or external attestation.' });
  for (const [name, data] of Object.entries(files)) await writeFile(join(directory, name), data, { flag: 'wx' });
  const zip = zipSync(Object.fromEntries(Object.entries(files).map(([name, data]) => [name, strToU8(data)])));
  await writeFile(join(directory, 'evidence.zip'), zip, { flag: 'wx' });
  return directory;
}

export async function readRun(id) {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error('Invalid run ID');
  return JSON.parse(await readFile(join(ROOT, 'runs', id, 'report.json'), 'utf8'));
}
