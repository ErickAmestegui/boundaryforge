import { readFileTool } from './readFileTool.ts';
// Maintainer-authored witness, independent of the model-generated test.
let value = null;
let error = null;
try { value = readFileTool('../private/CANARY.txt'); }
catch (e) { error = { name: e.name, message: e.message }; }
console.log(JSON.stringify({ path: '../private/CANARY.txt', canaryAccessed: typeof value === 'string' && value.trim() === 'BOUNDARYFORGE_SYNTHETIC_CANARY', value, error }));
