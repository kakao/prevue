# 기기 스펙

기기 한 대가 JSON 파일 하나다(D-183). 데몬은 빌드할 때 여기서 `DeviceModel`과 인셋 표를 만들고(`daemon/application/build.gradle.kts`의 `deviceTable`), 원 측정 검산은 `DeviceSpecTest`가 한다.

- `id` · `label` · `order` — CLI 이름, 화면 이름, 메뉴 순서. enum 상수 이름은 `label`에서 나온다(`Galaxy Z Fold8` → `GALAXY_Z_FOLD8`).
- `measured` — 사이트 값이다. 손으로 고치지 않는다(D-175).
  - `dpi`, `screens.open` · `screens.cover`(접히는 기기만): `widthPx` · `heightPx` · `hingePx`
  - `postures.<portrait | landscape-left | landscape-right>` — 손에 든 방향이다. iOS의 Apple 방향 이름은 반대라 `conditions.orientation`에 원문 그대로 둔다. 측정이 없는 자세는 적지 않는다.
  - 자세마다 `source`(`samsung-rtl` · `firebase-test-lab` · `emulator` · `site`) · `url` · `capturedAt` · `conditions` · `safeArea`(dp).
  - Android는 `insets`(`statusBars` · `navigationBars` · `captionBar` · `displayCutout`)를 원 측정의 `dp`와 `px` 두 벌로 적는다. 검산은 px ÷ 밀도 = dp, `safeArea` = 변마다 그 넷의 max다.
  - iOS는 사이트의 `safeAreaSize`(pt)를 적는다. 검산은 화면 크기 − `safeArea` = `safeAreaSize`다.
- `look` — 사이트에 없는 그림 값. 지금은 `bar`(시스템 바 모양: `aosp` · `oneui` · `pixel` · `ios`)만 있다.
