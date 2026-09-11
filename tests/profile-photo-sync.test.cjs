const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function loadPhotos() {
  const requests = [];
  const effects = [];
  let drawerStatus = 'closed';
  let onAppState;
  const react = {
    useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot(),
    useEffect: effect => effects.push(effect),
  };
  function load(file, mocks) {
    const exports = {};
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    vm.runInNewContext(code, { exports, console, require: name => {
      assert.ok(mocks[name], name);
      return mocks[name];
    } });
    return exports;
  }
  const photos = load('lib/profilePhotos.ts', {
    react,
    './supabase': { supabase: { from: table => ({ select: () => ({ eq: (_key, id) => ({
      single: () => new Promise(resolve => requests.push({ table, id, resolve })),
    }) }) }) } },
  });
  const hook = load('hooks/useDrawerProfilePhoto.ts', {
    react,
    'react-native': { AppState: { addEventListener: (_event, listener) => {
      onAppState = listener;
      return { remove: () => { onAppState = undefined; } };
    } } },
    'expo-router/drawer': { useDrawerStatus: () => drawerStatus },
    '../lib/profilePhotos': photos,
  });
  return { photos, requests, effects, hook,
    setStatus: value => { drawerStatus = value; },
    resume: () => onAppState?.('active'),
  };
}

for (const table of ['athletes', 'coach_accounts']) {
  test(`${table}: upload, replacement and removal update the drawer snapshot`, () => {
    const { photos } = loadPhotos();
    const read = () => photos.useProfilePhoto(table, 'profile-1', 'old-url');
    photos.publishProfilePhoto(table, 'profile-1', 'uploaded-url');
    assert.equal(read(), 'uploaded-url');
    photos.publishProfilePhoto(table, 'profile-1', 'replacement-url');
    assert.equal(read(), 'replacement-url');
    photos.publishProfilePhoto(table, 'profile-1', null);
    assert.equal(read(), null);
    assert.equal(photos.useProfilePhoto(table, 'other-profile', 'other-url'), 'other-url');
  });

  test(`${table}: opening drawer and resuming app refresh the saved photo`, async () => {
    const h = loadPhotos();
    h.hook.useDrawerProfilePhoto(table, 'profile-1', null);
    h.effects.pop()();
    assert.equal(h.requests.length, 0);
    h.setStatus('open');
    h.hook.useDrawerProfilePhoto(table, 'profile-1', null);
    const cleanup = h.effects.pop()();
    assert.equal(h.requests[0].table, table);
    assert.equal(h.requests[0].id, 'profile-1');
    h.requests[0].resolve({ data: { profile_photo_url: 'saved-url' }, error: null });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(h.photos.useProfilePhoto(table, 'profile-1', null), 'saved-url');
    h.resume();
    assert.equal(h.requests.length, 2);
    h.requests[1].resolve({ data: { profile_photo_url: null }, error: null });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(h.photos.useProfilePhoto(table, 'profile-1', 'stale-url'), null);
    cleanup();
    h.resume();
    assert.equal(h.requests.length, 2);
  });

  test(`${table}: stale fetch cannot overwrite an upload or removal`, async () => {
    const { photos, requests } = loadPhotos();
    for (const url of ['new-url', null]) {
      const read = photos.refreshProfilePhoto(table, 'profile-1');
      photos.publishProfilePhoto(table, 'profile-1', url);
      requests.at(-1).resolve({ data: { profile_photo_url: 'stale-url' }, error: null });
      await read;
      assert.equal(photos.useProfilePhoto(table, 'profile-1', null), url);
    }
  });
}

test('failed refresh preserves the last successful photo', async () => {
  const { photos, requests } = loadPhotos();
  photos.publishProfilePhoto('athletes', 'profile-1', 'saved-url');
  const pending = photos.refreshProfilePhoto('athletes', 'profile-1');
  requests[0].resolve({ data: null, error: new Error('Offline') });
  await assert.rejects(pending, /Offline/);
  assert.equal(photos.useProfilePhoto('athletes', 'profile-1', null), 'saved-url');
});
