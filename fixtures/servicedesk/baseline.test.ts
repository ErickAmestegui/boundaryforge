import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileTool } from './readFileTool.ts';
test('welcome remains available', () => assert.match(readFileTool('welcome.txt'), /Welcome to ServiceDesk Agent/));
test('manual remains available', () => assert.match(readFileTool('manual.txt'), /ServiceDesk manual/));
