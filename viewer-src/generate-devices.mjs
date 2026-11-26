import { readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const specs = resolve(root, '../plugin/devices');
const target = resolve(root, 'src/runtime/devices.ts');

const keys = (value, allowed, where, required = allowed) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error(`${where}: 객체가 아니다`);
  for (const key of Object.keys(value)) if (!allowed.includes(key)) throw Error(`${where}: 모르는 필드 ${key}`);
  for (const key of required) if (!(key in value)) throw Error(`${where}: ${key} 가 없다`);
  return value;
};
const number = (value, where) => { if (typeof value !== 'number' || !Number.isFinite(value)) throw Error(`${where}: 숫자가 아니다`); return value; };
const dp = (px, dpi) => Math.round(number(px, 'px') / dpi * 160 * 100) / 100;
const BARS = ['aosp', 'oneui', 'pixel', 'ios'];

const corners = (value, where) => {
  const list = Array.isArray(value) ? value : [value, value, value, value];
  if (list.length !== 4) throw Error(`${where}: 숫자 하나이거나 [좌상, 우상, 우하, 좌하] 넷이다`);
  return list.map((v, i) => number(v, `${where}[${i}]`));
};
function measuredRadius(screen, dpi, ios, where) {
  const found = new Set(), postures = Object.entries(screen.postures);
  for (const [name, posture] of postures) {
    const c = posture.cornerRadius;
    if (c === undefined) continue;
    const at = `${where}.postures.${name}.cornerRadius`;
    if (ios) { found.add(JSON.stringify(corners(keys(c, ['pt'], at).pt, `${at}.pt`))); continue; }
    keys(c, ['px', 'dp'], at);
    const pxs = corners(c.px, `${at}.px`), dps = corners(c.dp, `${at}.dp`);
    if (Array.isArray(c.px) !== Array.isArray(c.dp)) throw Error(`${at}: px 와 dp 의 모양이 다르다`);
    pxs.forEach((v, i) => { if (Math.abs(dp(v, dpi) - dps[i]) > .01) throw Error(`${at}: px ÷ 밀도가 dp 와 다르다`); });
    found.add(JSON.stringify(dps));
  }
  const have = postures.filter(([, posture]) => posture.cornerRadius !== undefined).length;
  if (have && have !== postures.length) throw Error(`${where}: 모서리 반경이 일부 자세에만 있다`);
  if (found.size > 1) throw Error(`${where}: 자세마다 모서리 반경이 다르다 ${[...found]}`);
  return found.size ? JSON.parse([...found][0]) : undefined;
}

function cutout(raw, where, size) {
  keys(raw, ['box', 'holes'], where, ['box']);
  const box = keys(raw.box, ['w', 'h', 'y', 'x', 'notch', 'edge'], `${where}.box`, ['w', 'h', 'y']);
  for (const [name, value] of Object.entries(box)) if (name !== 'edge') number(value, `${where}.box.${name}`);
  if (box.w <= 0 || box.h <= 0) throw Error(`${where}.box: 크기가 0 이다 — 카메라가 없는 화면은 cutouts 를 비운다`);
  if (box.edge !== undefined && (!['right', 'bottom'].includes(box.edge) || box.notch === undefined)) throw Error(`${where}.box.edge: right · bottom 만 받고, 가장자리에 붙는 notch 와 함께 쓴다`);
  if (box.notch !== undefined && (box.y !== 0 || box.notch < 0 || box.notch > Math.min(box.w, box.h) / 2)) throw Error(`${where}.box.notch: 가장자리에 붙으려면 y 가 0 이고, 반경은 짧은 변의 절반 이하다`);
  if (raw.holes === undefined) return { box, draw: [box] };
  if (!Array.isArray(raw.holes) || !raw.holes.length) throw Error(`${where}.holes: 하나 이상의 목록이 아니다`);
  const [W, H] = size, x = box.x ?? .5, near = .01;
  const area = box.edge === 'right' ? { l: W - box.y - box.h, t: x * H - box.w / 2, r: W - box.y, b: x * H + box.w / 2 }
    : box.edge === 'bottom' ? { l: x * W - box.w / 2, t: H - box.y - box.h, r: x * W + box.w / 2, b: H - box.y }
    : { l: x * W - box.w / 2, t: box.y, r: x * W + box.w / 2, b: box.y + box.h };
  const draw = raw.holes.map((hole, i) => {
    const at = `${where}.holes[${i}]`;
    keys(hole, ['cx', 'cy', 'd', 'lens'], at, ['cx', 'cy', 'd']);
    const cx = number(hole.cx, `${at}.cx`), cy = number(hole.cy, `${at}.cy`), d = number(hole.d, `${at}.d`), r = d / 2;
    if (hole.lens !== undefined && hole.lens !== true) throw Error(`${at}.lens: true 만 받는다`);
    if (d <= 0 || cx - r < area.l - near || cy - r < area.t - near || cx + r > area.r + near || cy + r > area.b + near) throw Error(`${at}: 구멍이 배제 상자 안에 들지 않는다`);
    return { w: d, h: d, y: cy - r, x: cx / W, ...hole.lens ? { lens: true } : {} };
  });
  return { box, draw };
}

