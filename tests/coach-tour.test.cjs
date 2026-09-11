const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function loadTour() {
  const storage = new Map([['v1portal_tour_seen', 'true']]);
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync('lib/coachTour.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(code, { exports, require: () => ({ __esModule: true, default: {
    getItem: async key => storage.get(key) ?? null,
    setItem: async (key, value) => { storage.set(key, value); },
    removeItem: async key => { storage.delete(key); },
  } }) });
  return { tour: exports, storage };
}

test('coach completion is independent of athlete completion and other coaches', async () => {
  const { tour, storage } = loadTour();
  assert.equal(await tour.hasSeenCoachTour('coach-1', true), false);
  await tour.markCoachTourSeen('coach-1', true);
  assert.equal(await tour.hasSeenCoachTour('coach-1', true), true);
  assert.equal(await tour.hasSeenCoachTour('coach-2', true), false);
  assert.equal(storage.get('v1portal_tour_seen'), 'true');
});
test('seeing the verification tour does not suppress the full dashboard tour', async () => {
  const { tour } = loadTour();
  await tour.markCoachTourSeen('coach-1', false);
  assert.equal(await tour.hasSeenCoachTour('coach-1', false), true);
  assert.equal(await tour.hasSeenCoachTour('coach-1', true), false);
});
test('replay notifies an already focused dashboard and is consumed once', async () => {
  const { tour } = loadTour();
  let notifications = 0;
  const unsubscribe = tour.subscribeCoachTourRequest(() => { notifications++; });
  await tour.requestCoachTour();
  assert.equal(notifications, 1);
  assert.equal(await tour.consumeCoachTourRequest(), true);
  assert.equal(await tour.consumeCoachTourRequest(), false);
  unsubscribe();
  await tour.requestCoachTour();
  assert.equal(notifications, 1);
});
