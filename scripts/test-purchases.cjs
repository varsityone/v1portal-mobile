const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// Run the actual mobile purchase adapter with the native SDK and transport
// substituted. No Apple purchases or database writes occur in these tests.
function harness(options = {}) {
  const calls = [];
  const purchases = {
    configure: args => calls.push(['configure', args]),
    logIn: id => options.login ? options.login(id) : Promise.resolve(),
    getOfferings: async () => ({ current: { identifier: 'default' } }),
    purchasePackage: async pkg => { calls.push(['purchase', pkg]); return { customerInfo: { entitlements: { active: { match: {} } } } }; },
    restorePurchases: async () => { calls.push(['restore']); return { entitlements: { active: { match: {} } } }; },
  };
  const mocks = {
    'react-native': { Platform: { OS: 'ios' } },
    'expo-constants': { __esModule: true, default: { executionEnvironment: 'standalone' }, ExecutionEnvironment: { StoreClient: 'storeClient' } },
    'react-native-purchases': { __esModule: true, default: purchases },
    './supabase': { supabase: { auth: { getSession: async () => ({ data: { session: options.signedOut ? null : { access_token: 'authenticated-token' } } }) } } },
  };
  const source = fs.readFileSync(require('node:path').join(__dirname, '../lib/purchases.ts'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const context = {
    exports: {}, require: name => { if (!(name in mocks)) throw Error(`Unexpected module ${name}`); return mocks[name]; },
    process: { env: { EXPO_PUBLIC_REVENUECAT_IOS_KEY: 'public-test-key' } },
    console: { warn: () => {} }, AbortController, setTimeout, clearTimeout,
    fetch: async (url, init) => {
      calls.push(['fetch', url, init]);
      if (options.networkError) throw Error('offline');
      return { ok: options.httpOk !== false, json: async () => ({ status: options.serverStatus || 'active' }) };
    },
  };
  vm.runInNewContext(code, context);
  return { api: context.exports, calls };
}

test('recognizes Match+ specifically, not unrelated paid access', () => {
  const { api } = harness();
  assert.equal(api.hasActiveEntitlement({ entitlements: { active: { other: {} } } }), false);
  assert.equal(api.hasActiveEntitlement({ entitlements: { active: { match: {} } } }), true);
});
test('restore waits for RevenueCat identity switching before accessing purchases', async () => {
  let release;
  const { api, calls } = harness({ login: () => new Promise(resolve => { release = resolve; }) });
  api.configurePurchases('first-user');
  api.configurePurchases('reviewer');
  const pending = api.restorePurchases();
  await Promise.resolve();
  assert.equal(calls.some(c => c[0] === 'restore'), false);
  release();
  assert.equal(api.hasActiveEntitlement(await pending), true);
  assert.equal(calls.filter(c => c[0] === 'restore').length, 1);
});
test('failed RevenueCat identity switching prevents purchasing as a previous user', async () => {
  const { api, calls } = harness({ login: async () => { throw Error('login failed'); } });
  api.configurePurchases('first-user');
  api.configurePurchases('reviewer');
  await assert.rejects(api.purchasePackage({}), /login failed/);
  assert.equal(calls.some(c => c[0] === 'purchase'), false);
});
test('sync sends only the authenticated token, never a client access grant', async () => {
  const { api, calls } = harness();
  assert.equal(await api.syncSubscriptionAccess(), true);
  const [, url, init] = calls.find(c => c[0] === 'fetch');
  assert.equal(url, 'https://v1portal.com/api/subscriptions/sync');
  assert.equal(init.method, 'POST');
  assert.equal(init.headers.Authorization, 'Bearer authenticated-token');
  assert.equal(init.body, undefined);
});
test('inactive server response never unlocks access', async () => {
  const { api } = harness({ serverStatus: 'inactive' });
  assert.equal(await api.syncSubscriptionAccess(), false);
});
test('signed-out users cannot synchronize access', async () => {
  const { api, calls } = harness({ signedOut: true });
  await assert.rejects(api.syncSubscriptionAccess(), /sign in again/);
  assert.equal(calls.length, 0);
});
for (const options of [{ httpOk: false }, { networkError: true }]) {
  test(`failed synchronization never reports success: ${JSON.stringify(options)}`, async () => {
    const { api } = harness(options);
    await assert.rejects(api.syncSubscriptionAccess());
  });
}
