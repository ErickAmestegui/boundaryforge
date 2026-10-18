import ts from 'typescript';
import { z } from 'zod';

export const actionSchema = z.object({
  action: z.enum(['write_file', 'apply_patch']),
  path: z.enum(['generated-attack.test.ts', 'readFileTool.ts']),
  hypothesis: z.string().min(8).max(2000),
  code: z.string().min(30).max(32768),
}).strict();

// A syntactic gate, NOT the security boundary. OS/Node restrictions are mandatory.
export function validateAction(input, expected) {
  const action = actionSchema.parse(input);
  const patch = expected === 'apply_patch';
  if (action.action !== expected || action.path !== (patch ? 'readFileTool.ts' : 'generated-attack.test.ts')) throw new Error('Action or path is outside the current phase');
  const source = ts.createSourceFile(action.path, action.code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  if (source.parseDiagnostics.length) throw new Error('Generated TypeScript has a syntax error');
  const allowedImports = new Set(patch ? ['node:fs', 'node:path', 'node:url'] : ['node:test', 'node:assert/strict', 'node:path', './readFileTool.ts']);
  const forbidden = new Set(['eval', 'Function', 'process', 'global', 'globalThis', 'require', 'fetch', 'WebSocket', 'console', 'setTimeout', 'setInterval', 'constructor', '__proto__', 'prototype']);
  const fsAllowed = new Set(['readFileSync', 'realpathSync', 'statSync', 'lstatSync', 'openSync', 'fstatSync', 'closeSync', 'constants']);
  let usesTool = false;
  let usesTest = false;
  let usesAssert = false;
  function visit(node) {
    if (ts.isImportDeclaration(node)) {
      const module = node.moduleSpecifier.text;
      if (!allowedImports.has(module)) throw new Error(`Import not allowed: ${module}`);
      if (module === './readFileTool.ts') usesTool = true;
      if (module === 'node:test') usesTest = true;
      if (module === 'node:assert/strict') usesAssert = true;
      if (module === 'node:fs') {
        const bindings = node.importClause?.namedBindings;
        if (!bindings || !ts.isNamedImports(bindings)) throw new Error('Use named read-only fs imports');
        for (const entry of bindings.elements) if (!fsAllowed.has((entry.propertyName || entry.name).text)) throw new Error('Filesystem operation is not allowed');
      }
    }
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) throw new Error('Dynamic imports are not allowed');
    if (ts.isIdentifier(node) && forbidden.has(node.text)) throw new Error(`Forbidden generated-code capability: ${node.text}`);
    if (ts.isElementAccessExpression(node)) throw new Error('Computed property access is not allowed in this MVP');
    if (ts.isExportDeclaration(node)) throw new Error('Re-exports are not allowed');
    ts.forEachChild(node, visit);
  }
  visit(source);
  if (patch) {
    if (!source.statements.some(n => ts.isFunctionDeclaration(n) && n.name?.text === 'readFileTool' && n.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword))) throw new Error('Patch must export readFileTool');
  } else {
    if (!usesTool || !usesTest || !usesAssert || !action.code.includes('CANARY.txt')) throw new Error('Test must exercise readFileTool with node:test assertions and the canary');
  }
  return action;
}

export function classifyAttack(result, witness) {
  if (result.termination) return result.termination;
  if (witness?.exitCode !== 0 || witness.termination) return 'witness_error';
  let observed;
  try { observed = JSON.parse(witness.stdout); } catch { return 'witness_error'; }
  if (result.exitCode !== 0 && observed.canaryAccessed === true && /ERR_ASSERTION/.test(result.stdout) && /# fail [1-9]/.test(result.stdout)) return 'vulnerability_confirmed';
  if (result.exitCode === 0 && observed.canaryAccessed === false && observed.error && /# pass [1-9]/.test(result.stdout) && /# fail 0/.test(result.stdout)) return 'attack_blocked';
  return result.exitCode === 0 ? 'inconclusive' : 'execution_error';
}

export function verifyIntegrity(expectedHash, before, after) {
  return typeof expectedHash === 'string' && /^[a-f0-9]{64}$/.test(expectedHash) && before?.testSha256 === expectedHash && after?.testSha256 === expectedHash;
}
