import { readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const specs = resolve(root, '../plugin/devices');
const target = resolve(root, 'legacy/js/devices.js');

const keys = (value, allowed, where, required = allowed) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error(`${where}: 객체가 아니다`);
  for (const key of Object.keys(value)) if (!allowed.includes(key)) throw Error(`${where}: 모르는 필드 ${key}`);
  for (const key of required) if (!(key in value)) throw Error(`${where}: ${key} 가 없다`);
  return value;
};
const number = (value, where) => { if (typeof value !== 'number' || !Number.isFinite(value)) throw Error(`${where}: 숫자가 아니다`); return value; };
const dp = (px, dpi) => Math.round(number(px, 'px') / dpi * 160 * 100) / 100;
const BARS = ['aosp', 'oneui', 'pixel', 'ios'];

// 화면 모서리는 사이트의 측정값(자세마다 cornerRadius)이 있으면 그것이고, 없을 때만 look.radius(그림 값)다 — 둘 다 있으면 어느 쪽이 맞는지 알 수 없어 실패한다.
function measuredRadius(screen, dpi, ios, where) {
  const found = new Set(), postures = Object.entries(screen.postures);
  for (const [name, posture] of postures) {
    const c = posture.cornerRadius;
    if (c === undefined) continue;
    const at = `${where}.postures.${name}.cornerRadius`;
    if (ios) { found.add(number(keys(c, ['pt'], at).pt, at)); continue; }
    keys(c, ['px', 'dp'], at);
    if (Math.abs(dp(c.px, dpi) - number(c.dp, at)) > .01) throw Error(`${at}: px ÷ 밀도가 dp 와 다르다`);
    found.add(c.dp);
  }
  const have = postures.filter(([, posture]) => posture.cornerRadius !== undefined).length;
  if (have && have !== postures.length) throw Error(`${where}: 모서리 반경이 일부 자세에만 있다`);
  if (found.size > 1) throw Error(`${where}: 자세마다 모서리 반경이 다르다 ${[...found]}`);
  return found.size ? [...found][0] : undefined;
}

function body(raw, where, measured) {
  keys(raw, ['bezel', 'radius', 'cam', 'btn', 'home'], where, ['bezel', 'cam', 'btn']);
  const bezel = typeof raw.bezel === 'object' ? keys(raw.bezel, ['side', 'ends'], `${where}.bezel`) : { side: raw.bezel };
  if (bezel.ends !== undefined && number(bezel.ends, `${where}.bezel.ends`) < number(bezel.side, `${where}.bezel.side`)) throw Error(`${where}.bezel: ends 가 side 보다 얇다`);
  if (raw.home !== undefined && (raw.home !== true || bezel.ends === undefined)) throw Error(`${where}.home: true 만 받고, 홈 버튼 자리인 bezel.ends 가 있어야 한다`);
  if (measured !== undefined && 'radius' in raw) throw Error(`${where}: radius 가 measured 에도 look 에도 있다`);
  if (measured === undefined && !('radius' in raw)) throw Error(`${where}: radius 가 없다`);
  const cam = keys(raw.cam, ['w', 'h', 'y', 'x', 'notch', 'edge'], `${where}.cam`, ['w', 'h', 'y']);
  for (const [name, value] of Object.entries(cam)) if (name !== 'edge') number(value, `${where}.cam.${name}`);
  if (cam.edge !== undefined && (cam.edge !== 'right' || cam.notch === undefined)) throw Error(`${where}.cam.edge: right 만 받고, 가장자리에 붙는 notch 와 함께 쓴다`);
  if (cam.notch !== undefined && (cam.y !== 0 || cam.notch < 0 || cam.notch > Math.min(cam.w, cam.h) / 2)) throw Error(`${where}.cam.notch: 가장자리에 붙으려면 y 가 0 이고, 반경은 짧은 변의 절반 이하다`);
  if (!Array.isArray(raw.btn) || raw.btn.length > 5) throw Error(`${where}.btn: 5개 이하의 목록이 아니다`);
  const btn = raw.btn.map((entry, i) => {
    if (!Array.isArray(entry) || entry.length !== 3) throw Error(`${where}.btn[${i}]: [변, 위치, 길이]가 아니다`);
    const [side, at, len] = entry.map((v, k) => number(v, `${where}.btn[${i}][${k}]`));
    if (side !== 1 && side !== -1) throw Error(`${where}.btn[${i}]: 변은 1 또는 -1이다`);
    return { side, at, len };
  });
  while (btn.length < 5) { const last = btn[btn.length - 1]; btn.push({ side: last.side, at: last.at + last.len, len: 0 }); }
  return { bezel: number(bezel.side, `${where}.bezel`), ...bezel.ends === undefined ? {} : { ends: bezel.ends }, ...raw.home ? { home: true } : {}, radius: measured ?? number(raw.radius, `${where}.radius`), cam, btn };
}

