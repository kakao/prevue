import { build } from 'vite';
import { readFile, readdir, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { generateState } from './generate-state.mjs';
import { generateDevices } from './generate-devices.mjs';

const source = dirname(fileURLToPath(import.meta.url));
const destination = resolve(source, '../plugin/viewer');
const check = process.argv.includes('--check');
const temporary = await mkdtemp(join(tmpdir(), 'prevue-viewer-'));
const server = await mkdtemp(join(tmpdir(), 'prevue-prerender-'));
const runtimeDir = join(source, 'src/runtime/');
const runtime = ['api', 'store', 'strings', 'messages', 'capsule', 'board', 'motion', 'resize-scene', 'devices'];
const separate = id => id.startsWith(runtimeDir);
const separatePath = id => './js/' + id.slice(runtimeDir.length).replace(/\.ts$/, '.js');
const handWritten = name => name === 'tokens.css' || name === 'prevue.svg' || name.startsWith('strings/');

async function files(directory, prefix = '') {
  return (await Promise.all((await readdir(directory, { withFileTypes: true })).map(async entry => {
    const name = prefix + entry.name;
    return entry.isDirectory() ? files(join(directory, entry.name), name + '/') : [name];
  }))).flat().sort();
}

try {
  await generateState(check);
  await generateDevices(check);
  await build({
    configFile: false,
    root: source,
    publicDir: false,
    build: {
      outDir: temporary,
      emptyOutDir: false,
      target: 'es2022',
      minify: true,
      lib: {
        entry: { viewer: join(source, 'src/main.tsx'), 'preparation-start': join(source, 'src/preparation/entry-start.ts'), 'preparation-scene': join(source, 'src/preparation/entry-scene.ts') },
        formats: ['es'],
        fileName: (_, name) => `js/${name}.js`,
      },
      rolldownOptions: {
        external: separate,
        preserveEntrySignatures: 'allow-extension',
        output: {
          paths: id => separate(id) ? separatePath(id) : id,
          chunkFileNames: 'js/[name].js',
          codeSplitting: { groups: [{ name: 'react', test: /node_modules/ }] },
        },
      },
    },
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  });
  const mainChunks = new Set(await files(temporary));
  for (const name of runtime) if (mainChunks.has(`js/${name}.js`)) throw Error(`번들 청크와 런타임 모듈의 이름이 겹친다: js/${name}.js`);
  for (const name of runtime) await build({
    configFile: false,
    root: source,
    publicDir: false,
    logLevel: 'warn',
    build: {
      outDir: temporary,
      emptyOutDir: false,
      target: 'es2022',
      minify: true,
      lib: { entry: join(runtimeDir, `${name}.ts`), formats: ['es'], fileName: () => `js/${name}.js` },
      rolldownOptions: {
        external: id => id.startsWith(runtimeDir) && id !== join(runtimeDir, `${name}.ts`),
        output: { paths: id => separate(id) ? separatePath(id) : id },
      },
    },
  });
  await build({
    configFile: false,
    root: source,
    publicDir: false,
    logLevel: 'warn',
    ssr: { noExternal: true },
    build: { ssr: join(source, 'src/prerender.tsx'), outDir: server, emptyOutDir: true, target: 'node22', minify: false,
      rolldownOptions: { output: { entryFileNames: 'prerender.mjs' } } },
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  });
  const { prerendered } = await import(pathToFileURL(join(server, 'prerender.mjs')).href);
  const shells = prerendered();
  const built = new Set(await files(temporary));
  for (const name of await files(join(source, 'static'))) {
    if (built.has(name)) throw Error(`빌드 출력과 정적 파일의 이름이 겹친다: ${name}`);
    await mkdir(dirname(join(temporary, name)), { recursive: true });
    let body = await readFile(join(source, 'static', name));
    if (name === 'index.html') {
      let html = body.toString('utf8');
      for (const [slot, markup] of Object.entries(shells)) {
        if (!html.includes(`<!-- prerender:${slot} -->`)) throw Error(`index.html 에 prerender:${slot} 자리가 없다`);
        html = html.replace(`<!-- prerender:${slot} -->`, () => markup);
      }
      body = Buffer.from(html);
    }
    await writeFile(join(temporary, name), body);
  }
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
  await rm(server, { recursive: true, force: true });
}
