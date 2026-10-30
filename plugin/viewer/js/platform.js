// 프로젝트 · 파일이 Android 인지 KMP 인지 보이는 표식 — 머리말 배지와 레일 탭이 같은 그림을 쓴다.
// 로봇은 직접 그린 선 그림(색은 --art-android), KMP 는 JetBrains 공식 아이콘(viewer/kmp.svg)을 다시 칠하지 않고 쓴다.
const ROBOT = '<path fill="currentColor" d="M2 12a6 6 0 0 1 12 0z"/>'
  + '<path d="M4.8 6.4 3.4 4.2M11.2 6.4l1.4-2.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>';

// 배지는 18px 원 안이라 여백을 잘라 KMP 아이콘과 덩치를 맞춘다. 레일은 문서 아이콘과 같은 16px 칸이라 여백을 둔다.
export const robot = (cls, tight = false) =>
  `<svg class="${cls} android" viewBox="${tight ? "2 3.6 12 8.4" : "0 0 16 16"}" aria-hidden="true">${ROBOT}</svg>`;
export const kmp = cls => `<img class="${cls} kmp" src="kmp.svg" alt="">`;

/** 탭 하나의 표식 — KMP 모듈의 Android 쪽 소스 세트(androidMain · androidDebug …)는 로봇, 나머지 KMP 소스 세트는 KMP. */
export const kindOf = sourceSet => !sourceSet ? "file" : sourceSet.startsWith("android") ? "android" : "kmp";
