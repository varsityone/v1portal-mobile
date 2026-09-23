const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function transpile(filePath) {
  return ts.transpileModule(fs.readFileSync(filePath, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
}
function harness(name, options = {}) {
  const calls = [], states = [], callbacks = [], effects = [];
  const react = {
    useState(initial) { const index = states.length; states.push(initial); return [initial, next => { states[index] = typeof next === 'function' ? next(states[index]) : next; }]; },
    useCallback(fn) { callbacks.push(fn); return fn; },
    useRef(initial) { return { current: initial }; },
    useEffect(fn) { effects.push(fn); }, useMemo: fn => fn(),
  };
  const supabase = {
    from(table) {
      const query = { table, op: 'select', filters: [] };
      const chain = {};
      for (const op of ['select','insert','update','delete','eq','in','gte','order','limit']) {
        chain[op] = (...args) => {
          if (['insert','update','delete'].includes(op)) { query.op = op; query.payload = args[0]; }
          if (['eq','in','gte'].includes(op)) query.filters.push([op,...args]);
          return chain;
        };
      }
      const resolve = () => {
        calls.push(query);
        return options.query ? options.query(query) : { data: query.op === 'select' ? [] : { id: 'new', ...query.payload?.[0] }, error: null };
      };
      chain.single = chain.maybeSingle = async () => resolve();
      chain.then = (yes,no) => Promise.resolve().then(resolve).then(yes,no);
      return chain;
    },
    async rpc(name,args) { calls.push({ rpc: name, args }); return { error: options.failIds?.includes(args.p_athlete_id) ? { message: 'Denied' } : null }; },
    auth: { getSession: async () => ({ data: { session: { access_token: 'test-token' } } }) },
  };
  const mocks = {
    react, '../lib/supabase': { supabase },
    './useCoachData': { useCoachData: () => ({ coach: { id:'coach', verified: options.verified !== false, division:'FBS' } }) },
    '../constants/Phases': { PHASES: [{},{},{}] },
  };
  const libCache = {};
  function loadLib(specifier) {
    // Resolves a hook's `../lib/x` import to the real lib/x.ts source, so
    // tests exercise the actual shared logic instead of a hand-written stub.
    if (libCache[specifier]) return libCache[specifier];
    const filePath = specifier.replace(/^\.\.\//, '') + '.ts';
    const exp = {};
    vm.runInNewContext(transpile(filePath), { exports: exp, require: () => ({}), console: { error(){} } });
    return (libCache[specifier] = exp);
  }
  const exports = {};
  const code = transpile(`hooks/${name}.ts`);
  vm.runInNewContext(code, {
    exports,
    require: n => { if (mocks[n]) return mocks[n]; if (n.startsWith('../lib/')) return loadLib(n); assert.ok(false, n); },
    console: { error(){} },
    fetch: options.fetch ?? (async () => ({ ok: options.httpOk !== false, json: async () => ({ allowed: options.allowed !== false }) })),
    AbortController,
  });
  return { api: exports[name], calls, states, callbacks, effects };
}
// Runs a registered useEffect and waits a macrotask so its internal async
// IIFE (unawaited by the effect itself) has drained its microtask chain.
function effectsSettled(h, index = 0) {
  h.effects[index]();
  return new Promise(resolve => setTimeout(resolve, 0));
}
const rejection = { message:'Database rejected write', code:'42501' };
for (const [hook,method,args] of [
  ['useCoachCalendarEvents','create',['Visit','visit','2026-10-01',null,'Bring film']],
  ['useCoachCalendarEvents','delete',['event']],
  ['useCoachTemplates','create',['Title','general','Content']],
  ['useCoachTemplates','update',['id','Title','general','Content']],
  ['useCoachTemplates','delete',['id']],
  ['useCoachPipeline','add',['athlete']],
  ['useCoachPipeline','updateStatus',['id','offered']],
]) test(`${hook}.${method} surfaces returned database errors without optimistic success`, async () => {
  const h = harness(hook,{query:()=>({data:null,error:rejection})});
  const api=h.api();
  await assert.rejects(api[method](...args),e=>e.message===rejection.message);
  assert.equal(h.states[0].length,0);
});

test('general coach calendar event saves description without a fake athlete',async()=>{
 const h=harness('useCoachCalendarEvents');const api=h.api();
 await api.create('Quiet reminder','quiet','2026-10-01',null,'Review schedule');
 const row=h.calls[0].payload[0];assert.equal(row.athlete_id,null);assert.equal(row.description,'Review schedule');assert.equal('notes' in row,false);
 assert.equal(h.states[0].length,1);
});
test('moving pipeline back to interested clears commitment and signing timestamps',async()=>{
 const h=harness('useCoachPipeline');await h.api().updateStatus('id','interested');
 const row=h.calls.find(c=>c.op==='update').payload;assert.equal(row.committed_at,null);assert.equal(row.signed_at,null);
});
function bulk(options={}) {return harness('useCoachBulkMessage',{query:q=>({data:{id:'conversation'},error:null}),...options});}
test('bulk send counts only accepted messages and returns failed recipients for retry',async()=>{
 const h=bulk({failIds:['b']});const result=await h.api().send(['a','b','a'],'','Hello');
 assert.equal(result.sent,1);assert.deepEqual(Array.from(result.failedIds),['b']);assert.equal(h.calls.filter(c=>c.rpc).length,2);assert.equal(h.states[0],false);
});
for (const options of [{allowed:false},{httpOk:false},{verified:false}]) test(`blocked bulk send performs no database writes: ${JSON.stringify(options)}`,async()=>{
 const h=bulk(options);await assert.rejects(h.api().send(['a'],'','Hello'));assert.equal(h.calls.length,0);assert.equal(h.states[0],false);
});
test('contact info validation rejects email and repeated phone attempts without sending',async()=>{
 const h=bulk();const api=h.api();for(const text of ['Call 555-123-4567','Call 555-123-4567','Email me@example.com']) await assert.rejects(api.send(['a'],'',text),/Remove phone/);
 assert.equal(h.calls.length,0);
});
test('failed conversation lookup is not treated as successful delivery',async()=>{
 const h=bulk({query:()=>({data:null,error:rejection})});const result=await h.api().send(['a'],'','Hello');assert.equal(result.sent,0);assert.deepEqual(Array.from(result.failedIds),['a']);assert.equal(h.calls.some(c=>c.rpc),false);
});
test('gameplan cannot unlock later steps when assessment is missing',()=>{
 const h=harness('useGameplanPhases');const fields=['full_name','phone','bio','position','graduation_year','height','weight','high_school','city','gpa','ncaa_id','hudl_link','guardian_name','guardian_relationship','guardian_phone','guardian_email'];
 const athlete=Object.fromEntries(fields.map(f=>[f,'filled']));athlete.test_scores_not_taken=true;
 const gp=h.api(athlete,null,1);assert.equal(gp.completedCount,0);assert.equal(gp.getStatus(2),'upcoming');assert.equal(gp.phaseLocked[2],true);
});
test('a scored zero still completes the assessment phase',()=>{
 const h=harness('useGameplanPhases');const gp=h.api(null,{v1_score:0},0);assert.equal(gp.completedCount,1);assert.equal(gp.getStatus(0),'done');
});

test('coach analytics fetches the shared endpoint with the session token and timeframe, and stores the response',async()=>{
 const payload={viewed:2,liked:1,matched:1,saved:0,messaged:0,conversionRate:50,funnelViewed:2,funnelLiked:1,funnelMatched:1,topPositions:[],topStates:[],topLiked:[{id:'a'}]};
 let requestUrl,requestHeaders;
 const h=harness('useCoachAnalytics',{fetch: async (url,init)=>{ requestUrl=url; requestHeaders=init?.headers; return { ok:true, json: async ()=>payload }; }});
 h.api();
 await effectsSettled(h);
 assert.ok(String(requestUrl).includes('/api/coach/analytics?timeframe=month'));
 assert.equal(requestHeaders.Authorization,'Bearer test-token');
 assert.deepEqual(h.states[0],payload);
 assert.equal(h.states[1],false); // loading
});
test('coach analytics surfaces a fetch failure instead of stale or fabricated data',async()=>{
 const h=harness('useCoachAnalytics',{fetch: async ()=>({ ok:false, json: async ()=>({}) })});
 h.api();
 await effectsSettled(h);
 assert.equal(h.states[0],null);
 assert.ok(h.states[2]);
});
test('coach analytics skips the request for an unverified coach',async()=>{
 const h=harness('useCoachAnalytics',{verified:false, fetch: async ()=>{ throw new Error('should not fetch'); }});
 h.api();
 await effectsSettled(h);
 assert.equal(h.states[0],null);
 assert.equal(h.states[1],false);
});
