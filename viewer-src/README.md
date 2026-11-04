# 뷰어 개발

`viewer-src/`가 HTML·JS·CSS 원본과 React·TypeScript·Storybook을 갖는다. Node 버전은 `.node-version`·`.nvmrc`, 의존성은 `package-lock.json`으로 고정한다. 설치본은 커밋된 `plugin/viewer/`만 받아 Node 없이 실행한다.

```sh
cd viewer-src
npm ci
npm run build
npm run typecheck
npm run check
npm run storybook
```

저장소 루트에서는 `sh tools/gen-viewer.sh [--check]`로 생성한다. `--check`는 임시 디렉터리에 다시 만들고 파일 목록과 바이트를 비교하며 원본·설치본을 고치지 않는다. Storybook 정적 빌드는 `npm run build-storybook`이다.

`plugin/viewer/tokens.css`·`strings/*.json`·`js/resize-scene.js`·`prevue.svg`는 손으로 고치는 소스로 남는다. 나머지 설치본은 생성물이다. 기존 화면 원본은 `legacy/`에 있으며 아직 이전하지 않은 JS도 날값 린트의 대상이다. 준비 서버의 허용 경로와 `/js/resize-scene.js`의 직접 import를 유지하므로 기존 모듈은 같은 URL로 복사하고 React 입구만 Vite로 묶는다. React 쪽이 부르는 `legacy/js/` 모듈은 모두 번들 밖(external)이다 — 사본이 번들에 들면 사전·마지막 상태·캡슐이 두 벌이 된다. 타입은 옆의 `.d.ts`가 갖고 설치본에는 복사하지 않는다.

`src/contract-state.ts`는 다섯 `viewer.state.*.json`의 schema에서 생성한다. null·빈 목록만 있는 예제가 실행 상태 전체를 뜻하지 않으므로 `src/state.ts`에서 `BrowserState`·`BrowserMapper`·`StatusMapper`에 맞춰 메시지·크기·자세와 nullable 필드를 보완한다. SSE에만 있는 `boot`도 여기에 있다.

`main.tsx`가 기존 연결을 한 번 시작한다. 기존 모듈은 번들보다 먼저 평가되며 처음부터 쥐는 요소가 있으므로, React가 맡은 영역은 `index.html`에 바깥 요소만 두고(`#app`·`#status`·`#helpBtn`·`#railList`·`#staleBar`·`#cards`·`#strip`·`#help`) 안을 포털로 그린다. 바깥 요소의 속성(`#bar.busy`·`#rail[hidden]`·`#boardView[hidden]`·`body.rail-on`·`body.stale` 등)은 그 컴포넌트가 효과에서 맞춘다. 작업 공간 칸(`#back`·`#wsTitle`·`#seg`)과 파일 열기(`#railOpen`)는 아직 기존 모듈의 것이라 마크업으로 남는다. Storybook에서는 컴포넌트가 같은 바깥 요소를 스스로 그린다.

기존 `apply`가 버전·전환을 처리한 뒤 React 루트의 `apply(state, holdStatus)`를 부른다. React는 View Transition 스냅숏 전에 동기 커밋하고, 맡은 영역의 효과가 먼저 돈 뒤 레이아웃 효과에서 기존 화면을 apply마다 한 번 그린다. 크기를 바꾸는 동안 상태 알약을 그대로 둘지는 `main.js`가 정하고(`holdStatus`), 다시 시작·끊김은 `startViewer`의 두 번째 인자로 받는다. 캡슐의 내용은 `legacy/js/capsule.js`의 DOM 없는 저장소가 갖는다 — 기존 모듈이 그리로 알리고 `NotificationCapsule`이 구독한다. 단축키 표(`src/shortcuts.ts`)는 디스패치와 도움말이 함께 쓴다. 보드의 브라우저 쪽 상태(키보드 커서 · 돌아온 카드 · 빠른 열기에서 고른 함수 · 카드 트리)도 같은 방식으로 `legacy/js/board.js`가 갖고 `PreviewBoard`가 구독한다. 보드는 레일이 접히고 펴진 뒤 같은 레이아웃 효과에서 `#boardView`를 보이고 묶음 배율을 잰다 — 기존 화면의 스크롤 복원과 `applyReveal`이 그 폭 위에서 돈다. 카드 그림의 `src`는 JSX가 갖지 않고 주소가 바뀔 때만 `swapImage`로 갈아 끼운다(크로스페이드). 카드 위 가리키기의 박스 · 꼬리표는 아직 `point.js`가 그리므로 카드는 자리만 만들고 `legacy/js/board-point.js`가 이벤트를 단다. `focus.js`·`point.js`는 불러오는 순간 문서의 요소를 쥐어 Storybook에서 부를 수 없으므로 카드 열기와 가리키기는 `main.tsx`가 동작으로 넘긴다.

React는 그린 요소에 열거되는 내부 키를 단다. 브라우저 검사가 레일 줄(`.rt`)을 값으로 돌려받으므로(`tests/viewer/quickopen.mjs`) 그 줄의 키는 열거를 끈다(`hideReactKeys`). Storybook은 데몬 연결 없이 계약 JSON과 실제 사전을 읽는다.

조립 계획과 방향은 볼트의 `Prevue 기획`·`Prevue UX 설계`·`Prevue 비주얼 디렉션`이 갖는다. 스토리의 컴포넌트 이름은 UX 설계의 목록을 따른다. 현재는 `재료/Tokens`·`재료/Messages`·`재료/StateExamples`·`공통/ViewerRoot`·`공통/ProjectHeader`·`공통/StatusPill`·`공통/FileRail`·`공통/StaleBanner`·`공통/NotificationCapsule`·`보드/PreviewBoard`·`보드/PreviewGroup`·`보드/PreviewCard`·`도움말/ShortcutHelp`가 있고, 기본 부품은 Tokens 아래에서 확인한다. 화면 스토리의 상태는 계약 예제와, 보드의 경우 `stories/pearl/`의 실제 상태뿐이라 낡음 줄·바쁨·오류처럼 그 둘에 없는 모양은 스토리에 없다. `stories/pearl/`은 `fixtures/pearl`의 `PearlPreviews.kt` 보드 30장을 이 체크아웃의 데몬에서 받은 상태와 JPG다. 데몬을 `tests/viewer/README.md`처럼 띄운 뒤 `node capture-pearl.mjs <뷰어 URL>`로 다시 뜬다(macOS의 `sips`로 줄인다). 전체 견본 흡수와 나머지 화면 스토리는 뒤 단계다.
