const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function calendar() {
  let month;
  const selected=[];
  const mocks={
    react:{useState:init=>{if(!month)month=init();return[month,next=>month=next]}},
    'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},
    'react-native':{Pressable:'Pressable',Text:'Text',View:'View'},
    '@expo/vector-icons':{Ionicons:'Icon'},
    '../context/ThemeContext':{useColors:()=>({})},
    '../constants/Fonts':{FontFamily:{bodyBold:'bold'}},
  };
  class FixedDate extends Date {constructor(...args){super(...(args.length?args:[2028,1,15,12]));}}
  const exports={};
  const code=ts.transpileModule(fs.readFileSync('components/MonthCalendar.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  vm.runInNewContext(code,{exports,require:name=>mocks[name],Date:FixedDate});
  function render(){const nodes=[];const tree=exports.MonthCalendar({events:[{id:'visit',title:'Campus visit',event_date:'2028-02-29'}],onSelectDate:(...args)=>selected.push(args)});function walk(n){if(Array.isArray(n)){n.forEach(walk);return;}if(!n||typeof n!=='object')return;nodes.push(n);walk(n.props?.children)}walk(tree);return nodes;}
  return {render,selected};
}
test('calendar renders leap day and navigates whole months without skipping dates',()=>{
 const c=calendar();let nodes=c.render();const days=()=>nodes.filter(n=>n.props?.accessibilityLabel?.endsWith('events'));
 assert.equal(days().length,29);
 nodes.find(n=>n.props?.accessibilityLabel==='Next month').props.onPress();nodes=c.render();assert.equal(days().length,31);
 nodes.find(n=>n.props?.accessibilityLabel==='Previous month').props.onPress();nodes=c.render();assert.equal(days().length,29);
});
test('selecting a calendar date returns the correct local date and existing event',()=>{
 const c=calendar();const node=c.render().find(n=>n.props?.accessibilityLabel?.endsWith(', 1 events'));node.props.onPress();
 assert.equal(c.selected[0][0].getFullYear(),2028);assert.equal(c.selected[0][0].getMonth(),1);assert.equal(c.selected[0][0].getDate(),29);assert.equal(c.selected[0][1][0].id,'visit');
});
