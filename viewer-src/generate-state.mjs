import { readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const contracts = resolve(root, '../plugin/daemon/daemon/src/test/contract');

function shape(schemas) {
  const parts = new Set();
  const objects = schemas.filter(value => value && !Array.isArray(value) && typeof value === 'object');
  const arrays = schemas.filter(Array.isArray);
  for (const value of schemas.filter(value => typeof value === 'string')) {
    if (!['null', 'string', 'number', 'boolean', 'empty'].includes(value)) throw Error(`알 수 없는 계약 타입: ${value}`);
    parts.add(value === 'empty' ? 'unknown' : value);
  }
  if (objects.length) {
    const keys = [...new Set(objects.flatMap(Object.keys))].sort();
    parts.add(keys.length ? '{\n' + keys.map(key => {
      const values = objects.filter(value => key in value).map(value => value[key]);
      return `${JSON.stringify(key)}${values.length < objects.length ? '?' : ''}: ${shape(values)};`;
    }).join('\n') + '\n}' : 'Record<string, unknown>');
  }
  if (arrays.length) {
    const elements = arrays.flat().filter(value => value !== 'empty');
    parts.add(`Array<${elements.length ? shape(elements) : 'unknown'}>`);
  }
  return [...parts].sort().join(' | ');
}

export async function generateState(check = false) {
  const names = (await readdir(contracts)).filter(name => /^viewer\.state\..*\.json$/.test(name)).sort();
  if (!names.length) throw Error('viewer.state 계약이 없다');
  const schemas = await Promise.all(names.map(async name => JSON.parse(await readFile(resolve(contracts, name), 'utf8')).schema));
  const output = '// 생성물이다. viewer.state.*.json을 고치고 sh tools/gen-viewer.sh로 만든다.\n' +
    `export type ContractState = ${shape(schemas)};\n`;
  const target = resolve(root, 'src/contract-state.ts');
  if (check) {
    if (await readFile(target, 'utf8').catch(() => '') !== output) throw Error('계약 상태 타입이 원본과 다르다. sh tools/gen-viewer.sh 를 실행한다');
  } else await writeFile(target, output);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await generateState(process.argv.includes('--check'));
