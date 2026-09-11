const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function loadTour() {
  const storage = new Map();
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync('lib/onboardingTour.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(code, { exports, require: () => ({ __esModule: true, default: {
    getItem: async key => storage.get(key) ?? null,
    setItem: async (key, value) => { storage.set(key, value); },
    removeItem: async key => { storage.delete(key); },
  } }) });
  return exports;
}

test('every replay reaches an already-focused dashboard after the tour was seen', async () => {
  const tour = loadTour();
  await tour.markTourSeen();
  let replays = 0;
  const unsubscribe = tour.subscribeTourRequest(() => {
    void tour.consumeTourRequest().then(forced => { if (forced) replays++; });
  });
  for (let i = 1; i <= 3; i++) {
    await tour.requestTour();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(replays, i);
    assert.equal(await tour.consumeTourRequest(), false);
  }
  assert.equal(await tour.hasSeenTour(), true);
  unsubscribe();
});

test('replay from another screen stays queued until the dashboard consumes it', async () => {
  const tour = loadTour();
  let notifications = 0;
  const unsubscribe = tour.subscribeTourRequest(() => { notifications++; });
  unsubscribe();
  await tour.requestTour();
  assert.equal(notifications, 0);
  assert.equal(await tour.consumeTourRequest(), true);
  assert.equal(await tour.consumeTourRequest(), false);
});
