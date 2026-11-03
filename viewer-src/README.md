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

`plugin/viewer/tokens.css`·`strings/*.json`·`js/resize-scene.js`·`prevue.svg`는 손으로 고치는 소스로 남는다. 나머지 설치본은 생성물이다. 기존 화면 원본은 `legacy/`에 있으며 아직 이전하지 않은 JS도 날값 린트의 대상이다. 준비 서버의 허용 경로와 `/js/resize-scene.js`의 직접 import를 유지하므로 기존 모듈은 같은 URL로 복사하고 React 입구만 Vite로 묶는다.

`src/contract-state.ts`는 다섯 `viewer.state.*.json`의 schema에서 생성한다. null·빈 목록만 있는 예제가 실행 상태 전체를 뜻하지 않으므로 `src/state.ts`에서 `BrowserState`·`BrowserMapper`·`StatusMapper`에 맞춰 메시지·크기·자세와 nullable 필드를 보완한다. SSE에만 있는 `boot`도 여기에 있다.

`main.tsx`가 기존 연결을 한 번 시작한다. 기존 `apply`가 버전·전환을 처리한 뒤 React 루트의 `apply(state)`를 부른다. React는 View Transition 스냅숏 전에 동기 커밋하고 레이아웃 효과에서 기존 화면을 그린다. React가 소유하는 것은 별도 호스트 하나이며 기존 화면 DOM에는 쓰지 않는다. 다음 단계부터 이전한 영역만 React가 맡고 해당 기존 렌더 호출을 제거한다. Storybook은 데몬 연결 없이 계약 JSON과 실제 사전을 읽는다.

조립 계획과 방향은 볼트의 `Prevue 기획`·`Prevue UX 설계`·`Prevue 비주얼 디렉션`이 갖는다. 스토리의 컴포넌트 이름은 UX 설계의 목록을 따른다. 현재는 `재료/Tokens`·`재료/Messages`·`재료/StateExamples`·`공통/ViewerRoot`가 있고, 기본 부품은 Tokens 아래에서 확인한다. 전체 견본 흡수와 나머지 화면 스토리는 뒤 단계다.
