import { createMessages } from "./messages.js";

// 화면 문장은 viewer/strings/<언어>.json 이 갖는다. 데몬도 빌드 때 en.json 에서 CLI 로 내는 제 문장을 만든다.
// 언어는 주소의 ?lang= 이고, 없거나 사전이 없는 언어면 영어다(D-110). pt-BR 처럼 지역이 붙어도 앞 부분으로 고른다.
// 이 모듈을 부르는 모듈은 사전이 올 때까지 기다린다(최상위 await) — 문장을 쓰는 코드는 늘 채워진 사전을 본다.
// 마크업은 이 모듈을 부르는 모듈보다 먼저 채운다 — 그 모듈이 바꾼 글자를 사전이 덮지 않게. data-t 를 바꾸는 모듈은 이 모듈을 부른다.
// 사전을 못 받아도 뷰어는 뜬다(키가 그대로 보인다) — 그래야 연결 끊김 같은 오류를 알릴 수 있다.
const LANGUAGES = ["en", "ko"];
const asked = (new URL(location.href).searchParams.get("lang") || "").split("-")[0].toLowerCase();
const language = LANGUAGES.includes(asked) ? asked : "en";
document.documentElement.lang = language;

const dict = await fetch(new URL(`../strings/${language}.json`, import.meta.url))
  .then(r => (r.ok ? r.json() : {}))
  .catch(() => ({}));

export const { phrase, daemonText } = createMessages(dict);

const ATTRS = ["title", "aria-label", "placeholder", "alt"];

// 마크업의 data-t(글) · data-t-<속성>을 사전 문장으로 채운다.
function applyStrings(root) {
  for (const el of root.querySelectorAll("[data-t]")) el.textContent = phrase(el.dataset.t);
  for (const a of ATTRS) for (const el of root.querySelectorAll(`[data-t-${a}]`)) el.setAttribute(a, phrase(el.getAttribute(`data-t-${a}`)));
}

applyStrings(document);
