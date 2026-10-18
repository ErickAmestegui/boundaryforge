import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT, config } from './config.mjs';
import { connectSandbox } from './createos.mjs';
import { createHash } from 'node:crypto';

export const sha256 = (text) => createHash('sha256').update(text).digest('hex');
const FIXTURE_FILES = ['readFileTool.ts', 'baseline.test.ts', 'regression.test.ts', 'witness.mjs', 'documents/public/welcome.txt', 'documents/public/manual.txt', 'documents/private/CANARY.txt'];
export class SandboxRunner {
  constructor(runId, record = () => {}) {
    if (!/^[a-f0-9-]{36}$/.test(runId)) throw new Error('Invalid run ID');
    this.runId = runId;
    this.remote = `/tmp/boundaryforge/${runId}`;
    this.record = record;
  }
  async connect() {
    this.sandbox = await connectSandbox();
    const info = this.sandbox.data;
    if (info.ingress_enabled !== false) throw new Error('Sandbox public ingress must be explicitly disabled.');
    await this.sandbox.setEgress(['127.0.0.1']);
    const egress = await this.sandbox.getEgress();
    if (JSON.stringify(egress.egress) !== JSON.stringify(['127.0.0.1'])) throw new Error('Egress restriction not confirmed.');
    const probe = await this.sandbox.runCommand('python3', ['-c', 'import socket,json; s=socket.socket(); s.settimeout(2)\ntry:\n s.connect(("1.1.1.1",443)); print(json.dumps({"blocked":False}))\nexcept OSError as e:\n print(json.dumps({"blocked":True,"error":str(e)}))\nfinally:\n s.close()'], { timeoutMs: 10000 });
    if (probe.result.exit_code !== 0 || !JSON.parse(probe.result.stdout).blocked) throw new Error('Egress probe did not confirm blocked traffic.');
    const isolation = await this.sandbox.runCommand('unshare', ['--net', '--', 'setpriv', '--reuid=65534', '--regid=65534', '--clear-groups', '--bounding-set=-all', '--no-new-privs', 'node', '-e', 'console.log(JSON.stringify({uid:process.getuid(),routes:require("fs").readFileSync("/proc/net/route","utf8")}))']);
    const isolate = JSON.parse(isolation.result.stdout);
    if (isolation.result.exit_code !== 0 || isolate.uid !== 65534 || isolate.routes.trim()) throw new Error('Network namespace or privilege isolation failed.');
    this.safety = { sandboxId: config().sandboxId, egress, egressProbe: probe, namespaceProbe: isolation, checkedAt: new Date().toISOString() };
    await this.sandbox.files.upload(`${this.remote}/supervisor.py`, await readFile(join(ROOT, 'scripts/sandbox-supervisor.py'), 'utf8'));
    for (const file of FIXTURE_FILES) await this.upload(file, await readFile(join(ROOT, 'fixtures/servicedesk', file), 'utf8'));
    return this.safety;
  }
  async upload(file, contents) {
    if (![...FIXTURE_FILES, 'generated-attack.test.ts'].includes(file)) throw new Error('File not allowlisted');
    if (Buffer.byteLength(contents) > 32768) throw new Error('Generated file exceeds 32 KiB');
    await this.sandbox.files.upload(`${this.remote}/${file}`, contents);
  }
  async control(action, extra = {}) {
    const startedAt = new Date().toISOString();
    const result = await this.sandbox.runCommand('python3', [`${this.remote}/supervisor.py`], { stdin: JSON.stringify({ action, runId: this.runId, ...extra }), timeoutMs: 25000, retry: false });
    if (result.result.exit_code !== 0) throw new Error(`Sandbox supervisor failed: ${result.result.stderr.slice(0, 2000)}`);
    const parsed = JSON.parse(result.result.stdout);
    const entry = { ...parsed, startedAt, finishedAt: new Date().toISOString(), providerDurationMs: result.exec_ms, sandboxId: config().sandboxId };
    if (action === 'execute') this.record(entry);
    return entry;
  }
  prepare() { return this.control('prepare'); }
  hashes() { return this.control('hash'); }
  execute(file) { return this.control('execute', { file }); }
}
