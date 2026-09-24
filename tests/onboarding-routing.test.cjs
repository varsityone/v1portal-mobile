const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function setup(athlete, seen = {}, coach = null) {
  const exports = {};
  const chain = { select(){return this},eq(){return this},maybeSingle:async()=>({data:coach,error:null}) };
  const mocks = {
    '@react-native-async-storage/async-storage': {__esModule:true,default:{getItem:async key=>seen[key]??null}},
    './supabase': {supabase:{from:()=>chain}},
    './ensureAthleteProfile': {ensureAthleteProfile:async()=>athlete},
  };
  const code=ts.transpileModule(fs.readFileSync('lib/resolveHomeRoute.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  vm.runInNewContext(code,{exports,require:name=>mocks[name]});
  return exports.resolveHomeRoute;
}
test('a new account sees slides even when another account used this device',async()=>{
  assert.equal(await setup({account_role:'athlete',v1_score:null},{v1portal_onboarding_seen:'1','v1portal_onboarding_seen:other':'1'})('ash'),'/onboarding');
});
test('slides lead to assessment, not an empty dashboard',async()=>{
  assert.equal(await setup({account_role:'athlete',v1_score:null})('ash',true),'/assessment');
});
test('an incomplete returning athlete resumes assessment',async()=>{
  assert.equal(await setup({account_role:'athlete',v1_score:null},{'v1portal_onboarding_seen:ash':'1'})('ash'),'/assessment');
});
test('zero is a completed score and opens dashboard',async()=>{
  assert.equal(await setup({account_role:'athlete',v1_score:0},{'v1portal_onboarding_seen:ash':'1'})('ash'),'/(tabs)');
});
test('verified coach and unfinished coach keep their routes',async()=>{
  assert.equal(await setup(null,{}, {id:'coach'})('coach'),'/(coach)');
  assert.equal(await setup({account_role:'coach',v1_score:null})('coach'),'/coach-setup');
});
