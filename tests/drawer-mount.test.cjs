const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

for (const [file, component] of [['app/(tabs)/_layout.tsx', 'AppDrawer'], ['app/(coach)/_layout.tsx', 'CoachDrawer']]) {
  test(`${component} render callback mounts a component instead of invoking its hooks`, () => {
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let expression;
    function visit(node) {
      if (ts.isJsxAttribute(node) && node.name.getText(source) === 'drawerContent') expression = node.initializer.expression.getText(source);
      ts.forEachChild(node, visit);
    }
    visit(source);
    assert.ok(expression);
    let invoked = false;
    const Drawer = () => { invoked = true; throw new Error('Drawer hooks invoked outside component'); };
    const code = ts.transpileModule(`const render = ${expression}; result = render(props);`, {
      compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    const props = { state: { index: 0 } };
    const context = { result: null, [component]: Drawer, props, React: { createElement: (type, passedProps) => ({ type, props: passedProps }) } };
    vm.runInNewContext(code, context);
    assert.equal(invoked, false);
    assert.equal(context.result.type, Drawer);
    assert.equal(context.result.props.state, props.state);
  });
}
