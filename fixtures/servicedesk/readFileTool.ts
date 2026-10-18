import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// INTENTIONALLY VULNERABLE synthetic fixture. Never serve publicly.
const publicRoot = resolve(import.meta.dirname, 'documents/public');
export function readFileTool(path: string): string {
  if (typeof path !== 'string' || path.length === 0) throw new Error('Invalid path');
  return readFileSync(resolve(publicRoot, path), 'utf8');
}