function status(raw, where) {
  keys(raw, ['top', 'right', 'left', 'scale', 'time'], where, ['top', 'right', 'scale', 'time']);
  const time = keys(raw.time, ['cx', 'base', 'size'], `${where}.time`);
  for (const [name, value] of Object.entries(time)) number(value, `${where}.time.${name}`);
  return { top: number(raw.top, `${where}.top`), right: number(raw.right, `${where}.right`), ...raw.left === undefined ? {} : { left: number(raw.left, `${where}.left`) }, s: number(raw.scale, `${where}.scale`), time };
}

export function deviceTable(specList) {
  const devices = specList.map(spec => {
    const where = spec.id;
    keys(spec, ['id', 'label', 'order', 'measured', 'look'], where);
    const m = spec.measured, screens = m.screens, folds = 'cover' in screens;
    keys(screens, folds ? ['open', 'cover'] : ['open'], `${where}.measured.screens`);
    const look = keys(spec.look, ['bar', 'short', 'tone', 'open', ...(folds ? ['cover'] : []), 'status'], `${where}.look`, ['bar', 'short', 'tone', 'open', ...(folds ? ['cover'] : [])]);
    if (!BARS.includes(look.bar)) throw Error(`${where}.look.bar: ${look.bar}`);
    if (look.bar === 'ios' && !folds && !look.status) throw Error(`${where}: iOS 홑 기기에는 look.status 가 필요하다`);
    if (look.status && (look.bar !== 'ios' || folds)) throw Error(`${where}: look.status 는 iOS 홑 기기만 갖는다`);
    const panel = key => {
      const s = screens[key], out = { w: dp(s.widthPx, m.dpi), h: dp(s.heightPx, m.dpi) };
      if (s.hingePx !== undefined) out.hinge = dp(s.hingePx, m.dpi);
      return out;
    };
    const states = folds ? ['cover', 'open'] : ['open'], entry = { name: spec.label, short: look.short, fold: folds };
    for (const key of states) entry[key] = panel(key);
    entry.look = Object.fromEntries(states.map(key => [key, { tone: look.tone, ...body(look[key], `${where}.look.${key}`, measuredRadius(screens[key], m.dpi, look.bar === 'ios', `${where}.measured.screens.${key}`)) }]));
    if (look.status) entry.status = status(look.status, `${where}.look.status`);
    return { order: number(spec.order, `${where}.order`), id: spec.id, bar: look.bar, entry };
  }).sort((a, b) => a.order - b.order);
  const ids = devices.map(d => d.id);
  if (new Set(ids).size !== ids.length) throw Error('기기 id 가 겹친다');
  const table = Object.fromEntries(devices.map(d => [d.id, d.entry]));
  const menu = [['Android', devices.filter(d => d.bar !== 'ios')], ['iPhone', devices.filter(d => d.bar === 'ios')]]
    .map(([group, list]) => ({ group, ids: list.map(d => d.id) }));
  return { table, menu };
}

export async function readSpecs() {
  const names = (await readdir(specs)).filter(name => name.endsWith('.json')).sort();
  return Promise.all(names.map(async name => JSON.parse(await readFile(resolve(specs, name), 'utf8'))));
}

export async function generateDevices(check = false) {
  const { table, menu } = deviceTable(await readSpecs());
  const output = '// 생성물이다. plugin/devices/*.json 을 고치고 sh tools/gen-viewer.sh 로 만든다.\n' +
    '// 번들 밖 한 벌이다 — resize-scene.js 와 번들이 같은 주소에서 읽는다(motion.js 와 같은 이유).\n' +
    `export const DEVICES = ${JSON.stringify(table, null, 2)};\n\n` +
    `export const DEVICE_MENU = ${JSON.stringify(menu, null, 2)};\n`;
  if (check) {
    if (await readFile(target, 'utf8').catch(() => '') !== output) throw Error('기기 표가 스펙과 다르다. sh tools/gen-viewer.sh 를 실행한다');
  } else await writeFile(target, output);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await generateDevices(process.argv.includes('--check'));
