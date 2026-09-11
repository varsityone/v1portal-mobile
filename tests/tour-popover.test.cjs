const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const moduleExports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/tourPopover.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { exports: moduleExports });
const position = moduleExports.getTourPopoverPosition;

test('tour text sits below a target near the dashboard header', () => {
  const target = { x: 20, y: 120, width: 350, height: 100 };
  const card = position(target, { width: 390, height: 844 }, 240);
  assert.ok(card.top > target.y + target.height);
  assert.ok(card.top + 240 < 844);
});
test('tour text moves above a target near the bottom instead of covering it', () => {
  const target = { x: 20, y: 650, width: 350, height: 90 };
  const card = position(target, { width: 390, height: 844 }, 280);
  assert.ok(card.top + 280 < target.y);
  assert.ok(card.top >= 12);
});
test('narrow screens keep the entire tour card inside the viewport', () => {
  const card = position({ x: 240, y: 80, width: 25, height: 60 }, { width: 280, height: 600 }, 250);
  assert.ok(card.left >= 12);
  assert.ok(card.left + card.width <= 268);
});
test('placement adapts to the measured height of longer tour text', () => {
  const target = { x: 20, y: 430, width: 350, height: 100 };
  const short = position(target, { width: 390, height: 844 }, 200);
  const tall = position(target, { width: 390, height: 844 }, 350);
  assert.ok(short.top > target.y + target.height);
  assert.ok(tall.top + 350 < target.y);
});