function body(raw, where, measured, size) {
  keys(raw, ['bezel', 'radius', 'cutouts', 'btn', 'home'], where, ['bezel', 'cutouts', 'btn']);
  const bezel = typeof raw.bezel === 'object' ? keys(raw.bezel, ['side', 'ends'], `${where}.bezel`) : { side: raw.bezel };
  if (bezel.ends !== undefined && number(bezel.ends, `${where}.bezel.ends`) < number(bezel.side, `${where}.bezel.side`)) throw Error(`${where}.bezel: ends 가 side 보다 얇다`);
  if (raw.home !== undefined && (raw.home !== true || bezel.ends === undefined)) throw Error(`${where}.home: true 만 받고, 홈 버튼 자리인 bezel.ends 가 있어야 한다`);
  if (measured !== undefined && 'radius' in raw) throw Error(`${where}: radius 가 measured 에도 look 에도 있다`);
  if (measured === undefined && !('radius' in raw)) throw Error(`${where}: radius 가 없다`);
  if (!Array.isArray(raw.cutouts)) throw Error(`${where}.cutouts: 목록이 아니다`);
  const cutouts = raw.cutouts.map((entry, i) => cutout(entry, `${where}.cutouts[${i}]`, size));
  if (!Array.isArray(raw.btn) || raw.btn.length < 1 || raw.btn.length > 5) throw Error(`${where}.btn: 1개 이상 5개 이하의 목록이 아니다`);
  const btn = raw.btn.map((entry, i) => {
    if (!Array.isArray(entry) || entry.length !== 3) throw Error(`${where}.btn[${i}]: [변, 위치, 길이]가 아니다`);
    const [side, at, len] = entry.map((v, k) => number(v, `${where}.btn[${i}][${k}]`));
    if (side !== 1 && side !== -1) throw Error(`${where}.btn[${i}]: 변은 1 또는 -1이다`);
    return { side, at, len };
  });
  while (btn.length < 5) { const last = btn[btn.length - 1]; btn.push({ side: last.side, at: last.at + last.len, len: 0 }); }
  return { bezel: number(bezel.side, `${where}.bezel`), ...bezel.ends === undefined ? {} : { ends: bezel.ends }, ...raw.home ? { home: true } : {}, radius: measured ?? corners(raw.radius, `${where}.radius`), cuts: cutouts.map(c => c.box), cams: cutouts.flatMap(c => c.draw), btn };
}

function status(raw, where) {
  keys(raw, ['top', 'right', 'left', 'scale', 'time'], where, ['top', 'right', 'scale', 'time']);
  const time = keys(raw.time, ['cx', 'base', 'size'], `${where}.time`);
  for (const [name, value] of Object.entries(time)) number(value, `${where}.time.${name}`);
  return { top: number(raw.top, `${where}.top`), right: number(raw.right, `${where}.right`), ...raw.left === undefined ? {} : { left: number(raw.left, `${where}.left`) }, s: number(raw.scale, `${where}.scale`), time };
}

function plate(look, where) {
  const hinge = keys(look.hinge, ['axis', 'gap', 'blur'], `${where}.hinge`, ['axis', 'gap']);
  if (hinge.blur !== undefined && hinge.blur !== true) throw Error(`${where}.hinge.blur: true 만 받는다`);
  if (!['width', 'height'].includes(hinge.axis)) throw Error(`${where}.hinge.axis: width · height 만 받는다`);
  const thickness = number(look.thickness, `${where}.thickness`), gap = number(hinge.gap, `${where}.hinge.gap`);
  if (thickness <= 0 || gap < 0) throw Error(`${where}: thickness 는 0보다 크고 hinge.gap 은 0 이상이다`);
  return { thickness, gap, axis: hinge.axis, ...hinge.blur ? { blur: true } : {} };
}

