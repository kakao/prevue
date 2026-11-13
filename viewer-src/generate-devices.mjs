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

function body(raw, where) {
  keys(raw, ['bezel', 'radius', 'cam', 'btn'], where);
  const cam = keys(raw.cam, ['w', 'h', 'y', 'x'], `${where}.cam`, ['w', 'h', 'y']);
  for (const [name, value] of Object.entries(cam)) number(value, `${where}.cam.${name}`);
  if (!Array.isArray(raw.btn) || raw.btn.length > 5) throw Error(`${where}.btn: 5개 이하의 목록이 아니다`);
  const btn = raw.btn.map((entry, i) => {
    if (!Array.isArray(entry) || entry.length !== 3) throw Error(`${where}.btn[${i}]: [변, 위치, 길이]가 아니다`);
    const [side, at, len] = entry.map((v, k) => number(v, `${where}.btn[${i}][${k}]`));
    if (side !== 1 && side !== -1) throw Error(`${where}.btn[${i}]: 변은 1 또는 -1이다`);
    return { side, at, len };
  });
  while (btn.length < 5) { const last = btn[btn.length - 1]; btn.push({ side: last.side, at: last.at + last.len, len: 0 }); }
  return { bezel: number(raw.bezel, `${where}.bezel`), radius: number(raw.radius, `${where}.radius`), cam, btn };
}

function status(raw, where) {
  keys(raw, ['top', 'right', 'scale', 'time'], where);
  const time = keys(raw.time, ['cx', 'base', 'size'], `${where}.time`);
  for (const [name, value] of Object.entries(time)) number(value, `${where}.time.${name}`);
  return { top: number(raw.top, `${where}.top`), right: number(raw.right, `${where}.right`), s: number(raw.scale, `${where}.scale`), time };
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
    entry.look = Object.fromEntries(states.map(key => [key, { tone: look.tone, ...body(look[key], `${where}.look.${key}`) }]));
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
