# 디자인 시스템 견본

`plugin/viewer/tokens.css`의 토큰과 그것으로 짠 컴포넌트를 라이트 · 다크로 나란히 늘어놓는 정적 페이지입니다. 제품 뷰어(`plugin/viewer/`)가 아니고 데몬과 이어지지 않습니다. 값은 이 페이지가 아니라 `tokens.css` 한 곳에 있습니다.

## 띄우기

`../../plugin/viewer/tokens.css`를 읽으므로 저장소 루트를 띄웁니다.

```sh
python3 -m http.server 8793 --bind 127.0.0.1
```

http://127.0.0.1:8793/prototypes/design-system/ 을 엽니다. 오른쪽 위 단추가 문구를 영어로 바꿉니다(`?lang=en`으로도 열립니다). 영어 문구는 길이를 확인하려고 둔 임시 문구입니다.

## 담긴 것

- 토큰 — 색(역할 이름과 이 면에서 풀린 값) · 대비 표 · 글자 · 간격 · 모서리 · 그림자 · 시간과 이징
- 컴포넌트 — 버튼 · 아이콘 버튼 · 탭 · 알약 · 입력 · 팝오버 · 시트 · 캡슐 · 툴팁 · 목록 줄 · 카드 틀
- `img/` — nowinandroid(Apache-2.0)의 프리뷰 렌더 PNG와 줄인 노드 트리. 뷰어 구조 시안이 쓸 그림이라 견본이 쓰지 않는 것도 둡니다

대비 표는 페이지가 열릴 때 그 면에서 풀린 색으로 계산합니다. 반투명한 바탕은 그 아래 면에 겹친 색으로 잽니다.
- `layout/` — 뷰어 구조 시안(D-94). 화면마다 확정한 배치 · 고정 동작 대조표 · 새 값 후보 · 결정 재료는 `layout/README.md`. 준비 화면 두 쪽(`prepare-live.html` · `handoff-live.html`)은 실제 준비 장면 코드(`plugin/viewer/js/preparation-scene.js`)를 불러 돈다
- `img/pearl/` — `fixtures/pearl` 렌더를 480px JPEG로 줄인 것(시안용, 약 0.5MB)
