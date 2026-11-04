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
      // 준비 페이지(prepare.html)와 뷰어가 진입점을 따로 갖는다. 준비 장면은 브라우저 검사가 그 주소를 직접 import 한다.
      lib: {
        entry: { viewer: join(source, 'src/main.tsx'), 'preparation-start': join(source, 'src/preparation/entry-start.ts'), 'preparation-scene': join(source, 'src/preparation/entry-scene.ts') },
        formats: ['es'],
        fileName: (_, name) => `js/${name}.js`,
      },
      // 기존 모듈은 같은 URL의 한 벌만 쓴다 — 번들에 사본이 들면 사전 · 마지막 상태 · 캡슐이 두 벌이 된다.
      // React 도 한 벌(js/react.js)을 두 페이지가 함께 쓴다 — 진입점마다 실으면 NFR-21 크기 상한을 넘는다. 준비 서버가 이 이름을 내준다.
      rolldownOptions: {
        external: id => id.startsWith(legacy),
        // 준비 장면은 뷰어와 함께 쓰는 모듈(사전 맥락 등)을 덧붙여 내보낸다 — 진입점 겉면 파일을 따로 두면 준비 서버가 모르는 이름이 생긴다.
        preserveEntrySignatures: 'allow-extension',
        output: {
          paths: id => id.startsWith(legacy) ? './js/' + id.slice(legacy.length) : id,
          chunkFileNames: 'js/[name].js',
          codeSplitting: { groups: [{ name: 'react', test: /node_modules/ }] },
        },
      },
    },
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  });
  const built = new Set(await files(temporary));
  for (const name of await files(join(source, 'legacy'))) {
    if (name.endsWith('.d.ts')) continue;
    // 청크 이름에 해시가 없어 기존 모듈과 같은 이름이면 그 청크를 덮는다.
    if (built.has(name)) throw Error(`번들 청크와 기존 모듈의 이름이 겹친다: ${name}`);
    await mkdir(dirname(join(temporary, name)), { recursive: true });
    await writeFile(join(temporary, name), await readFile(join(source, 'legacy', name)));
  }
  // 준비 페이지는 데몬이 뜨기 전 준비 서버가 내준다 — 그 서버가 아는 JS만 불러야 한다(plugin/cli/prevue_prepare.py).
  const served = name => /^js\/preparation[^/]*\.js$/.test(name) || ['js/strings.js', 'js/messages.js', 'js/react.js'].includes(name);
  const reached = new Set(), pending = ['js/preparation-start.js'];
  while (pending.length) {
    const name = pending.pop();
    if (reached.has(name)) continue;
    reached.add(name);
    if (!served(name)) throw Error(`준비 페이지가 준비 서버가 내주지 않는 ${name} 을 부른다`);
    const code = await readFile(join(temporary, name), 'utf8');
    for (const [, path] of code.matchAll(/(?:from|import)\s*["'](\.\/[^"']+)["']/g)) pending.push(join(dirname(name), path));
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
