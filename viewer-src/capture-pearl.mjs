// Storybook 재료 — fixtures/pearl 의 PearlPreviews.kt 보드(30장)를 실제 데몬에서 받아 stories/pearl/ 에 둔다.
// 상태는 데몬이 보낸 그대로이고 저장소 경로는 <repo>, 홈은 ~ 로 바꾼다. 그림은 JPG 로 줄인다(macOS 의 sips) —
// 카드의 최대 배율(300/360px/dp)을 2배 화면에서 볼 만큼(5/3px/dp)만 남긴다.
// 사용: node capture-pearl.mjs <이 체크아웃의 pearl 뷰어 URL>
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const viewer = process.argv[2];
if (!viewer) throw Error('node capture-pearl.mjs <pearl 뷰어 URL>');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'fixtures/pearl/feature/pearl/src/main/kotlin/com/example/pearl/feature/pearl/PearlPreviews.kt');
const out = join(root, 'viewer-src/stories/pearl');
const url = path => new URL(path, viewer);
const read = () => fetch(url('/viewer/state')).then(r => r.json());
const post = (path, body) => fetch(url(path), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

const status = await fetch(url('/status')).then(r => r.json());
if (status.root !== join(root, 'plugin')) throw Error(`다른 체크아웃의 데몬이다: ${status.root}`);
const before = await read();
await post('/viewer/open', { file });
let state = await read();
const drawn = s => s.screen === 'board' && s.board?.file === file && !s.busy && s.board.groups.every(g => g.cards.every(c => c.rendered && c.ok));
for (const end = Date.now() + 120_000; !drawn(state) && Date.now() < end; state = await read()) await new Promise(r => setTimeout(r, 200));
if (!drawn(state)) throw Error('PearlPreviews.kt 보드를 다 그리지 못했다');

const temporary = await mkdtemp(join(tmpdir(), 'prevue-pearl-'));
try {
  await mkdir(out, { recursive: true });
  for (const name of await readdir(out)) await rm(join(out, name));
  for (const card of state.board.groups.flatMap(g => g.cards)) {
    const png = join(temporary, `${card.index}.png`);
    await writeFile(png, Buffer.from(await fetch(url(card.imageUrl)).then(r => r.arrayBuffer())));
    const width = Math.ceil(card.widthDp * 5 / 3);
    execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '75', '--resampleWidth', String(width), png, '--out', join(out, `${card.index}.jpg`)], { stdio: 'ignore' });
  }
  await writeFile(join(out, 'state.json'), JSON.stringify(state, null, 2).replaceAll(root, '<repo>').replaceAll(homedir(), '~') + '\n');
} finally {
  await rm(temporary, { recursive: true, force: true });
  // 이 스크립트가 연 탭이면 닫고 보던 탭으로 돌아간다.
  const opened = state.tabs.find(t => t.active);
  if (opened && !before.tabs.some(t => t.key === opened.key)) await post('/viewer/close', { key: opened.key });
  const back = before.tabs.find(t => t.active);
  if (back) await post('/viewer/tab', { key: back.key });
}
console.log(`${state.board.groups.flatMap(g => g.cards).length}장을 ${out} 에 담았다`);
