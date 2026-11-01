// 아래에 떠 있는 캡슐 — 오류 · 잠깐의 알림. 보드와 한 장이 함께 쓴다. 가리킨 결과는 박스 꼬리표가 말한다(D-101).
import { $ } from "./store.js";

const strip = $("strip"), sel = $("sel"), log = $("log"), once = $("capOnce"), onceText = $("capOnceText");
let summary = "";

/** 한 줄이라도 담을 것이 있을 때만 뜬다. 빈 캡슐이 그림을 가리면 패널을 없앤 뜻이 없다. */
function sync() {
  strip.classList.toggle("on", !!(sel.textContent.trim() || log.textContent.trim()) || !once.hidden);
}

// 처음 한 번 안내 — 닫기(×)를 눌러야 걷히고, 걷은 것은 브라우저에 남겨 다시 띄우지 않는다.
// 저장소를 못 쓰면(사생활 보호 창) 이 화면에서만 기억한다 — 열 때마다 다시 뜨는 것보다 낫다.
const dismissed = new Set();
const seen = key => { if (dismissed.has(key)) return true; try { return !!localStorage.getItem(key); } catch { return false; } };
/** text 의 첫 문장이 요점이다 — 굵게 보인다. */
export function showOnce(key, text) {
  if (!once.hidden || seen(key)) return;
  const [head, ...rest] = text.split(/(?<=[.。])\s+/);
  const b = document.createElement("b"); b.textContent = head;
  onceText.replaceChildren(b, ...(rest.length ? [" " + rest.join(" ")] : []));
  once.dataset.key = key;
  once.hidden = false;
  sync();
}
$("capOnceX").addEventListener("click", () => {
  const key = once.dataset.key;
  dismissed.add(key);
  try { localStorage.setItem(key, "1"); } catch { /* 이 화면에서만 기억한다 */ }
  once.hidden = true;
  sync();
});
/** 오류만 남긴다 — 렌더 실패·트리 실패·데몬 끊김은 조용히 사라지면 안 되는 것들이다. */
export function setStatus(msg, kind) {
  const err = kind === "error";
  sel.className = err ? "error" : "";
  sel.textContent = err ? msg : "";
  sync();
}
export function flash(msg) {
  clearTimeout(flash.t); log.textContent = msg; sync();
  flash.t = setTimeout(() => { log.textContent = summary; sync(); }, 2500);
}
/** 알림이 사라진 뒤에도 남는 한 줄(소스 색인 없음 같은 것). */
export function setSummary(t) { summary = t; log.textContent = t; sync(); }

/** state.error 를 맞춘다. 오류가 걷히면 지운다. */
export function renderError(error) {
  if (error) setStatus(error, "error"); else if (sel.className === "error") setStatus("");
}
