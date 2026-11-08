# 가리키기 카드 프로토타입

가리키기 결과를 그림 밖에 뜬 카드로 보이는 시안이다(D-162, 시안 (2)). 제품 뷰어(`plugin/viewer/`)에 잇지 않았고 데몬과도 이어지지 않는다 — 설치본에 실리지 않는다. 값은 `plugin/viewer/tokens.css`의 역할 이름만 쓰고, 문구는 `strings.ts`가 갖는다. `prototypes/`는 날값 린트(`sh tools/lint.sh`) 밖이라, 연결할 때 `viewer-src/`로 옮기며 검사를 받는다. 경로 접기(`tagText` · `shortPath`)는 뷰어 `PointOverlay.tsx`의 사본이고 연결 때 하나로 합친다.

## 보기

```sh
cd viewer-src && npm run storybook
```

Storybook `프로토타입/PointCard`

- `States` — 상태별 카드(기본 · 여백 · 글자 · Preview 여럿 · 복사 막힘 · 긴 사슬 · 색인 없음 · 문장), 라이트 · 다크. 트리 줄을 누르면 그 노드로 다시 가리키고, 카드 밑에 잰 높이가 적힌다
- `OnPreview` — pearl 그림 위의 구조 테두리 · 고른 박스와 그림 밖에 선 카드
- `BoardPoint` — 그림을 눌러 가리키기. 트리 줄에 올리면 그림 위에 옅은 바탕, 누르면 다시 가리킨다. `Esc` · 닫기 · 빈 곳 클릭으로 닫힌다

## 담긴 것

- `PointCard.tsx` — 카드 컴포넌트. 뷰어의 `useMessages` · 타입만 빌려 쓴다
- `PointFloat.tsx` — 카드 자리(`placeCard`) · 떠 있는 카드(`PointCardFloat`) · 그림 위 표시(`PointMarks`)
- `point-card.css` — 카드 · 표시 스타일과 그림 위 표시의 토큰 후보. 뷰어 `style.css` 위에 얹는다
- `strings.ts` — `point.card.*` 문구(en · ko)
- `pearl-tree.ts` — 스토리 재료. pearl 0번 그림의 노드 트리를 눈으로 본뜬 것과 조상 19칸의 긴 사슬
- `PointCard.stories.tsx` · `stories.css` — 스토리와 배치

## 카드의 모양

폭 320, 카드 여백 · 간격 8. 탭 없이 위에서 아래로 쌓는다.

- **머리** — 이름 + 출처 칩(프로젝트 컴포저블은 정의 모듈을 `--primary-container` 채움으로, Compose 기본은 테두리만 둔 `Compose`), 그 아래 흐린 `파일:라인`(링크 아님 · 툴팁이 저장소 기준 경로). 오른쪽은 Preview 버튼(가리킨 노드에 있을 때만, 여럿이면 개수와 머리 아래 목록) · 닫기
- **복사** — 자동 복사만이고 상태를 보이지 않는다. 막혔을 때만 파일 줄 끝에 `복사 안 됨 · 누르기`, 눌러도 막히면 `복사할 수 없음`
- **트리** — 조상 전체(위 두 칸만 들여쓰기) + 가리킨 노드의 형제 + 직계 자식, 줄은 이름만. 높이는 6줄 × 24px 고정이라 노드를 옮겨도 아래 패널이 제자리에 있다. 가리킨 줄은 그림 위 박스와 같은 `--pick-container`. 줄에 올리면 그림 위에 반투명 바탕(`peek`), 누르면 그림을 누른 것과 같다(`pick`)
- **설명 패널** — 56px 칸의 비율 그림(여백이 있으면 안쪽 점선 상자)과 `너비 × 높이 dp` 한 줄, 그 아래 Modifier 체인(적용 순서, 상한 4줄). 크기를 정한 줄도 강조하지 않는다. 출처 · 여백 값은 체인만 말한다. dp 는 소수 한 자리까지, 정수면 소수점 없이
- **스크롤바** — 평소 숨김, 올리거나 포커스가 오면 얇은 `--outline-variant` 막대, 위아래 끝 8px 흐림

## 움직임

