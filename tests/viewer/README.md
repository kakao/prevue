# 뷰어 기준선 실측

`baseline.mjs`는 React 이전·이후에 같은 방법으로 뷰어 자체의 무게를 잰다. Node 22 이상과 Chrome이 필요하며, 실행 파일은 `CHROME`으로 지정할 수 있다. 데몬은 이 체크아웃의 `plugin/bin/prevue`로 띄운 전용 `fixtures/pearl` 인스턴스여야 한다. 다른 체크아웃의 데몬으로 실행하면 거부한다.

## 실행

도구를 `(cd plugin/daemon && ./gradlew --offline installPrevue)`로 빌드한다. 픽스처가 처음이면 다음 명령으로 준비한다. Gradle 홈의 `init.d`에 스크립트가 있으면 사내 Maven 설정을 주입할 수 있으므로 먼저 확인한다.

```sh
plugin/bin/prevue warmup fixtures/pearl/feature/pearl/src/main/kotlin/com/example/pearl/feature/pearl/AdaptivePreviews.kt --resources-from :app
```

응답의 `next`에 `--no-watch --no-open`을 붙여 실행한다. `next`는 warmup이 만든 두 클래스패스 덤프를 가리킨다. `start` 응답의 `viewer` 주소로 두 차례 잰다. 아래 주소는 예시다.

```sh
node tests/viewer/baseline.mjs http://127.0.0.1:8857/ --output .cache/viewer-baseline/run-1.json
node tests/viewer/baseline.mjs http://127.0.0.1:8857/ --output .cache/viewer-baseline/run-2.json
```

이전 후에는 같은 머신·Chrome·조건에서 기준 JSON과 비교한다. 초과하면 종료 1이며, 실패한 실측도 `--output`에 남는다.

```sh
node tests/viewer/baseline.mjs http://127.0.0.1:8857/ --check tests/viewer/baseline.json
```

기본값은 시나리오마다 예열 5회 뒤 측정 30회다(`--samples`로 변경). 기본 출력 위치는 `.cache/viewer-baseline/<시각>.json`이다. JS·CSS 파일별 바이트, 모든 시간 원값, 중앙값·p90·최댓값, 소스 커밋·측정기 해시, 브라우저·Node·CPU와 창 조건을 남긴다. 종료할 때 테스트가 연 Pearl 탭을 닫고 Adaptive 보드로 돌아간다. 기존 `tests/viewer/*.mjs` 테스트는 수정하지 않는다.

## 무엇을 재나

**크기**는 `plugin/viewer/` 아래 모든 `.js`·`.css` 파일의 합계다. 준비 화면, `tokens.css`, 따로 서빙하는 `resize-scene.js`도 포함한다. gzip은 파일마다 level 9로 압축한 크기를 더한다. HTML·사전·그림·소스맵은 제외한다. 실제 HTTP 전송량이나 초기 진입의 로딩 시간을 뜻하지 않는다.

**DOM 반영**은 실제 데몬에서 받은 상태를 네이티브 `EventSource` 객체의 `message` 이벤트로 재생한다. 데몬의 렌더·컴파일과 전송 대기 시간을 분리하기 위한 합성 이벤트이며, 네트워크 SSE 전체 지연은 측정하지 않는다. 현재 SSE의 `boot`를 유지하고 `version`과 헤더의 `who`에만 매번 새 표지를 넣는다. 실제 SSE는 재생 중 무시한다. 제품 코드나 내부 모듈을 import하지 않는다.

이벤트가 제품의 핸들러에 들어가기 직전 `performance.now()`부터, MutationObserver가 다음 조건을 확인할 때까지를 잰다.

- 매번 달라지는 `#who` 표지가 새 상태와 같다. 지난 상태를 다시 읽어 0ms로 재는 것을 막는다.
- 활성 탭과 화면의 `hidden` 값이 맞는다.
- 보드는 모든 카드의 인덱스·이름표·이미지 URL과 개수가 맞는다.
- 한 장은 제목과 이미지의 URL이 맞는다.

제품의 JSON 파싱·DOM 커밋과 테스트의 상태 파싱·DOM 확인 비용을 포함한다. 레이아웃은 제품이 요청한 만큼만 포함하며, paint 완료·PNG 디코드·MJPEG 첫 프레임·모션 완료는 포함하지 않는다. 지연된 DOM 커밋도 관측하므로 React의 비동기 커밋을 동기 함수 실행 시간으로 착각하지 않는다.

JavaScript 예외나 Promise 거부가 있으면 실패한다. Chrome의 `ResizeObserver loop completed with undelivered notifications.`는 예외와 구분해 `warnings` 원값에 보존한다. 기준선 실행 중에도 발생할 수 있는 기존 뷰어의 통지이며, 결과를 읽을 때 함께 확인한다.

| 시나리오 | 재생 상태 | 재는 것 |
|---|---|---|
| `board` | Pearl 30장 보드에서 헤더 표지를 갱신 | 같은 보드에 상태 하나 반영 |
| `focus` | Pearl 첫 카드의 인터랙티브 한 장에서 헤더 표지를 갱신 | 같은 한 장에 상태 하나 반영 |
| `tab` | Pearl 30장 ↔ Adaptive 1장 | 활성 탭·보드 DOM 교체. 양방향을 번갈아 측정 |

