import { build } from 'vite';
import { readFile, readdir, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateState } from './generate-state.mjs';

const source = dirname(fileURLToPath(import.meta.url));
const destination = resolve(source, '../plugin/viewer');
const check = process.argv.includes('--check');
const temporary = await mkdtemp(join(tmpdir(), 'prevue-viewer-'));
const legacy = join(source, 'legacy/js/');
const handWritten = name => name === 'tokens.css' || name === 'js/resize-scene.js' || name === 'prevue.svg' || name.startsWith('strings/');

async function files(directory, prefix = '') {
  return (await Promise.all((await readdir(directory, { withFileTypes: true })).map(async entry => {
    const name = prefix + entry.name;
    return entry.isDirectory() ? files(join(directory, entry.name), name + '/') : [name];
  }))).flat().sort();
}

try {
  await generateState(check);
  await build({
    configFile: false,
    root: source,
    publicDir: false,
    build: {
      outDir: temporary,
      emptyOutDir: false,
      target: 'es2022',
      minify: true,
      lib: { entry: join(source, 'src/main.tsx'), formats: ['es'], fileName: () => 'js/viewer.js' },
      // 기존 모듈은 같은 URL의 한 벌만 쓴다 — 번들에 사본이 들면 사전 · 마지막 상태 · 캡슐이 두 벌이 된다.
      rolldownOptions: {
        external: id => id.startsWith(legacy),
        output: { paths: id => id.startsWith(legacy) ? './js/' + id.slice(legacy.length) : id },
      },
    },
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  });
  for (const name of await files(join(source, 'legacy'))) {
    if (name.endsWith('.d.ts')) continue;
    await mkdir(dirname(join(temporary, name)), { recursive: true });
    await writeFile(join(temporary, name), await readFile(join(source, 'legacy', name)));
  }
  const expected = await files(temporary);
  const actual = (await files(destination)).filter(name => !handWritten(name));
  const changed = [];
  for (const name of new Set([...expected, ...actual])) {
    const want = expected.includes(name) ? await readFile(join(temporary, name)) : null;
    const have = await readFile(join(destination, name)).catch(() => null);
    if ((want && have && want.equals(have)) || (!want && !have)) continue;
    changed.push(name);
    if (!check) {
      if (!want) await rm(join(destination, name));
      else { await mkdir(dirname(join(destination, name)), { recursive: true }); await writeFile(join(destination, name), want); }
    }
  }
  if (check && changed.length) throw Error(`뷰어 생성물이 원본과 다르다: ${changed.join(', ')}. sh tools/gen-viewer.sh 를 실행한다`);
  console.log(check ? '뷰어 생성물이 원본과 맞다' : `뷰어 생성물 ${changed.length}개를 갱신했다`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
