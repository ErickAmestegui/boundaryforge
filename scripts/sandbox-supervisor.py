"""Trusted CreateOS-only supervisor. Never run generated code on the host."""
import hashlib
import json
import os
import pathlib
import selectors
import signal
import subprocess
import sys
import time

request = json.load(sys.stdin)
run_id = request['runId']
if len(run_id) != 36 or any(c not in '0123456789abcdef-' for c in run_id):
    raise ValueError('Invalid run ID')
root = pathlib.Path('/tmp/boundaryforge') / run_id
allowed = {'generated-attack.test.ts', 'regression.test.ts', 'witness.mjs', 'baseline.test.ts'}

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

if request['action'] == 'prepare':
    public = root / 'documents/public'
    private = root / 'documents/private'
    sibling = root / 'documents/public-evil'
    sibling.mkdir(exist_ok=True)
    (sibling / 'CANARY.txt').write_text('BOUNDARYFORGE_SYNTHETIC_CANARY\n')
    (public / 'sub').mkdir(exist_ok=True)
    (public / 'canary-link.txt').symlink_to(private / 'CANARY.txt')
    (public / 'private-link').symlink_to(private, target_is_directory=True)
    os.mkfifo(public / 'pipe.txt', 0o444)
    for folder, dirs, files in os.walk(root):
        os.chmod(folder, 0o555)
        for name in files:
            path = pathlib.Path(folder) / name
            if not path.is_symlink():
                os.chmod(path, 0o444)
    print(json.dumps({'prepared': True, 'testSha256': digest(root / 'generated-attack.test.ts') if (root / 'generated-attack.test.ts').exists() else None}))
elif request['action'] == 'hash':
    print(json.dumps({name: digest(root / name) for name in ['generated-attack.test.ts', 'readFileTool.ts'] if (root / name).exists()}))
elif request['action'] == 'execute':
    name = request['file']
    if name not in allowed:
        raise ValueError('Command not allowlisted')
    command = ['unshare', '--net', '--', 'setpriv', '--reuid=65534', '--regid=65534', '--clear-groups', '--bounding-set=-all', '--no-new-privs', 'node', '--permission', '--allow-fs-read=' + str(root), '--disable-proto=throw', '--max-old-space-size=128']
    if name.endswith('.test.ts'):
        command += ['--test-reporter=tap']
    command += [str(root / name)]
    started = time.time()
    proc = subprocess.Popen(command, cwd=root, env={'PATH': '/usr/local/bin:/usr/bin:/bin', 'HOME': '/nonexistent'}, stdout=subprocess.PIPE, stderr=subprocess.PIPE, start_new_session=True)
    selector = selectors.DefaultSelector()
    selector.register(proc.stdout, selectors.EVENT_READ, 'stdout')
    selector.register(proc.stderr, selectors.EVENT_READ, 'stderr')
    output = {'stdout': bytearray(), 'stderr': bytearray()}
    termination = None
    while selector.get_map():
        if time.time() - started > 15:
            termination = 'timeout'
            break
        for key, mask in selector.select(0.1):
            chunk = os.read(key.fileobj.fileno(), 4096)
            if not chunk:
                selector.unregister(key.fileobj)
            else:
                output[key.data].extend(chunk)
            if sum(len(value) for value in output.values()) > 65536:
                termination = 'output_limit'
                break
        if termination:
            break
    if termination:
        os.killpg(proc.pid, signal.SIGKILL)
    exit_code = proc.wait(timeout=3)
    # Kill any descendants that survived the main process, inside this process group.
    try:
        os.killpg(proc.pid, signal.SIGKILL)
    except ProcessLookupError:
        pass
    print(json.dumps({'command': command, 'exitCode': exit_code, 'stdout': output['stdout'][:65536].decode('utf8', 'replace'), 'stderr': output['stderr'][:65536].decode('utf8', 'replace'), 'durationMs': round((time.time() - started) * 1000), 'termination': termination, 'testSha256': digest(root / 'generated-attack.test.ts') if (root / 'generated-attack.test.ts').exists() else None}))
else:
    raise ValueError('Unknown action')
