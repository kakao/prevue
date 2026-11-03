// 빠른 열기의 매칭(D-56) — 친 글자가 순서대로 들어 있으면 맞다. 낱말 머리 · CamelHump(`RSC` → RealtimeSheetContent)에 가산점,
// 이어진 글자에 가산점을 준다. 화면과 데이터를 모르는 순수 함수라 매칭 규칙은 여기 한 곳에 있다.

const NEG = -1e9;
const SEP = /[/._\-\s]/;
const isUpper = c => c !== c.toLowerCase();

/** text[j]가 낱말의 머리인가 — 맨 앞, 구분자 뒤, 소문자 뒤의 대문자, 글자 뒤의 숫자. */
function head(text, j) {
  if (j === 0) return true;
  const a = text[j - 1], b = text[j];
  return SEP.test(a) || (isUpper(b) && !isUpper(a)) || (/\d/.test(b) && !/\d/.test(a));
}

/** q 가 text 에 맞으면 { score, idx }(맞은 글자 자리), 아니면 null. 가장 점수가 높은 자리를 고른다. */
export function fuzzy(q, text) {
  const n = q.length, m = text.length;
  if (!n) return { score: 0, idx: [] };
  if (n > m) return null;
  const ql = q.toLowerCase(), tl = text.toLowerCase();
  for (let i = 0, j = 0; i < n; j++) { if (j >= m) return null; if (tl[j] === ql[i]) i++; }   // 순서대로 들어 있지도 않으면 일찍 버린다
  const dp = Array.from({ length: n }, () => new Float64Array(m).fill(NEG));
  const back = Array.from({ length: n }, () => new Int32Array(m).fill(-1));
  for (let j = 0; j < m; j++) if (tl[j] === ql[0]) dp[0][j] = 1 + (head(text, j) ? 8 : 0) + (j === 0 ? 4 : 0) - j * .02;
  for (let i = 1; i < n; i++) {
    let run = NEG, runAt = -1;                       // dp[i-1][k], k <= j-2 중 가장 좋은 것 — 사이가 떨어진 매칭
    for (let j = i; j < m; j++) {
      if (j >= 2 && dp[i - 1][j - 2] > run) { run = dp[i - 1][j - 2]; runAt = j - 2; }
      if (tl[j] !== ql[i]) continue;
      const h = head(text, j) ? 8 : 0;
      const near = dp[i - 1][j - 1] > NEG ? dp[i - 1][j - 1] + 1 + 5 + h : NEG;   // 바로 이어진다
      const far = run > NEG ? run + 1 + h - 3 : NEG;   // 떨어지면 깎는다 — 흩어진 머리글자가 통째로 이어진 매칭을 이기지 않게
      if (near >= far && near > NEG) { dp[i][j] = near; back[i][j] = j - 1; }
      else if (far > NEG) { dp[i][j] = far; back[i][j] = runAt; }
    }
  }
  let best = NEG, at = -1;
  for (let j = 0; j < m; j++) if (dp[n - 1][j] > best) { best = dp[n - 1][j]; at = j; }
  if (at < 0) return null;
  const idx = new Array(n);
  for (let i = n - 1; i >= 0; i--) { idx[i] = at; at = back[i][at]; }
  return { score: best, idx };
}

const dirOf = f => (f.dir ??= f.rel.slice(0, f.rel.length - f.name.length).toLowerCase());

/** 파일명 > 프리뷰 함수 > 경로. 같은 글자가 파일명에 맞는 것이 함수에 맞는 것보다 앞선다. */
const WEIGHT = { name: 30, fn: 15, path: 0 };

/**
 * 파일 하나를 검색어에 견준다. 공백으로 나눈 낱말이 **모두** 어딘가(파일명 · 함수 · 디렉터리)에 맞아야 한다.
 * 돌려주는 것: { score, name: 파일명에서 맞은 자리, fns: Map(함수 → 맞은 자리) } 또는 null.
 */
export function matchFile(words, f) {
  let score = 0;
  const name = new Set(), fns = new Map();
  for (const w of words) {
    let best = null;
    const n = fuzzy(w, f.name);
    if (n) best = { s: n.score + WEIGHT.name, kind: "name", idx: n.idx };
    for (const fn of f.functions) {
      const r = fuzzy(w, fn);
      if (r && (!best || r.score + WEIGHT.fn > best.s)) best = { s: r.score + WEIGHT.fn, kind: "fn", fn, idx: r.idx };
    }
    // 경로는 이어진 글자로만 — 흩어진 글자를 허락하면 `feature/…` 아래 거의 모든 파일이 아무 낱말에나 맞는다(`feed` → feature/settings/…/Dialog).
    if (!best && dirOf(f).includes(w.toLowerCase())) best = { s: 10 + WEIGHT.path, kind: "path" };
    if (!best) return null;
    score += best.s;
    if (best.kind === "name") best.idx.forEach(i => name.add(i));
    else if (best.kind === "fn") { const s = fns.get(best.fn) || new Set(); best.idx.forEach(i => s.add(i)); fns.set(best.fn, s); }
  }
  return { score, name, fns };
}
