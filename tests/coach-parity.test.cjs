const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function harness(name, options = {}) {
  const calls = [], states = [], callbacks = [];
  const react = {
    useState(initial) { const index = states.length; states.push(initial); return [initial, next => { states[index] = typeof next === 'function' ? next(states[index]) : next; }]; },
    useCallback(fn) { callbacks.push(fn); return fn; },
    useEffect() {}, useMemo: fn => fn(),
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
  };
  const mocks = {
    react, '../lib/supabase': { supabase },
    './useCoachData': { useCoachData: () => ({ coach: { id:'coach', verified: options.verified !== false, division:'FBS' } }) },
    '../constants/Phases': { PHASES: [{},{},{}] },
  };
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(`hooks/${name}.ts`,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(code, { exports, require: name => { assert.ok(mocks[name],name); return mocks[name]; }, console: { error(){} }, fetch: async () => ({ ok: options.httpOk !== false, json: async () => ({allowed: options.allowed !== false}) }) });
  return { api: exports[name], calls, states, callbacks };
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

test('coach analytics recognizes stored like/pass values and keeps all match statuses',async()=>{
 const h=harness('useCoachAnalytics',{query:q=>({error:null,data:q.table==='swipes'?[{athlete_id:'a',direction:'like'},{athlete_id:'b',direction:'pass'}]:q.table==='athletes'?[{id:'a',position:'QB',state:'TX',v1_score:80},{id:'b',position:'WR',state:'FL',v1_score:70}]:[{id:'one'}]})});
 h.api();await h.callbacks[0]();
 assert.equal(h.states[0].viewed,2);assert.equal(h.states[0].liked,1);assert.equal(h.states[0].matched,1);assert.equal(h.states[0].topLiked[0].id,'a');
 const swipes=h.calls.find(q=>q.table==='swipes');assert.ok(swipes.filters.some(f=>f[1]==='swiped_by'&&f[2]==='coach'));
 const matches=h.calls.find(q=>q.table==='mutual_matches');assert.equal(matches.filters.some(f=>f[1]==='status'),false);
});
