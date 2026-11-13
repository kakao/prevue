# 기기 스펙

기기 한 대가 JSON 파일 하나다(D-183). 데몬은 빌드할 때 여기서 `DeviceModel`과 인셋 표를 만들고(`daemon/application/build.gradle.kts`의 `deviceTable`), 원 측정 검산은 `DeviceSpecTest`가 한다.

- `id` · `label` · `order` — CLI 이름, 화면 이름, 메뉴 순서. enum 상수 이름은 `label`에서 나온다(`Galaxy Z Fold8` → `GALAXY_Z_FOLD8`).
- `measured` — 사이트 값이다. 손으로 고치지 않는다(D-175).
  - `dpi`, `screens.open` · `screens.cover`(접히는 기기만): `widthPx` · `heightPx` · `hingePx`
  - `postures.<portrait | landscape-left | landscape-right>` — 손에 든 방향이다. iOS의 Apple 방향 이름은 반대라 `conditions.orientation`에 원문 그대로 둔다. 측정이 없는 자세는 적지 않는다.
  - 자세마다 `source`(`samsung-rtl` · `firebase-test-lab` · `emulator` · `site`) · `url` · `capturedAt` · `conditions` · `safeArea`(dp).
  - 자세마다 `cornerRadius`(화면 모서리 반경)가 있으면 사이트 값이다. Android는 원 측정의 `roundedCorners`를 `{"px", "dp"}`로, iOS는 safearea.info의 그 자세 `conditions` 그대로의 값(Display Zoom 끔 · Duo는 SDK와 자세)을 `{"pt"}`로 적는다(pt = dp). 한 화면의 자세가 전부 갖거나 전부 갖지 않고 값이 같아야 하며, 있으면 `look`의 `radius`를 두지 않는다 — 측정이 없는 기기(tablet)만 `look.radius`다. 검산은 px ÷ 밀도 = dp이고 뷰어 생성기가 한다.
  - Android는 `insets`(`statusBars` · `navigationBars` · `captionBar` · `displayCutout`)를 원 측정의 `dp`와 `px` 두 벌로 적는다. 검산은 px ÷ 밀도 = dp, `safeArea` = 변마다 그 넷의 max다.
  - iOS는 사이트의 `safeAreaSize`(pt)를 적는다. 검산은 화면 크기 − `safeArea` = `safeAreaSize`다.
- `look` — 사이트에 없는 그림 값이다. 뷰어 빌드(`viewer-src/generate-devices.mjs`)가 이것과 `measured`의 크기로 `viewer-src/legacy/js/devices.js`를 만든다(커밋하는 생성물, `sh tools/gen-viewer.sh --check`가 어긋남을 막는다). 빠진 필드 · 모르는 필드는 생성이 실패한다.
  - `bar`(시스템 바 모양: `aosp` · `oneui` · `pixel` · `ios`) — 데몬도 쓴다. `ios`면 메뉴의 iPhone 묶음이다.
  - `short`(메뉴 칸 이름) · `tone`(몸체 색 hex) · `open` · `cover`(접히는 기기만): `bezel` · `radius`(dp, 측정이 없을 때만) · `cam`(`w` `h` `y`, 가로 위치 비율 `x`) · `btn`(`[변, 위치, 길이]` 5개까지).
  - `status`(iOS 홑 기기만) — 상태바 아이콘 묶음 자리: `top` · `right` · `scale` · `time`.
  - 화면 크기(dp)는 `measured`의 px ÷ `dpi` × 160이다 — 따로 적지 않는다.
