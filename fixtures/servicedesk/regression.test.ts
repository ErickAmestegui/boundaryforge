import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { readFileTool } from './readFileTool.ts';

test('welcome remains available', () => assert.match(readFileTool('welcome.txt'), /Welcome to ServiceDesk Agent/));
test('manual remains available', () => assert.match(readFileTool('manual.txt'), /ServiceDesk manual/));
test('benign normalization remains available', () => assert.match(readFileTool('sub/../welcome.txt'), /Welcome/));
for (const [name, path] of [
  ['parent traversal', '../private/CANARY.txt'],
  ['normalized traversal', 'sub/../../private/CANARY.txt'],
  ['absolute private path', resolve(import.meta.dirname, 'documents/private/CANARY.txt')],
  ['absolute public path', resolve(import.meta.dirname, 'documents/public/welcome.txt')],
  ['sibling prefix bypass', '../public-evil/CANARY.txt'],
  ['file symlink escape', 'canary-link.txt'],
  ['directory symlink escape', 'private-link/CANARY.txt'],
  ['directory', '.'],
  ['FIFO', 'pipe.txt'],
  ['NUL byte', 'welcome.txt\0'],
  ['missing file', 'missing.txt'],
  ['empty path', ''],
]) {
  test(`denies ${name}`, () => assert.throws(() => readFileTool(path)));
}
