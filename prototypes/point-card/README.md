# 가리키기 카드 프로토타입

가리키기 결과를 박스 옆 카드로 보이는 시안이다(D-162). 제품 뷰어(`plugin/viewer/`)에 잇지 않았고 데몬과도 이어지지 않는다 — 설치본에 실리지 않는다. 값은 `plugin/viewer/tokens.css`의 역할 이름만 쓰고, 문구는 `strings.ts`가 갖는다.

## 보기

```sh
cd viewer-src && npm run storybook
```

Storybook `프로토타입/PointCard` — `States`(상태별 카드, 라이트 · 다크)와 `OnPreview`(pearl 그림 위에 선 카드).

## 담긴 것

- `PointCard.tsx` — 카드 컴포넌트. 뷰어의 `useMessages` · 타입만 빌려 쓴다
- `point-card.css` — 카드 스타일. 뷰어 `style.css` 위에 얹는다
- `strings.ts` — `point.card.*` 문구(en · ko)
- `PointCard.stories.tsx` · `stories.css` — 스토리와 배치

## 카드의 모양

- 머리 — 컴포저블 이름 · 닫기, 그 아래 `<> 파일:라인`과 복사 결과 아이콘(✓ · ⊘ · ↻ 다시 복사), 다른 파일이면 탭 열기
- 크기 — 그림 비율(0.8~3.2로 묶음)의 파란 상자 가운데에 `너비 × 높이 dp`. padding 이 있으면 점선 안쪽 상자와 네 방향 숫자. dp 는 소수 한 자리까지, 정수면 소수점 없이
- 탭 — 아이콘 + 개수. 탭 칸 높이는 고정이라 옮겨도 카드가 출렁이지 않는다
  - Modifier — 체인을 적용 순서대로. 하는 일 아이콘(↔ 너비 · ↕ 높이 · 크기 · 여백 · 클릭 · 배경 · 글자, 뜻은 툴팁) · 이름은 왼쪽, 값은 오른쪽 끝. 크기를 정한 줄은 진하다. 문자열 값은 따옴표째, 색은 견본. 구분선 없이 호버 바탕
  - 구조 — 가리킨 줄 위 두 칸부터 들여 쓴 파일 트리 모양. 그 위 조상은 나란히 선다. 가리킨 줄은 그림 위 박스와 같은 파랑 바탕(`--pick-container`). Preview 가 있는 줄 끝에 그림 카드 아이콘, 여럿이면 `3 🖼 ›`이고 줄 아래 딸린 상자로 펼친다

## 데이터 — 연결할 때

카드가 보이는 modifier 값은 지금 뷰어가 받지 않는다. 시안의 체인은 `fixtures/pearl`을 데몬에서 그리며 아래로 읽은 값을 본떴다.

- `ComposeViewAdapter`의 `ViewInfo.getLayoutInfo()` → `getModifierInfo()`가 노드마다 modifier 를 적용 순서대로 준다(`FillElement` · `AspectRatioElement` · `PaddingElement` · `BackgroundElement` · `ClickableElement` · `SizeElement` · `TextStringSimpleElement` …)
- 값은 요소 클래스의 필드를 리플렉션으로 읽는다(`aspectRatio` · `start/top/end/bottom` · `color` · `onClickLabel` · `text`). 인스펙터 값(`inspectableElements`)은 `isDebugInspectorInfoEnabled`가 꺼져 있어 비었다. 내부 클래스라 Compose 판이 바뀌면 깨질 수 있다 — 못 읽으면 이름만 보인다
- `Group.getParameters()`는 함수 인자(`drink` · `aspect`)를 주지 않고 `modifier` · `state` 정도라 카드에 넣지 않았다
- 시맨틱(클릭 · 글자)은 modifier 체인과 겹쳐 따로 보이지 않는다. `contentDescription` · `testTag`처럼 체인에 값이 없는 것은 연결 때 정한다
- "크기를 정한 modifier" 표시는 체인을 보고 추정한다. 부모가 정하는 경우(`Row` 안의 `weight`)는 틀릴 수 있어 확실할 때만 단다
- 참고 — Android CLI `android preview render --component-tree`가 같은 범주(영역 · 이름 · 소스 위치 · 시맨틱 · 파라미터 · modifier)를 JSON으로 내지만, 필드 이름이 공개돼 있지 않고 대상 저장소의 Gradle 빌드를 거친다
