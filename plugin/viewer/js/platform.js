// 레일 탭의 파일 아이콘 — KMP 모듈의 파일이면 문서 오른쪽 아래에 소스 세트 표식을 붙인다(공유 세트는 KMP, androidMain 계열은 로봇).
// Android 전용 모듈은 표식 없이 문서다 — Android 전용 프로젝트의 레일이 표식으로 가득 차지 않게.
// KMP 표식은 JetBrains 공식 아이콘의 모양 그대로이고 색은 공식 단색판(--art-kmp)만 쓴다(D-134). 로봇은 직접 그린 그림이다.
const DOC = '<path d="M4 2h5.5L12 4.5V14H4z"/>';
// 표식이 덩어리로 읽히지 않게 문서를 왼쪽 위로 줄이고 오른쪽 아래를 비운다.
const DOC_SHORT = '<path d="M7 13H2.5V1.5h5L10 4V7"/>';
const KMP = '<path class="mk-kmp" fill="currentColor" stroke="none" transform="translate(7.2 7.2) scale(.18333)" '
  + 'd="M0 22.5629V0.0835311L22.4794 22.5629H0ZM0 25.4372V48H0.0572568L22.6201 25.4372H0ZM25.9906 22.0094L48 0H3.98128L25.9906 22.0094ZM26.0193 26.1028L4.1221 48H47.9164L26.0193 26.1028Z"/>';
const ROBOT = '<g class="mk-android" transform="translate(5.5 6.4) scale(.75)"><path fill="currentColor" stroke="none" d="M2 12a6 6 0 0 1 12 0z"/>'
  + '<path d="M4.8 6.4 3.4 4.2M11.2 6.4l1.4-2.2" stroke-width="1.6"/></g>';
const GLYPH = { file: DOC, android: DOC_SHORT + ROBOT, kmp: DOC_SHORT + KMP };

/** 탭 하나의 종류 — 소스 세트가 없으면 Android 전용 모듈, `android*`면 KMP 모듈의 Android 쪽, 나머지는 공유 세트. */
export const kindOf = sourceSet => !sourceSet ? "file" : sourceSet.startsWith("android") ? "android" : "kmp";

export const fileIcon = kind =>
  `<svg class="rt-ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${GLYPH[kind]}</svg>`;
