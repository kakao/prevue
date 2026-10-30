<h1 align="center">
  <img src="assets/icon.png" width="40" height="40" alt="" align="absmiddle">&nbsp;Prevue
</h1>

<p align="center"><b>이제 에이전트도 자기가 만든 Compose 화면을 봅니다.</b></p>

<p align="center">저장하고 1초면 브라우저의 Compose Preview가 바뀝니다.<br>Android Studio도 빌드도 필요 없습니다.</p>

<p align="center"><a href="README.md">English</a> | <b>한국어</b></p>

<div align="center">

[![GitHub Actions](https://img.shields.io/badge/GitHub%C2%A0Actions-%EB%B9%8C%EB%93%9C%C2%A0%EA%B2%80%EC%A6%9D-0E1B2A?logo=github&logoColor=white)](https://github.com/kakao/prevue/actions/workflows/build.yml)
[![version](https://img.shields.io/badge/version-0.20.2-0E1B2A)](CHANGELOG.md)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-plugin-0E1B2A?logo=claude&logoColor=white)](#시작하기)
[![Codex](https://img.shields.io/badge/Codex-plugin-0E1B2A?logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI%2BPHBhdGggZmlsbD0iI2ZmZiIgZD0iTTIyLjI4MTkgOS44MjExYTUuOTg0NyA1Ljk4NDcgMCAwIDAtLjUxNTctNC45MTA4IDYuMDQ2MiA2LjA0NjIgMCAwIDAtNi41MDk4LTIuOUE2LjA2NTEgNi4wNjUxIDAgMCAwIDQuOTgwNyA0LjE4MThhNS45ODQ3IDUuOTg0NyAwIDAgMC0zLjk5NzcgMi45IDYuMDQ2MiA2LjA0NjIgMCAwIDAgLjc0MjcgNy4wOTY2IDUuOTggNS45OCAwIDAgMCAuNTExIDQuOTEwNyA2LjA1MSA2LjA1MSAwIDAgMCA2LjUxNDYgMi45MDAxQTUuOTg0NyA1Ljk4NDcgMCAwIDAgMTMuMjU5OSAyNGE2LjA1NTcgNi4wNTU3IDAgMCAwIDUuNzcxOC00LjIwNTggNS45ODk0IDUuOTg5NCAwIDAgMCAzLjk5NzctMi45MDAxIDYuMDU1NyA2LjA1NTcgMCAwIDAtLjc0NzUtNy4wNzI5em0tOS4wMjIgMTIuNjA4MWE0LjQ3NTUgNC40NzU1IDAgMCAxLTIuODc2NC0xLjA0MDhsLjE0MTktLjA4MDQgNC43NzgzLTIuNzU4MmEuNzk0OC43OTQ4IDAgMCAwIC4zOTI3LS42ODEzdi02LjczNjlsMi4wMiAxLjE2ODZhLjA3MS4wNzEgMCAwIDEgLjAzOC4wNTJ2NS41ODI2YTQuNTA0IDQuNTA0IDAgMCAxLTQuNDk0NSA0LjQ5NDR6bS05LjY2MDctNC4xMjU0YTQuNDcwOCA0LjQ3MDggMCAwIDEtLjUzNDYtMy4wMTM3bC4xNDIuMDg1MiA0Ljc4MyAyLjc1ODJhLjc3MTIuNzcxMiAwIDAgMCAuNzgwNiAwbDUuODQyOC0zLjM2ODV2Mi4zMzI0YS4wODA0LjA4MDQgMCAwIDEtLjAzMzIuMDYxNUw5Ljc0IDE5Ljk1MDJhNC40OTkyIDQuNDk5MiAwIDAgMS02LjE0MDgtMS42NDY0ek0yLjM0MDggNy44OTU2YTQuNDg1IDQuNDg1IDAgMCAxIDIuMzY1NS0xLjk3MjhWMTEuNmEuNzY2NC43NjY0IDAgMCAwIC4zODc5LjY3NjVsNS44MTQ0IDMuMzU0My0yLjAyMDEgMS4xNjg1YS4wNzU3LjA3NTcgMCAwIDEtLjA3MSAwbC00LjgzMDMtMi43ODY1QTQuNTA0IDQuNTA0IDAgMCAxIDIuMzQwOCA3Ljg3MnptMTYuNTk2MyAzLjg1NThMMTMuMTAzOCA4LjM2NCAxNS4xMTkyIDcuMmEuMDc1Ny4wNzU3IDAgMCAxIC4wNzEgMGw0LjgzMDMgMi43OTEzYTQuNDk0NCA0LjQ5NDQgMCAwIDEtLjY3NjUgOC4xMDQydi01LjY3NzJhLjc5Ljc5IDAgMCAwLS40MDctLjY2N3ptMi4wMTA3LTMuMDIzMWwtLjE0Mi0uMDg1Mi00Ljc3MzUtMi43ODE4YS43NzU5Ljc3NTkgMCAwIDAtLjc4NTQgMEw5LjQwOSA5LjIyOTdWNi44OTc0YS4wNjYyLjA2NjIgMCAwIDEgLjAyODQtLjA2MTVsNC44MzAzLTIuNzg2NmE0LjQ5OTIgNC40OTkyIDAgMCAxIDYuNjgwMiA0LjY2ek04LjMwNjUgMTIuODYzbC0yLjAyLTEuMTYzOGEuMDgwNC4wODA0IDAgMCAxLS4wMzgtLjA1NjdWNi4wNzQyYTQuNDk5MiA0LjQ5OTIgMCAwIDEgNy4zNzU3LTMuNDUzN2wtLjE0Mi4wODA1TDguNzA0IDUuNDU5YS43OTQ4Ljc5NDggMCAwIDAtLjM5MjcuNjgxM3ptMS4wOTc2LTIuMzY1NGwyLjYwMi0xLjQ5OTggMi42MDY5IDEuNDk5OHYyLjk5OTRsLTIuNTk3NCAxLjQ5OTctMi42MDY3LTEuNDk5N1oiLz48L3N2Zz4%3D)](#시작하기)
![Jetpack Compose](https://img.shields.io/badge/Jetpack%20Compose-headless%20render-4285F4?logo=jetpackcompose&logoColor=white)
![JDK](https://img.shields.io/badge/JDK-21%2B-7A8794?logo=openjdk&logoColor=white)
[![license](https://img.shields.io/badge/license-Apache--2.0-7A8794)](LICENSE)

</div>

<p align="center">
  <img src="assets/intro.webp" width="1000"
       alt="Pearl 예제 앱으로 보는 20초 Prevue. 핫스왑: Preview 여러 장이 놓인 보드에서 한 번 저장하자 음료 카드가 가로로 긴 줄로 바뀌고, 또 한 번 저장해 Theme.kt의 색 일곱 개를 바꾸자 다크 테마가 되며, 그때마다 Preview 30장이 함께 다시 그려진다. 인터랙티브: 라이브 Preview를 스크롤하고 음료를 열어 사이즈 L, 토핑, 펄 추가를 고르면 컵이 바뀐다. 모든 화면: 그 음료 화면이 320×640, 673×841, 커스텀 너비 900을 거치며 673부터 두 칸으로 나뉘고, 이어 iPhone Duo가 펼쳐졌다가 커버 화면으로 접힌다">
</p>
<p align="center"><sub>핫스왑, 인터랙티브, 모든 화면 — 예제 앱을 실제로 그린 화면입니다.</sub></p>

## 코드는 에이전트가, 확인은 사람이

에이전트가 화면을 다 고쳤다고 합니다. Android Studio를 열고 Gradle 빌드를 기다려 보면 여백이 틀려 있습니다.
스크린샷을 찍어 무엇이 틀렸는지 설명하고, 다시 고쳐 오기를 기다립니다. **코드는 에이전트가 쓰는데, 화면은 여전히 내가 대신 봐 줍니다. 루프마다요.**

확인할 때마다 IDE 비용도 듭니다. Preview 한 장을 보는 데 Android Studio, Gradle 데몬, Kotlin 데몬이 함께 떠서 메모리를 8GB쯤 씁니다. 에이전트 셋에게 워크트리를 하나씩 주면 Android Studio도 셋을 띄워야 합니다.

이 루프를 그려 보면 한가운데에 누가 있는지 보입니다.

<p align="center">
  <img src="assets/agent-loop-before.ko.png" width="880"
       alt="Prevue 이전의 UI 수정 루프. 개발자가 주황으로 강조된 채 루프 안에 있다. 코딩 에이전트가 고쳐 저장하면 Android Studio가 약 4초 빌드해 Preview를 그리고, 개발자가 보고 스크린샷을 찍어 무엇이 틀렸는지 설명하면 에이전트가 다시 고친다. 루프마다">
</p>

저희도 매일 겪던 일입니다. 메모리 36GB Mac에서 에이전트 셋을 돌리자 Android Studio 셋 때문에 스왑이 일어나 모든 작업이 느려졌습니다.
Paparazzi · Roborazzi도 컴포저블을 이미지로 뽑아 주지만, 이미지를 뽑을 때마다 빌드를 거쳐서 에이전트가 고치는 속도를 따라가지 못합니다.

**Prevue는 그 루프에서 사람을 빼 줍니다.**

## Prevue에서는

### 확인도 에이전트가 합니다

Prevue는 저장할 때마다 1초쯤 안에 Preview를 다시 그려 에이전트에게 보여 줍니다. 그래서 시안(Figma 프레임 · 스크린샷 · 목업)을 주면 에이전트가 고치고, 보고, 비교하고, 다시 고치기를 혼자 되풀이합니다. 사람은 끝난 화면을 브라우저에서 확인만 하면 됩니다.

```
이 스크린샷처럼 ForYouScreen 헤더 맞춰줘
```

루프는 같지만, 이제 사람은 루프 밖에 있습니다.

<p align="center">
  <img src="assets/agent-loop.ko.png" width="880"
       alt="Prevue에서의 UI 수정 루프. 개발자는 루프 밖에 있다. 목표와 기준을 코딩 에이전트에게 주면 에이전트가 고쳐 저장하고, Prevue가 약 1초에 그린 PNG를 기준과 비교하며 혼자 루프를 돈다. 끝나면 개발자가 브라우저의 같은 Preview로 확인한다">
</p>

탭하거나 드래그해야 바뀌는 화면도 확인합니다. 에이전트가 Preview를 인터랙티브 모드로 켜고 터치를 보낸 뒤 바뀐 화면을 받아 봅니다.

### 볼 때는 이미 그려져 있습니다

저장하면 Gradle 없이 1초쯤 뒤 Preview가 새로 뜹니다. 여백 · 색 · 문구 같은 값만 바꿨으면 0.2초쯤입니다.
에이전트와 사람이 같은 Preview를 보니 에이전트가 "다 됐어요" 하는 순간 사람도 이미 보고 있습니다([벤치마크](#벤치마크)).

### 설명 대신 가리키세요

Preview에서 아무 곳이나 클릭하고 에이전트에게 말하면 됩니다. 스크린샷도, "위에서 두 번째 카드"도 필요 없습니다.

```
이거 여백 좀 줄여줘
```

에이전트는 "이거"가 어느 파일의 몇 번째 줄인지 알아냅니다. 클립보드에도 `@경로#L줄`이 복사되어 터미널에 바로 붙여 넣을 수 있습니다.

클릭한 자리에는 박스와 함께 파일:줄 표시가 붙습니다.

<p align="center">
  <img src="assets/point.png" width="760"
       alt="작업 공간에서 뉴스 카드의 제목을 가리킨 화면. 제목에 파란 박스가 쳐지고, 박스 위 꼬리표에 NewsResourceCard.kt:230 · ✓ copied가 붙는다">
</p>

### 에이전트가 셋이어도 가볍게

워크트리마다 가벼운 Prevue 데몬이 따로 뜹니다. 데몬 하나가 약 1.4GB로, Android Studio보다 메모리를 83% 적게 씁니다.

두 에이전트가 동시에 저장해도 창마다 따로 다시 그리고, 한쪽만 다시 저장하면 다른 쪽은 그대로입니다.

<p align="center">
  <img src="assets/worktrees.gif" width="1000"
       alt="같은 저장소의 워크트리 둘을 띄운 크롬 창 둘. 창마다 데몬과 주소가 따로 있고(main · feature/big-cards) 아래에 그 워크트리에서 일하는 에이전트의 터미널 띠가 있다. 두 에이전트가 같은 때 저장하면 — 왼쪽은 머리 색을 보라로, 오른쪽은 제목을 Big cards, big sips로 — 두 창이 각자 다시 그려지고 아래에 prevue wait 결과가 찍힌다. 이어서 왼쪽만 한 번 더 저장해 머리가 주황이 되고, 오른쪽 창은 그대로다">
</p>

## 시작하기

설치는 명령 두 줄이면 됩니다.

Android Studio Ladybug(2024.2) 이상이 설치되어 있으면 따로 준비할 Java가 없습니다. 프로젝트가 JDK 17이어도 괜찮습니다. 그보다 오래된 Android Studio는 Java 17을 들고 와서 프리뷰 서버를 띄울 수 없습니다. Android Studio가 없으면 JDK 21 이상을 설치하고 `PREVUE_JDK`에 그 경로를 넣어 주세요. macOS Command Line Tools(`python3`)도 필요한데, 없으면 에이전트가 설치 창을 열어 줍니다.

```sh
# Claude Code
claude plugin marketplace add https://github.com/kakao/prevue.git
claude plugin install prevue@prevue

# Codex
codex plugin marketplace add https://github.com/kakao/prevue.git
codex plugin add prevue@prevue
```

그다음 에이전트에게 파일 이름을 말하면 됩니다. 스킬을 직접 부르면 더 확실합니다. Claude Code는 `/prevue`, Codex는 `$prevue:prevue`입니다.

```
ForYouScreen.kt Preview 실행해줘
```

따로 설정할 것은 없습니다. 처음 실행할 때 필요한 준비는 에이전트가 확인을 받아 가며 진행합니다. 준비가 끝나면 브라우저가 열리고 그 파일의 `@Preview`가 모두 뜹니다.
프로젝트의 빌드 파일 · 플러그인 · 태스크를 바꾸지 않고, 프로젝트 안에 파일도 만들지 않습니다. Gradle은 모듈마다 처음 한 번만 실행되고, 그 뒤로는 공용 모듈을 고쳐도 바로 다시 그립니다.

### 업데이트

마켓플레이스 정보를 먼저 갱신한 뒤 플러그인을 업데이트합니다. 이 단계를 건너뛰면 옛 버전 정보를 보고 "이미 최신"이라고 답합니다.

```sh
# Claude Code — 재시작하거나 /reload-plugins 뒤에 적용된다
claude plugin marketplace update prevue
claude plugin update prevue@prevue

# Codex — update 가 없어 add 를 다시 부른다
codex plugin marketplace upgrade
codex plugin add prevue@prevue
```

바뀐 것은 [CHANGELOG.md](CHANGELOG.md)에 있습니다.
막히면 에이전트에게 `prevue log`를 읽어 달라고 하세요. 그래도 안 되면 [이슈로 알려 주세요](https://github.com/kakao/prevue/issues/new?template=not-working.yml).

## 더 자세히

뷰어에서 `?`를 누르면 전체 단축키가 뜹니다.

### 한 보드에 전부

파일 하나의 `@Preview`가 함수별로 묶여 보드에 펼쳐집니다. 저장하면 모두 다시 그리고, 헤더에 걸린 시간을 표시합니다.

<p align="center">
  <img src="assets/hero.png" width="50%" alt="nowinandroid ForYouScreen.kt의 Preview가 함수별 묶음으로 깔린 보드. 헤더에 앱 이름과 폴더 · 브랜치 · 모듈 · 변형, 오른쪽에 ✓ 알약이 있다. 왼쪽 열린 파일 목록에 ForYouScreen · InterestsScreen · NewsResourceCard가 있고, 묶음 머리에 장 수와 배율이 적혀 있다"><img src="assets/board-pearl.png" width="50%" alt="버블티 앱 Pearl의 ComponentPreviews.kt 보드. 첫 묶음에 버튼 · 필터 칩 · 당도 · 토핑 토글 · 바텀 내비 · 가방 배지가 있고, 그 아래에 음료 상세 화면이 놓인다">
</p>
<p align="center"><sub>왼쪽: <a href="https://github.com/android/nowinandroid">Now in Android</a>(Apache-2.0) · 오른쪽: 이 저장소의 예제 앱 Pearl(<a href="fixtures/pearl"><code>fixtures/pearl</code></a>)</sub></p>

### 인터랙티브 모드

카드의 `▶`를 누르면 크게 열립니다. 소스를 고치지 않고 화면 크기나 기기(Android 여섯 · iPhone 넷, 폴더블은 접기까지)를 바꿔 볼 수 있습니다.
Android Studio의 Interactive Mode처럼 클릭 · 드래그로 모션과 애니메이션을 확인합니다.

<p align="center">
  <img src="assets/interactive-nav.gif" width="33.3%" alt="작업 공간에서 버블티 앱의 바텀 네비를 Home, Orders, Saved, Profile, Home 순으로 누르면 주황 알약이 미끄러져 옮겨 가고 고른 탭의 글자가 펼쳐지며 화면이 바뀐다"><img src="assets/interactive-header.gif" width="33.3%" alt="작업 공간에서 Fruit tea, Milk tea, Matcha, All 칩을 차례로 누르면 머리의 바탕 색이 그 갈래 색으로 번지고, 컵이 아래로 빠졌다가 새 컵이 튕겨 들어오며 제목이 바뀌고, 아래 그리드도 걸러진다"><img src="assets/interactive-detail.gif" width="33.3%" alt="작업 공간에서 Taro Milk Tea 카드를 누르면 카드 판이 화면 가득 커지는 동안 컵이 따로 날아가 상세 화면의 컵 자리에 앉는다. Add to bag을 누르면 컵이 오른쪽 위 가방으로 날아가 배지가 튀고, 뒤로 화살표를 누르면 거꾸로 카드로 돌아간다">
</p>

<p align="center">
  <img src="assets/interactive-cup.gif" width="33.3%" alt="상세 화면에서 Ice Extra를 누르면 뚜껑이 열리고 얼음이 떨어져 수면이 오르고, Pearls Extra면 펄이 곡선으로 쏟아지고 None이면 휘어 화면 밖으로 빠진다. 컵을 좌우로 끌면 음료가 출렁이고, Sweetness 0%와 100%를 누르면 음료 색이 옅어졌다 짙어진다"><img src="assets/devices.gif" width="66.6%" alt="작업 공간의 오른쪽 패널에서 기기를 바꾸는 장면. S26에서는 컵 아래에 고르기가 있고, iPhone Duo를 펼치면 왼쪽에 컵, 오른쪽에 고르기 패널로 갈린다. 접기를 누르면 커버 화면에서 다시 세로로, 펴면 다시 둘로 갈리고, Pixel Tablet에서도 컵과 패널이 나란히 선다">
</p>

### 빠른 열기

화면 파일과 컴포넌트 파일을 오가며 고쳐도 연 파일은 왼쪽 목록에 남습니다. `/` · `⌘K`로 파일 이름, 머리글자(`fys` → `ForYouScreen.kt`), Preview 함수 이름으로 찾아 엽니다.

<p align="center">
  <img src="assets/files.gif" width="1000"
       alt="ForYouScreen을 띄운 뷰어에서 /를 누르면 빠른 열기가 뜬다. topic을 치면 TopicScreen.kt와 함께 Preview 함수 이름이 맞은 줄이 뜨고, Enter로 연다. 다시 /에서 머리글자 nrc로 NewsResourceCard.kt를 찾는다. 연 파일은 왼쪽 열린 파일 목록에 쌓이고, 1 · 2 키로 ForYouScreen과 TopicScreen을 오간다">
</p>

## 벤치마크

위는 같은 일을 Android Studio와 Prevue로 한 결과, 아래는 바꾼 종류마다 새 그림이 뜨기까지의 시간입니다.

<p align="center">
  <img src="assets/benchmark-vs.ko.png" width="1000"
       alt="nowinandroid ForYouScreen.kt에서 Android Studio 대 Prevue — Hot Swap 4.3초 대 2.1초(−51%), First Preview 12.1초 대 8.0초(−34%), Memory 8.1GB 대 1.4GB(−83%), Disk 3.2GB 대 446MB(−86%)">
</p>

<p align="center">
  <img src="assets/benchmark-redraw.ko.png" width="1000"
       alt="Prevue가 다시 그리는 속도 — 리터럴 0.23초, 리소스 값 0.22초, 코드 0.90초, 보드 전부 2.07초, 모듈 전환 0.33초, 기기 바꾸기 0.92초, 끄는 동안 약 54fps">
</p>

- **측정 사양** — Apple Silicon 14코어 · RAM 36GB · nowinandroid `ForYouScreen.kt`(Preview 25장). Android Studio 2026.1.3은 2026-09-22에, Prevue(develop `feb5c6e`)는 2026-10-23에 쟀습니다. Prevue 값은 중앙값입니다
- **Hot Swap** — 저장한 뒤 25장이 전부 새 그림이 되기까지. 첫 장은 0.9초에 나옵니다
- **First Preview** — Android Studio는 프로젝트를 열고, Prevue는 데몬을 띄우고 첫 렌더가 끝나기까지
- **Memory** — Android Studio는 한 시점의 IDE와 Gradle 데몬 합계, Prevue는 저장 10번 뒤 데몬 하나의 메모리 사용량입니다. 모듈을 오가며 오래 써도 1.6GB가 최대였고, 10분 동안 쓰지 않으면 스스로 종료됩니다
- **Disk** — Android Studio 앱 번들 대 `~/.prevue/toolchain`. JDK 25 이상이면 데몬을 빨리 띄우려고 `~/.prevue/aot`에 200MB 안팎의 클래스 캐시를 더 둡니다
- **Prevue가 다시 그리는 속도** — 리터럴 · 리소스 값 저장은 컴파일을 건너뜁니다. 모듈 전환과 기기 바꾸기는 새 그림이 나오기까지, 인터랙티브는 피드를 드래그하는 동안 뷰어 스트림의 프레임 수입니다

## 명령

에이전트가 쓰는 명령이라 직접 입력할 일은 드뭅니다. 실행 파일은 플러그인이 설치된 디렉터리의 `bin/prevue`이고
전체 명령과 종료 코드는 `prevue --help`, 명령마다 `prevue <명령> --help`로 봅니다. 직접 쓸 만한 명령은 넷입니다.

| 명령 | 하는 일 |
|---|---|
| `prevue open` | 닫은 뷰어를 브라우저에 다시 엽니다 |
| `prevue stop` | 그 저장소에서 띄운 데몬을 내립니다(`--all`은 떠 있는 것 전부) |
| `prevue log` | 데몬 로그 — 막혔을 때 에이전트에게 읽어 달라고 합니다 |
| `prevue paths` | 툴체인 · 덤프 · 산출물이 어디에 얼마나 있는지 — 지울 곳을 찾을 때 |

## 지원 범위

| 되는 것 | 안 되는 것 |
|---|---|
| Android 모듈(app · library) | 순수 JVM 모듈 |
| debug 계열 변형. Android Studio의 Build Variants 기본 규칙으로 고르고, 다른 것은 에이전트에게 말하면 됩니다 | release 변형 |
| 최상위 `@Preview` 함수. Multipreview와 `@PreviewParameter`도 펼쳐서 그립니다 | 클래스 안에 선언한 멤버 Preview |
| 실기기가 없어도 그려지는 컴포저블 | DI 컨테이너나 `AndroidView`가 필요한 Preview — 실패 종류가 `DI` · `ANDROID_VIEW`로 표시됩니다 |


## License

This software is licensed under the Apache 2 license, quoted below.

Copyright 2026 Kakao Corp. http://www.kakaocorp.com

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this project except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0.

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
