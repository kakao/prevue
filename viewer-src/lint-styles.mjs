import ts from 'typescript';

let input = '';
for await (const chunk of process.stdin) input += chunk;
const sources = JSON.parse(input);
const host = ts.createCompilerHost({});
host.getSourceFile = name => name in sources ? ts.createSourceFile(name, sources[name], ts.ScriptTarget.Latest, true, name.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS) : undefined;
const program = ts.createProgram(Object.keys(sources), { noLib: true, noResolve: true }, host);
const checker = program.getTypeChecker();
const output = {};

function unwrap(node) {
  while (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isTypeAssertionExpression(node)) node = node.expression;
  return node;
}
function binding(node, seen) {
  node = unwrap(node);
  if (!ts.isIdentifier(node)) return node;
  const declaration = checker.getSymbolAtLocation(node)?.valueDeclaration;
  if (!declaration || !ts.isVariableDeclaration(declaration) || !declaration.initializer || seen.has(declaration)) return node;
  seen.add(declaration);
  return binding(declaration.initializer, seen);
}
function values(node, seen = new Set()) {
  node = binding(node, seen);
  if (ts.isConditionalExpression(node)) return [...values(node.whenTrue, new Set(seen)), ...values(node.whenFalse, new Set(seen))];
  if (ts.isBinaryExpression(node)) return [...values(node.left, new Set(seen)), ...values(node.right, new Set(seen))];
  if (!ts.isObjectLiteralExpression(node)) return [];
  return node.properties.flatMap(property => {
    if (ts.isSpreadAssignment(property)) return values(property.expression, new Set(seen));
    if (!ts.isPropertyAssignment(property) && !ts.isShorthandPropertyAssignment(property)) return [];
    const name = property.name;
    const key = ts.isComputedPropertyName(name) ? binding(name.expression, new Set(seen)) : name;
    if (!ts.isIdentifier(key) && !ts.isStringLiteralLike(key)) return [];
    const value = binding(ts.isPropertyAssignment(property) ? property.initializer : property.name, new Set(seen));
    if (!ts.isStringLiteralLike(value) && !ts.isNumericLiteral(value) && !ts.isPrefixUnaryExpression(value)) return [];
    let css = value.text ?? value.getText();
    const prop = key.text.startsWith('--') ? key.text : key.text.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase());
    if ((ts.isNumericLiteral(value) || ts.isPrefixUnaryExpression(value)) && Number(css) && /^(padding|margin|gap|row-gap|column-gap|border.*radius)/.test(prop)) css += 'px';
    const line = value.getSourceFile().getLineAndCharacterOfPosition(value.getStart()).line + 1;
    return [{ line, css: `${prop}: ${css};` }];
  });
}
for (const file of program.getSourceFiles()) {
  const groups = [];
  function visit(node) {
    if (ts.isJsxAttribute(node) && node.name.getText() === 'style' && node.initializer && ts.isJsxExpression(node.initializer) && node.initializer.expression) groups.push(values(node.initializer.expression));
    ts.forEachChild(node, visit);
  }
  visit(file);
  output[file.fileName] = groups.filter(group => group.length);
}
process.stdout.write(JSON.stringify(output));
