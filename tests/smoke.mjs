import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
assert.match(html, /<!doctype html>/i);
assert.match(html, /<canvas\s+id="art"/);
assert.match(html, /<\/html>/i);

const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length, 3, 'two GLSL shaders and one JavaScript controller expected');
const js = scripts.filter(m => !/x-shader/.test(m[1]));
assert.equal(js.length, 1, 'one application controller expected');
new vm.Script(js[0][2], {filename: 'atelier-inline.js'});

for (const id of [
  'art', 'density', 'spiral', 'warp', 'glow', 'zoom', 'speed',
  'pause', 'record', 'shuffle', 'reset', 'export', 'saveRecipe',
  'loadRecipe', 'recipeFile', 'copyLink',
]) {
  assert.ok(html.includes('id="' + id + '"'), 'missing control: ' + id);
}
assert.equal([...html.matchAll(/data-mode="/g)].length, 4, 'four worlds expected');
assert.equal([...html.matchAll(/data-palette="/g)].length, 5, 'five palettes expected');
for (const token of [
  'getContext(\'webgl\'',
  "getContext('2d'",
  'MediaRecorder',
  'canvas.toBlob',
  'JSON.stringify(recipe()',
]) {
  assert.ok(html.includes(token), 'missing feature: ' + token);
}
console.log('PASS: HTML, application JavaScript syntax, controls, modes, palettes and exports.');