시나리오 사이와 각 측정 뒤에 유한 모션·틀 모프가 끝나고 두 프레임이 지나길 기다린다. 이 대기는 측정값 밖이다. 라이트·영어·1440×900·DPR 1·일반 모션으로 고정하며, Chrome 프로필은 매 실행마다 새로 만든다. 앱의 인터랙티브 조작 성능이나 보드→한 장 진입 전체 시간은 이 지표의 범위 밖이다.

중앙값과 p90은 정렬한 표본의 `ceil(N × 비율)`번째 값이다. `baseline.json`은 두 회차의 원값과 조건, 크기 상한, 시나리오별 p90 상한을 갖는다. p90 상한은 60Hz 기준 보드·한 장 한 프레임(16.7ms), 탭 전환 세 프레임(50ms)이다. 머신이나 브라우저가 달라지면 자동으로 기준을 덮어쓰지 말고 두 회차를 다시 비교한다.


## React 이전 기준선 · 2026-11-03

뷰어 소스 `8cdfc48`에서 측정했다. JS·CSS 26개는 원본 **361,821B(353.3KiB)**, 파일별 gzip 합계 **123,810B(120.9KiB)**다. 크기 상한은 원본 **768KiB**, gzip **256KiB**로 합의했다. 시간과 조건의 원값은 [baseline.json](baseline.json)에 있다.

| 시나리오 | 1회차 중앙값 / p90 | 2회차 중앙값 / p90 | 비교 p90 상한 |
|---|---|---|---|
| 보드 30장 | 1.8 / 2.0ms | 2.0 / 3.9ms | 16.7ms |
| 한 장 | 0.9 / 1.2ms | 0.8 / 1.9ms | 16.7ms |
| 탭 전환 | 22.8 / 27.5ms | 25.8 / 34.8ms | 50ms |

Apple M4 Max · macOS arm64 · Chrome 156.0.8078.80 · Node 25.9.0에서 재었다. 각 시나리오는 예열 5회 + 측정 30회이며, 두 회차 모두 JavaScript 예외·ResizeObserver 통지가 없었다. 실제 실행 파일·판은 JSON의 `environment`가 기준이다.

기준선의 큰 p90을 1ms 단위로 올린 4·2·35ms로 처음 비교했을 때, 같은 소스의 보드 p90이 5.0ms로 실패했다(중앙값 2.1ms). 이 검증에서는 ResizeObserver 통지가 1건 있었다. 원값은 `baseline.json`의 `initialStrictCheck`에 보존했다. 이 변동을 보고 프레임 단위 상한으로 조정하기로 합의했다. 따라서 시간 판정은 프레임 예산을 지키는지를 뜻하며, 기준선의 소수점 수치보다 느려지지 않았음을 뜻하지 않는다. 여기의 프레임 단위는 시간 예산이며 paint 완료나 실제 화면 주사율을 측정한 값은 아니다.

## 대비 실측

`contrast.mjs`는 `plugin/viewer/tokens.css`의 역할 색을 라이트 · 다크 면에서 풀어 `contrast-pairs.json`의 쌍마다 기준을 넘는지 잰다. 데몬 없이 Chrome만 쓰며, 계산을 `contrast-measure.ts`에서 타입을 지운 채 읽으므로 Node 22.18 이상이 필요하다. 미달이 하나라도 있거나, 쌍의 역할이 `tokens.css`에 없거나, 바탕이 끝까지 반투명해 잴 수 없으면 종료 1이다 — 잴 수 없는 쌍은 가짜 색으로 통과시키지 않고 `못 잼`으로 적는다.

```sh
node tests/viewer/contrast.mjs
node tests/viewer/contrast.mjs --plant on-surface=surface   # 미달을 심는다 — 종료 1이어야 맞다
```

기준은 본문 글자 4.5:1, 큰 글자 · 조작 테두리 · 가리킨 박스 3:1이다. 구분선(`need` 0)은 장식이라 면제하고 값만 보인다. 반투명한 바탕은 `bg`의 순서대로(위에서 아래) 겹친 색으로, 반투명한 글자는 그 바탕에 겹친 색으로 잰다. `bg`의 끝은 불투명한 면이어야 한다. 색 역할을 더하거나 바꾸면 이 쌍도 같은 PR에서 고친다. Storybook `재료/Tokens`의 Contrast가 같은 쌍과 계산으로 표를 그린다. CI에는 Chrome이 없어 로컬에서 돌린다.

## 기기 시스템 UI와 인셋 통합

전용 워크트리의 `AdaptivePreviews.kt`를 연 서버에서 `node tests/viewer/system-bars.mjs <URL>`을 실행합니다. 10종·42자세의 ON/OFF 84개 조합에서 바 계열, iOS 배치 유지, Duo의 측면과 카메라, 인셋 지원·검증·근사 정보, 실제 필터 터치와 가리키기 박스를 대조합니다. `--smoke`는 Duo 12개 조합만, `--devices=pixelfold,tablet`은 지정한 기기만 실행합니다. 마지막에는 SSE 실패 상태를 재생해 이전 그림·바와 터치가 차단되고 복구되는지 검사합니다. 이 재생은 렌더러 실패 주입을 대신하지 않습니다. 렌더 입력과 Android/CMP 첫 프레임은 `*InsetsIntegrationTest`가 검사합니다.

스크린샷과 원자료는 `.cache/system-bars/`에 남습니다. 스크린샷은 브라우저의 iOS 오버레이를 포함하지만 원본 렌더 PNG에는 그 오버레이·기기 몸체·카메라가 없습니다. Android의 Preview 기본 바는 원본 PNG에 포함됩니다. Safari와 실물 모션은 이 헤드리스 Chrome 검사로 확인하지 않습니다.
