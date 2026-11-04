// 대비 실측의 계산 한 벌 — tests/viewer/contrast.mjs 가 브라우저에 문자열로 넣고, Storybook 재료/Tokens 가 그대로 부른다.
// 문자열로 넘기므로 함수 밖의 것을 쓰지 않는다. 타입만 쓰는 TS 라 Node 가 타입을 지운 채 읽는다.
export type ContrastPair = { fg: string[]; bg: string[]; need: number };
export type ContrastRow = { theme: string; fg: string; bg: string; need: number; ratio: number };
type Rgba = { r: number; g: number; b: number; a: number };

// 반투명한 뒤는 그 아래 면에 겹친 색으로 잰다(bg 는 위에서 아래 순서). 면에서 풀리지 않는 역할은 missing 에 남긴다.
export function measureContrast(pairs: ContrastPair[], sheets: HTMLElement[]): { rows: ContrastRow[]; missing: string[] } {
  const missing = new Set<string>();
  const resolveRole = (sheet: HTMLElement, role: string): Rgba => {
    if (!getComputedStyle(sheet).getPropertyValue(`--${role}`).trim()) { missing.add(role); return { r: 0, g: 0, b: 0, a: 1 }; }
    const probe = document.createElement('i');
    probe.style.cssText = `position:absolute;visibility:hidden;color:var(--${role})`;
    sheet.append(probe);
    const c = (getComputedStyle(probe).color.match(/[\d.]+/g) || []).map(Number);
    probe.remove();
    return { r: c[0], g: c[1], b: c[2], a: c.length > 3 ? c[3] : 1 };
  };
  const over = (top: Rgba, under: Rgba): Rgba => ({ r: top.r * top.a + under.r * (1 - top.a), g: top.g * top.a + under.g * (1 - top.a), b: top.b * top.a + under.b * (1 - top.a), a: 1 });
  const layered = (sheet: HTMLElement, roles: string[]) => [...roles].reverse().map(r => resolveRole(sheet, r)).reduce((under, top) => over(top, under));
  const lum = (c: Rgba) => [c.r, c.g, c.b].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
  const ratio = (a: Rgba, b: Rgba) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
  const rows = sheets.flatMap(sheet => pairs.map(({ fg, bg, need }) =>
    ({ theme: sheet.dataset.theme || '', fg: fg.join(' / '), bg: bg.join(' / '), need, ratio: ratio(layered(sheet, fg), layered(sheet, bg)) })));
  return { rows, missing: [...missing] };
}
