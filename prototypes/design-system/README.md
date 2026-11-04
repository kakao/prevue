# 뷰어 구조 시안

뷰어 구조 시안(D-94)과 그 시안이 쓰는 그림을 둡니다. 제품 뷰어(`plugin/viewer/`)가 아니고 데몬과 이어지지 않습니다. 토큰과 기본 부품을 보던 견본 페이지는 Storybook `재료/Tokens`(`viewer-src/`)로 옮겼고, 대비 실측은 `tests/viewer/contrast.mjs`가 합니다. 값은 `plugin/viewer/tokens.css` 한 곳에 있습니다.

## 띄우기

`../../../plugin/viewer/tokens.css`를 읽으므로 저장소 루트를 띄웁니다.

```sh
python3 -m http.server 8793 --bind 127.0.0.1
```

http://127.0.0.1:8793/prototypes/design-system/layout/ 을 엽니다.

## 담긴 것

- `layout/` — 뷰어 구조 시안. 화면마다 확정한 배치 · 고정 동작 대조표 · 새 값 후보 · 결정 재료는 `layout/README.md`. 준비 화면 두 쪽(`prepare-live.html` · `handoff-live.html`)은 실제 준비 장면 코드(`plugin/viewer/js/preparation-scene.js`)를 불러 돈다
- `img/` — nowinandroid(Apache-2.0)의 프리뷰 렌더 PNG와 줄인 노드 트리
- `img/pearl/` — `fixtures/pearl` 렌더를 480px JPEG로 줄인 것(시안용, 약 0.5MB)
