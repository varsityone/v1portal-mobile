const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// Exercise picker/storage/database boundaries without changing a real profile.
function harness(options = {}) {
  const calls = [];
  const messages = [];
  const bucket = {
    upload: async (path) => { calls.push(['upload', path]); return { error: options.uploadError }; },
    getPublicUrl: () => ({ data: { publicUrl: 'https://example.com/photo.jpg' } }),
    remove: async (paths) => { calls.push(['cleanup', paths]); return { error: null }; },
  };
  const chain = {
    eq: (_, id) => { calls.push(['id', id]); return chain; },
    select: () => chain,
    single: async () => ({ error: options.saveError }),
  };
  const mocks = {
    react: { useRef: (value) => ({ current: value }), useState: (value) => [value, next => messages.push(next)] },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'react-native': { Platform: { OS: options.platform ?? 'ios' }, Pressable: 'Pressable', View: 'View', Text: 'Text', Image: 'Image', ActivityIndicator: 'ActivityIndicator' },
    '@expo/vector-icons': { Ionicons: 'Icon' },
    'expo-image-picker': { launchImageLibraryAsync: async () => { calls.push(['picker']); return options.cancel ? { canceled: true } : { canceled: false, assets: [{ uri: 'file:///photo.jpg', mimeType: 'image/jpeg' }] }; } },
    '../constants/ProfileImage': { DEFAULT_PROFILE_IMAGE: 1 },
    '../context/ThemeContext': { useColors: () => ({}) },
    '../lib/profilePhotos': { useProfilePhoto: () => options.photo ?? null, publishProfilePhoto: (...args) => calls.push(['publish', ...args]) },
    '../lib/supabase': { supabase: {
      auth: { getSession: async () => ({ data: { session: { user: { id: 'user-1' } } } }) },
      storage: { from: () => bucket },
      from: (table) => ({ update: (data) => { calls.push(['update', table, data]); return chain; } }),
    } },
  };
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync('components/ProfilePhotoEditor.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(code, {
    exports, require: name => { assert.ok(mocks[name], name); return mocks[name]; },
    fetch: async () => ({ arrayBuffer: async () => ({ byteLength: options.size ?? 100 }), headers: { get: () => null } }),
  });
  const tree = exports.default({ table: options.table ?? 'athletes', profileId: 'profile-1' });
  const buttons = [];
  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'Pressable') buttons.push(node);
    const children = node.props?.children;
    (Array.isArray(children) ? children : [children]).forEach(walk);
  }
  walk(tree);
  return { calls, messages, async press(index = 0) {
    buttons[index].props.onPress();
    await new Promise(resolve => setImmediate(resolve));
  } };
}

for (const [table, folder] of [['athletes', 'profile-photos'], ['coach_accounts', 'coach-photos']]) {
  test(`${table}: upload updates the correct record and publishes the photo`, async () => {
    const h = harness({ table }); await h.press();
    assert.match(h.calls.find(c => c[0] === 'upload')[1], new RegExp(`^${folder}/user-1-`));
    assert.equal(h.calls.find(c => c[0] === 'update')[1], table);
    assert.equal(h.calls.find(c => c[0] === 'id')[1], 'profile-1');
    assert.equal(h.calls.find(c => c[0] === 'publish')[3], 'https://example.com/photo.jpg');
  });
}
test('canceling the picker does not upload or update a profile', async () => {
  const h = harness({ cancel: true }); await h.press();
  assert.deepEqual(h.calls, [['picker']]);
});
test('oversized photos do not reach storage', async () => {
  const h = harness({ size: 6 * 1024 * 1024 }); await h.press();
  assert.equal(h.calls.some(c => c[0] === 'upload'), false);
});
test('database rejection cleans up the new file without publishing success', async () => {
  const h = harness({ saveError: { message: 'Denied' } }); await h.press();
  assert.equal(h.calls.some(c => c[0] === 'cleanup'), true);
  assert.equal(h.calls.some(c => c[0] === 'publish'), false);
});
test('removal saves null and updates the displayed photo', async () => {
  const h = harness({ photo: 'https://example.com/old.jpg' }); await h.press(2);
  assert.equal(h.calls.find(c => c[0] === 'update')[2].profile_photo_url, null);
  assert.equal(h.calls.find(c => c[0] === 'publish')[3], null);
  assert.equal(h.calls.some(c => c[0] === 'picker'), false);
});
