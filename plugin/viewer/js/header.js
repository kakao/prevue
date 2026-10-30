// 헤더 왼쪽 — 워드마크 · 대상 앱 록업(아이콘 모서리에 Android · KMP 배지) · 부제(폴더 ⑂ 브랜치 · 모듈 · (소스 세트) · 변형). 부제에서 누를 수 있는 칸은 폴더 · 브랜치뿐이다(D-60).
import { $, store } from "./store.js";
import { phrase } from "./strings.js";
import { get, post } from "./api.js";
import { flash } from "./capsule.js";
import { robot, kmp } from "./platform.js";

const appName = $("appName"), tile = $("appTile"), appEl = $("app"), badge = $("appBadge");
const pjDir = $("pjDir"), pjBr = $("pjBr"), pjBrName = $("pjBrName"), pjRest = $("pjRest");
const dirPop = $("dirPop"), dirPath = $("dirPath"), dirReveal = $("dirReveal");

// 대상 앱의 런처 아이콘과 이름(B1 · H12) — 폰에서 보이는 그대로. 데몬 하나가 앱 하나라 한 번만 묻는다.
let app = null;
get("/app.json").then(r => r.json()).then(a => {
  app = a;
  if (a.prevue) $("brand").title = `Prevue ${a.prevue}`;
  dirReveal.hidden = !a.reveal;
  if (store.st) renderHeader(store.st);
  if (!a.icon) return;
  const img = $("appIcon");
  img.addEventListener("load", () => { img.hidden = false; tile.hidden = true; }, { once: true });
  img.src = "/app-icon.png";
}).catch(() => { app = {}; });

// 이니셜 타일의 바탕 — 이름에서 고른 차분한 색 하나(연락처 앱의 이니셜처럼). 같은 이름은 늘 같은 색이다. 색은 tokens.css 의 --avatar-*.
const TILE = Array.from({ length: 8 }, (_, i) => `var(--avatar-${i + 1})`);
const hue = s => TILE[[...s].reduce((h, c) => (h * 31 + c.codePointAt(0)) >>> 0, 7) % TILE.length];

export function renderHeader(s) {
  const h = s.header;
  // 파일명은 지금 탭이 말한다 — 여기는 앱(제목)과 폴더 · 브랜치 · 모듈 · 변형(부제)만. 앱 이름을 못 읽으면 폴더가 제목이다.
  const title = (app && app.name) || h.repoLeaf;
  appName.textContent = title;
  pjDir.textContent = h.repoLeaf;
  // 줄은 `/` 뒤에서만 바꾼다 — 폴더 이름 중간에서 끊기지 않게.
  dirPath.replaceChildren(...h.repo.split(/(?<=\/)/).flatMap(p => [p, document.createElement("wbr")]));
  pjBr.hidden = !h.branch;
  pjBrName.textContent = h.branch || "";
  renderRest(h);
  // 첫 상태가 오기 전(저장소가 비었다)에는 종류를 모른다 — 배지를 숨겨 두어 Android 로 잘못 말하지 않는다.
  if (h.repo) renderBadge(h.kmp);
  tile.textContent = [...title][0] || "";
  tile.style.background = hue(title);
  // 브라우저 탭은 파일 — 앱(B6). macOS 창 제목처럼 문서가 앞이라 좁은 탭에서도 파일이 남는다. Prevue 는 파비콘이 말한다.
  const t = (s.tabs || []).find(t => t.active);
  document.title = t ? `${t.name} — ${title}` : title;
}

// 모듈 · (소스 세트) · 변형. 상태가 올 때마다 불리므로 그대로면 건드리지 않는다 — 다시 만들면 띄워 둔 툴팁이 꺼진다.
function renderRest(h) {
  const key = [h.module, h.sourceSet, h.variant].join("|");
  if (pjRest.dataset.key === key) return;
  pjRest.dataset.key = key;
  // 소스 세트는 KMP 모듈의 파일일 때만 — 툴팁이 "Android 빌드로 그렸다"를 말한다.
  const ss = h.sourceSet && Object.assign(document.createElement("span"), { textContent: h.sourceSet, title: phrase("header.sourceSet", { variant: h.variant }) });
  pjRest.replaceChildren(...[h.module, ss, h.variant].filter(Boolean).flatMap(p => [" · ", p]));
}

function renderBadge(isKmp) {
  const kind = isKmp ? "kmp" : "android";
  if (badge.dataset.kind === kind) return;
  badge.dataset.kind = kind;
  badge.innerHTML = isKmp ? kmp("ab") : robot("ab", true);
  badge.title = phrase(`header.platform.${kind}`);
  badge.setAttribute("aria-label", badge.title);
  badge.hidden = false;
}

function copy(text, what) {
  navigator.clipboard.writeText(text).then(() => flash(phrase("header.copied", { what, text })), () => flash(text));
}

// 브랜치 — 하는 일은 대개 붙여 넣기(터미널 · PR)라 팝오버 없이 바로 복사한다.
pjBr.addEventListener("click", () => copy(pjBrName.textContent, phrase("header.copy.branch")));

// 폴더 — 전체 경로는 여기에만 있다(상태 팝오버에서 뺐다).
let dirByKey = false;
export function closeDirPop() {
  if (!dirPop.classList.contains("on")) return false;
  dirPop.classList.remove("on");
  pjDir.setAttribute("aria-expanded", "false");
  // 팝오버 안에 남은 포커스는 키보드로 열었으면 폴더 칸으로 돌려주고, 아니면 놓는다(D-63).
  if (dirPop.contains(document.activeElement)) { if (dirByKey) pjDir.focus({ preventScroll: true }); else document.activeElement.blur(); }
  return true;
}
pjDir.addEventListener("click", e => {
  if (closeDirPop()) return;
  dirByKey = e.detail === 0;                    // 0 이면 키보드로 누른 것이다
  dirPop.style.left = Math.round(pjDir.getBoundingClientRect().left - appEl.getBoundingClientRect().left - 6) + "px";
  dirPop.classList.add("on");
  pjDir.setAttribute("aria-expanded", "true");
});
$("dirCopy").addEventListener("click", () => { copy(dirPath.textContent, phrase("header.copy.path")); closeDirPop(); });
dirReveal.addEventListener("click", () => { post("/viewer/reveal"); closeDirPop(); });
addEventListener("pointerdown", e => { if (!dirPop.contains(e.target) && e.target !== pjDir) closeDirPop(); });