export function deviceTable(specList) {
  const devices = specList.map(spec => {
    const where = spec.id;
    keys(spec, ['id', 'label', 'order', 'measured', 'look'], where);
    const m = spec.measured, screens = m.screens, folds = 'cover' in screens;
    keys(screens, folds ? ['open', 'cover'] : ['open'], `${where}.measured.screens`);
    const foldKeys = folds ? ['cover', 'thickness', 'hinge'] : [];
    const look = keys(spec.look, ['bar', 'short', 'tone', 'open', ...foldKeys, 'status'], `${where}.look`, ['bar', 'short', 'tone', 'open', ...foldKeys]);
    if (!BARS.includes(look.bar)) throw Error(`${where}.look.bar: ${look.bar}`);
    if (!/^#[0-9a-f]{6}$/i.test(look.tone)) throw Error(`${where}.look.tone: #rrggbb 가 아니다 — 접기 장면이 빛에 맞춰 채널을 나눠 계산한다`);
    if (look.bar === 'ios' && !folds && !look.status) throw Error(`${where}: iOS 홑 기기에는 look.status 가 필요하다`);
    if (look.status && (look.bar !== 'ios' || folds)) throw Error(`${where}: look.status 는 iOS 홑 기기만 갖는다`);
    const dpiOf = key => screens[key].dpi === undefined ? number(m.dpi, `${where}.measured.dpi`) : number(screens[key].dpi, `${where}.measured.screens.${key}.dpi`);
    const cutIn = screen => Object.fromEntries(Object.entries(screen.postures).map(([name, posture]) => {
      const edges = posture.insets ? posture.insets.displayCutout?.dp ?? {} : { ...posture.safeArea, bottom: 0 };
      return [name, `${edges.top || edges.bottom ? 'w' : ''}${edges.left || edges.right ? 'h' : ''}`];
    }));
    const panel = key => {
      const s = screens[key], dpi = dpiOf(key), out = { w: dp(s.widthPx, dpi), h: dp(s.heightPx, dpi), cutIn: cutIn(s) };
      if (s.hingePx !== undefined) out.hinge = dp(s.hingePx, dpi);
      if (Object.keys(s.postures).length === 1) out.fixed = true;
      return out;
    };
    const states = folds ? ['cover', 'open'] : ['open'], entry = { name: spec.label, short: look.short, fold: folds };
    for (const key of states) entry[key] = panel(key);
    entry.look = Object.fromEntries(states.map(key => [key, { tone: look.tone, ...body(look[key], `${where}.look.${key}`, measuredRadius(screens[key], dpiOf(key), look.bar === 'ios', `${where}.measured.screens.${key}`), [entry[key].w, entry[key].h]) }]));
    if (look.status) status(look.status, `${where}.look.status`);
    if (folds) entry.plate = plate(look, `${where}.look`);
    return { order: number(spec.order, `${where}.order`), id: spec.id, entry };
  }).sort((a, b) => a.order - b.order);
  const ids = devices.map(d => d.id);
  if (new Set(ids).size !== ids.length) throw Error('기기 id 가 겹친다');
  const table = Object.fromEntries(devices.map(d => [d.id, d.entry]));
  const lineOf = d => d.entry.name.split(' ')[0];
  for (const d of devices) {
    const short = d.entry.short;
    if (short === lineOf(d) || short.startsWith(`${lineOf(d)} `)) throw Error(`${d.id}.look.short: 묶음 이름 ${lineOf(d)} 로 시작한다 — 메뉴의 묶음 머리가 이미 그 이름이다`);
  }
  const menu = [...new Set(devices.map(lineOf))].map(group => ({ group, ids: devices.filter(d => lineOf(d) === group).map(d => d.id) }));
  return { table, menu };
}

export async function readSpecs() {
  const names = (await readdir(specs)).filter(name => name.endsWith('.json')).sort();
  return Promise.all(names.map(async name => JSON.parse(await readFile(resolve(specs, name), 'utf8'))));
}

const TYPES = `export type DeviceCam = { w: number; h: number; y: number; x?: number; notch?: number; edge?: 'right' | 'bottom'; lens?: true };
export type DeviceBody = { tone: string; bezel: number; ends?: number; home?: true; radius: [number, number, number, number]; cuts: DeviceCam[]; cams: DeviceCam[]; btn: { side: 1 | -1; at: number; len: number }[] };
export type DevicePanel = { w: number; h: number; hinge?: number; fixed?: true; cutIn: Record<string, '' | 'w' | 'h' | 'wh'> };
export type DeviceEntry = {
  name: string; short: string; fold: boolean;
  open: DevicePanel; cover?: DevicePanel;
  look: { open: DeviceBody; cover?: DeviceBody };
  plate?: { thickness: number; gap: number; axis: 'width' | 'height'; blur?: true };
};

`;

export async function generateDevices(check = false) {
  const { table, menu } = deviceTable(await readSpecs());
  const output = '// 생성물이다. plugin/devices/*.json 을 고치고 sh tools/gen-viewer.sh 로 만든다.\n' +
    TYPES +
    `export const DEVICES: Record<string, DeviceEntry> = ${JSON.stringify(table, null, 2)};\n\n` +
    `export const DEVICE_MENU: { group: string; ids: string[] }[] = ${JSON.stringify(menu, null, 2)};\n`;
  if (check) {
    if (await readFile(target, 'utf8').catch(() => '') !== output) throw Error('기기 표가 스펙과 다르다. sh tools/gen-viewer.sh 를 실행한다');
  } else await writeFile(target, output);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await generateDevices(process.argv.includes('--check'));