- 노드가 바뀌면 머리 글자와 설명은 이동 없이 250ms 페이드(`--duration-medium1`)
- 트리는 옛 자식 묶음이 접히고 새 자식 묶음이 펼쳐진다(300ms). 끝나면 가리킨 줄로 부드럽게 스크롤한다 — 스크롤하는 것은 트리 칸이지 그 안의 `ul`이 아니다
- 카드 자리 — x 는 가리킨 그림 밖 오른쪽에 고정(무대가 모자라면 왼쪽), y 는 가리킨 박스의 위쪽을 따르고 무대 안으로 당긴다. 이웃 그림 위는 허용한다. 새 박스 위쪽이 지금 카드의 [위 − 8, 아래 − 48] 안이면 움직이지 않는다
- y 와 높이는 넘침 없는 감쇠 곡선 600ms(`--duration-long4` · `--easing-spring`)로 한 덩어리처럼 옮긴다. 처음 뜰 때는 자리로 바로 선다
- 그림 위 — 마우스가 그림 위에 있으면 모든 노드의 구조 테두리가 페이드로 나타나고, 손 아래 노드는 반투명 바탕 하나가 자리와 크기를 미끄러지듯 옮기며 따라온다. 고르면 더 진한 바탕 + 2px 테두리. 표시를 붙였다 떼면 깜빡여서 늘 그려 두고 투명도 · 자리만 옮긴다
- 움직임 줄이기 — 자리 · 높이 · 미끄러짐은 즉시, 펼침 · 접힘은 높이 없이 페이드

## 그림 위 표시의 토큰 후보

`point-card.css`의 `:root`에 `--pick`을 섞어 둔다 — 구조 테두리 `--pick-outline`(35%) · 손 아래 바탕 `--pick-hover`(16%)와 테두리 `--pick-hover-line`(70%) · 고른 바탕 `--pick-chosen`(30%, 손이 떠나면 `--pick-rest` 22%). 연결할 때 `tokens.css`의 역할로 옮긴다.

그림 위 선은 그림 색에 따라 대비가 갈린다. 시안 (2)에서 잰 값(흰 그림 · 카드 회색 · 헤더 초록 · 보라 카드 순, 라이트/다크):

| 선 | 라이트 | 다크 |
|---|---|---|
| 구조 테두리 35% | 1.68 · 1.65 · 1.06 · 1.28 | 1.62 · 1.59 · 1.10 · 1.22 |
| 손 아래 테두리 70% | 3.07 · 2.94 · 1.14 · 1.64 | 2.84 · 2.71 · 1.24 · 1.50 |
| 고른 2px(`--pick`, 지금 뷰어의 박스와 같다) | 5.19 · 4.80 · 1.25 · 1.97 | 4.63 · 4.29 · 1.40 · 1.76 |

흰 바탕에서는 손 아래 · 고른 선이 3:1 근처지만 짙은 그림 위에서는 어느 선도 3:1에 못 미친다 — 지금 뷰어의 가리킨 박스도 같다. 구조 테두리는 보조 표시라 옅게 두었다. 연결 때 대비 쌍에 넣을지, 그림 색과 무관하게 서는 모양(겹선 등)을 둘지 정한다. 카드 안의 글자(출처 칩 · 가리킨 줄 · 파일 줄)는 모두 4.5:1을 넘는다.

## 데이터 — 연결할 때

카드가 보이는 modifier 값 · 형제 · 출처 모듈은 지금 뷰어가 받지 않는다. 시안의 체인은 `fixtures/pearl`을 데몬에서 그리며 아래로 읽은 값을 본떴다.

- `ComposeViewAdapter`의 `ViewInfo.getLayoutInfo()` → `getModifierInfo()`가 노드마다 modifier 를 적용 순서대로 준다(`FillElement` · `AspectRatioElement` · `PaddingElement` · `BackgroundElement` · `ClickableElement` · `SizeElement` · `TextStringSimpleElement` …)
- 값은 요소 클래스의 필드를 리플렉션으로 읽는다(`aspectRatio` · `start/top/end/bottom` · `color` · `onClickLabel` · `text`). 인스펙터 값(`inspectableElements`)은 `isDebugInspectorInfoEnabled`가 꺼져 있어 비었다. 내부 클래스라 Compose 판이 바뀌면 깨질 수 있다 — 못 읽으면 이름만 보인다
- `Group.getParameters()`는 함수 인자(`drink` · `aspect`)를 주지 않고 `modifier` · `state` 정도라 카드에 넣지 않았다
- 출처 칩의 정의 모듈은 정의 색인(다음 작업)이 정한다. 시안은 손으로 붙였다
- 참고 — Android CLI `android preview render --component-tree`가 같은 범주(영역 · 이름 · 소스 위치 · 시맨틱 · 파라미터 · modifier)를 JSON으로 내지만, 필드 이름이 공개돼 있지 않고 대상 저장소의 Gradle 빌드를 거친다
