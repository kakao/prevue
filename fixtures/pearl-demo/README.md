# Pearl 데모 뼈대

README 상단 영상을 찍는 출발점이다. 에이전트가 프롬프트 한 번으로 Pearl의 Home 화면을 만들고, 저장할 때마다 Prevue가 다시 그리는 모습을 왼쪽 터미널 · 오른쪽 브라우저로 담는다.

- **단일 모듈(`:app`)이다.** 공개 Maven만 쓴다. `fixtures/pearl`과 따로 둔다 — 테스트용으로 바뀌는 그쪽 데이터가 영상의 출발점을 흔들지 않게.
- **들어 있는 것** — 테마(`PearlColors` · `PearlType` · `PearlTheme`), 맛별 색 · 갈래 이름(`Flavors.kt`), 메뉴 20잔(`data/`), 아이콘 벡터. 글꼴은 시스템 기본이다.
- **없는 것** — 컵 · 칩 · 카드 · 그리드 · 네비. 에이전트가 만든다. `ui/home/HomeScreen.kt`는 빈 자리다.
- **`strings.xml`이 없다.** 글자는 코드의 리터럴이다 — 새 문자열 리소스는 리소스 APK를 다시 떠야 해(Gradle) 녹화 중에 그리지 못한다.
- 통합 테스트 대상이 아니다.

## 판마다

```sh
./gradlew --offline installPrevue                                   # 저장소에서 — 영상은 개발판으로 찍는다
VIEWER_SURFACE=<cmux 브라우저 판> sh fixtures/pearl-demo/stage.sh   # 기본 ~/Desktop/pearl
```

대상 폴더에 새로 복사하고 git 첫 커밋을 만든 뒤, 이 체크아웃의 `plugin/bin/prevue`로 Gradle 덤프까지만 떠 둔다(지난 판의 데몬은 내린다). **데몬은 영상 속 에이전트가 띄운다** — 준비 화면이 보드로 걷히는 장면이 영상에 들어간다.
끝에 에이전트를 띄울 명령을 찍는다. 그 명령은
- `PATH` 앞에 `shim/open`을 둔다 — `prevue start`가 기본 브라우저로 여는 뷰어를 `PEARL_VIEWER_SURFACE` 판으로 보내고 `lang=en`으로 고정한다.
- 이 체크아웃을 `--plugin-dir`로 읽고, 설치된 마켓플레이스 판은 그 세션에서만 끈다.

다시 돌리면 폴더를 새로 깐다(이 스크립트가 만든 폴더만 지운다).

## 촬영

1. cmux 창 하나를 노트북 화면에 꽉 채운다(1512×949pt) — 왼쪽 터미널(스크립트가 찍은 에이전트 명령), 오른쪽 브라우저 판 하나에 시안 아티팩트. **비율 30 : 70** — 영상은 확대 없이 창 전체를 쓰므로 이야기를 끄는 오른쪽 판을 넓힌다. 터미널 글자는 키운다(README에서 창이 0.55배로 보인다).
   ```sh
   cmux new-pane --type browser --direction right --url <시안 아티팩트>   # 찍힌 surface 가 VIEWER_SURFACE
   ```
   cmux 브라우저는 claude.ai에 따로 로그인해 둔다.
2. 녹화를 켜고(⌘⇧5 · 노트북 화면만), 시안(Home 보드)을 띄운 채 프롬프트를 친다. 에이전트가 처음 Preview를 띄우면 같은 판이 준비 화면 → 보드로 넘어간다.
   ```
   Build the Home screen of this bubble tea app in Compose: <시안 아티팩트>
   Build from the Home board only. Unfolded and Tablet are layout references for wider screens, not exact sizes.
   Go in three pieces — the cup, the drink card, then the screen with chips, grid and bottom nav — each with its own @Preview, and check it in Prevue after every piece.
   Keep UI text as string literals in code, not in strings.xml.
   When it's done, check it on Galaxy S26, then iPhone Duo unfolded, folded and unfolded again, then Pixel Tablet — stay on each for about 3 seconds so it can be seen.
   ```
3. 에이전트가 기기를 바꿔 확인하고 Pixel Tablet에서 끝나면 멈춘다. 매끈하지 않은 판은 프롬프트를 바꾸지 않고 `stage.sh`부터 다시 찍는다.
4. 편집 — `python3 fixtures/pearl-demo/edit.py <녹화.mp4> <그 판의 세션 로그.jsonl> assets/demo.webp`. 판마다 스크립트 위쪽 표(프롬프트 시각 · 컷 · 단계가 끝난 시각)를 다시 잡는다. 창 전체 한 프레임, 맨 앞에 완성 화면의 기기 셋, 그림이 뜨는 순간은 1배속, 나머지는 빨리 감기, 아래 팝업(마스코트 · 단계 n/5 · 목표 문장 · 에이전트의 핵심 한마디), 오른쪽 위 실제 경과 시계. 9MB 안에 드는 품질로 굽는다.
