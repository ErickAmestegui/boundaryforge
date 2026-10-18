const $ = id => document.getElementById(id);
let token = '';
let activeRun = null;
let currentTab = 'source';
let source = '';
let stream;
let busy = false;
let recordedBaseline = null;
const views = {
  source: () => ['readFileTool.ts · original fixture', source],
  test: () => ['generated-attack.test.ts', activeRun?.testCode || '// No Gemini-generated test yet.'],
  logs: () => ['execution-log.txt', (activeRun?.executions || []).map(e => `${e.startedAt}\n$ ${e.command.join(' ')}\nexit ${e.exitCode} · ${e.durationMs} ms\n${e.stdout}\n${e.stderr}`).join('\n\n') || (recordedBaseline ? `HISTORICAL CREATEOS BASELINE — ${recordedBaseline.timestamp}\nMaintainer-authored. Not Gemini-generated. No patch verified.\n\n${JSON.stringify(recordedBaseline, null, 2)}` : 'No sandbox commands recorded for this run.')],
  diff: () => ['patch.diff', activeRun?.diff || 'No patch has been generated or applied.'],
  integrity: () => ['integrity.json', JSON.stringify({ runId: activeRun?.id || null, originalTestSHA256: activeRun?.testHash || null, beforeSHA256: activeRun?.before?.testSha256 || null, afterSHA256: activeRun?.after?.testSha256 || null, integrityVerified: activeRun?.integrityVerified || false, outcome: activeRun?.outcome || 'not_started' }, null, 2)],
};
function renderCode() {
  const [filename, code] = views[currentTab]();
  $('filename').textContent = filename;
  $('code').textContent = code;
  document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('selected', b.dataset.tab === currentTab));
}
function setCheck(id, value, pass = false) { $(id).textContent = value; $(id).className = pass ? 'pass' : value === 'FAILED' ? 'fail' : ''; }
function renderRun() {
  if (!activeRun) return;
  $('run-label').textContent = activeRun.outcome === 'running' ? 'RUNNING' : activeRun.outcome.toUpperCase();
  $('hypothesis').textContent = activeRun.hypothesis || 'Inspecting source and preparing the model request…';
  $('test-hash').textContent = `SHA-256 · ${activeRun.testHash || 'pending'}`;
  $('duration').textContent = `${activeRun.executions?.length || 0} executions · run ${activeRun.id.slice(0, 8)}`;
  const exposed = activeRun.beforeClassification === 'vulnerability_confirmed';
  const blocked = activeRun.afterClassification === 'attack_blocked';
  const verified = activeRun.outcome === 'verified';
  $('state-orb').className = `state-orb ${verified ? 'verified' : exposed ? 'exposed' : ''}`;
  $('state-kicker').textContent = verified ? 'PATCH VERIFIED' : exposed ? 'VULNERABILITY REPRODUCED' : 'AUDIT IN PROGRESS';
  $('security-title').textContent = verified ? 'Attack blocked.' : exposed ? 'Canary exposed.' : 'Investigating the boundary';
  $('security-detail').textContent = verified ? 'The same generated attack is blocked. Legitimate document access still works.' : exposed ? 'The independent witness read the synthetic protected canary.' : 'Waiting for executable evidence.';
  setCheck('check-attack', blocked ? 'PASSED' : exposed ? 'EXPOSED' : 'UNTESTED', blocked);
  setCheck('check-hash', activeRun.integrityVerified ? 'MATCHED' : 'UNTESTED', activeRun.integrityVerified);
  setCheck('check-regression', activeRun.regression ? activeRun.regression.exitCode === 0 ? 'PASSED' : 'FAILED' : 'UNTESTED', activeRun.regression?.exitCode === 0);
  if (activeRun.outcome === 'failed' || activeRun.outcome === 'blocked') {
    $('state-kicker').textContent = 'RUN NOT VERIFIED';
    $('security-title').textContent = 'Verification incomplete';
    $('security-detail').textContent = activeRun.error || 'Review the recorded results.';
  }
  const finished = activeRun.outcome !== 'running';
  $('download').classList.toggle('disabled', !finished || !activeRun.evidenceReady);
  $('download').setAttribute('aria-disabled', String(!finished || !activeRun.evidenceReady));
  $('download').href = `/api/runs/${activeRun.id}/evidence.zip`;
  $('download').textContent = verified ? '↓ Download Proof of Fix' : '↓ Download run evidence';
  busy = !finished;
  $('harden').disabled = busy;
  renderCode();
}
function renderEvent(event) {
  const row = document.querySelector(`[data-phase="${event.phase}"]`);
  if (row) {
    row.className = event.state || 'active';
    row.querySelector('.phase-state').textContent = event.state === 'done' ? '✓' : event.state === 'failed' ? '!' : '●';
  }
  $('activity').lastElementChild.textContent = event.message;
}
async function connectStatus() {
  try {
    const response = await fetch('./status.json');
    const status = await response.json();
    token = '';
    $('harden').disabled = true;
    $('harden').textContent = 'READ-ONLY EVIDENCE VIEW';
    $('gemini-status').textContent = `Gemini · ${status.gemini.connected ? 'verified' : status.gemini.configured ? 'configured, untested' : 'key required'}`;
    $('gemini-status').classList.toggle('ok', status.gemini.connected);
    $('createos-status').textContent = `CreateOS · ${status.createos.connected ? 'connected' : 'not verified'}`;
    $('createos-status').classList.toggle('ok', status.createos.connected);
    $('stripe-status').textContent = status.stripe.message;
    $('notice').classList.toggle('ok', status.gemini.connected && status.createos.connected);
    $('notice').textContent = status.gemini.connected ? 'Gemini and CreateOS preflight verified. Every security claim still requires a successful audit run.' : status.gemini.configured ? 'Gemini key detected. Run npm run preflight to verify inference before starting an audit.' : 'Setup required: enter GEMINI_API_KEY privately in .env.local, then run npm run preflight. No API keys are sent to this page.';
    $('notice').textContent = 'PUBLIC READ-ONLY EVIDENCE VIEW. Historical CreateOS baseline, not a live audit. Gemini inference, autonomous patching and Stripe Projects integration remain unverified.';
    source = status.source;
    if (!status.latest && !activeRun) {
      const baselineResponse = await fetch('./baseline.json');
      if (baselineResponse.ok) {
        recordedBaseline = await baselineResponse.json();
        $('run-label').textContent = 'RECORDED BASELINE';
        $('activity').lastElementChild.textContent = `Historical CreateOS fixture execution: ${recordedBaseline.timestamp}. No repair verified.`;
        $('duration').textContent = `Recorded baseline ${recordedBaseline.id.slice(0, 8)} · not a live run`;
        $('download').classList.remove('disabled');
        $('download').setAttribute('aria-disabled', 'false');
        $('download').href = './recorded-baseline.zip';
        $('download').textContent = '↓ Download recorded baseline';
      }
    }
    if (status.latest && !activeRun) {
      activeRun = status.latest;
      (activeRun.events || []).forEach(renderEvent);
      renderRun();
      if (activeRun.outcome === 'running') follow(activeRun.id);
    }
    renderCode();
  } catch { $('notice').textContent = 'Backend unavailable. Start the local server with npm start.'; }
}
function follow(id) {
  stream?.close();
  stream = new EventSource(`/api/runs/${id}/events`);
  stream.addEventListener('snapshot', e => { activeRun = JSON.parse(e.data); (activeRun.events || []).forEach(renderEvent); renderRun(); });
  stream.addEventListener('progress', e => { const data = JSON.parse(e.data); renderEvent(data.event); activeRun = data.run; renderRun(); });
  stream.addEventListener('complete', e => { activeRun = JSON.parse(e.data); renderRun(); stream.close(); });
  stream.onerror = () => { if (busy) $('activity').lastElementChild.textContent = 'Connection interrupted. Reconnecting to recorded events…'; };
}
$('harden').addEventListener('click', async () => {
  if (true) return; // Public static export cannot execute audits.
  $('harden').disabled = true;
  try {
    const response = await fetch('/api/runs', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-BoundaryForge-Token': token }, body: '{}' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Audit could not start.');
    document.querySelectorAll('[data-phase]').forEach(row => { row.className = ''; row.querySelector('.phase-state').textContent = '—'; });
    activeRun = data;
    renderRun();
    follow(data.id);
  } catch (e) { $('notice').textContent = e.message; $('notice').classList.remove('ok'); $('harden').disabled = false; }
});
document.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => { currentTab = button.dataset.tab; renderCode(); }));
$('copy').addEventListener('click', async () => { try { await navigator.clipboard.writeText($('code').textContent); $('copy').textContent = 'Copied'; setTimeout(() => $('copy').textContent = 'Copy', 1500); } catch { $('copy').textContent = 'Select text to copy'; } });
$('refresh').addEventListener('click', connectStatus);
connectStatus();
