// 이름의 가운데 줄임 — 레일 줄과 갤러리 카드가 함께 쓴다. CSS 줄임은 끝만 잘라 형제 파일이 똑같이 보인다.
const WORDS = /[A-Z]?[a-z0-9]+|[A-Z]+(?![a-z])|./g;
/** 꼬리 — 뒤쪽 낱말(CamelCase) 몇 개. 형제 파일은 앞이 같고 뒤가 달라서, 뒤를 자르면 셋이 똑같이 `DrinkDetailSc…`가 됐다. */
function tailOf(name: string) {
  const words = name.match(WORDS) || [name];
  let tail = '';
  for (let i = words.length - 1; i > 0; i--) {
    if (tail && (words[i] + tail).length > 12) break;
    tail = words[i] + tail;
  }
  return tail.length >= name.length - 2 ? '' : tail;
}

let context: CanvasRenderingContext2D | null = null;
export const measure = (s: string, font: string) => { context ??= document.createElement('canvas').getContext('2d')!; context.font = font; return context.measureText(s).width; };
export const fontOf = (el: Element) => { const cs = getComputedStyle(el); return `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; };

/** room 안에 드는 이름 — 넘치면 머리를 줄이고 꼬리는 남긴다(`Drink…OptionsHeader`). CSS 줄임은 끝만 자르고 글자 사이에 빈칸을 남긴다. */
export function fit(name: string, room: number, font: string) {
  if (measure(name, font) <= room) return name;
  // 좁으면 꼬리를 낱말 단위로 줄인다(`Dri…DetailScreen` → `Drink…Screen`) — 글자 단위로 깎으면 `P…ilScreen`가 된다.
  const full = tailOf(name);
  const words = full.match(WORDS) || [];
  const tails = words.map((_, i) => words.slice(i).join(''));
  for (const [tail, least] of [...tails.map(t => [t, 3] as const), [tails[tails.length - 1] || '', 1] as const]) {
    for (let k = name.length - tail.length - 1; k >= least; k--) {
      const s = name.slice(0, k) + '…' + tail;
      if (measure(s, font) <= room) return s;
    }
  }
  for (let j = 1; j < full.length; j++) {
    const s = name[0] + '…' + full.slice(j);
    if (measure(s, font) <= room) return s;
  }
  return name[0] + '…';
}

