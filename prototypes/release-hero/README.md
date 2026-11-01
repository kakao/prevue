# 릴리즈 히어로

릴리즈 노트 맨 위 그림(`assets/release-<버전>.png`, 1280×820을 2배로)을 찍는 틀이다. 톤은 GitHub 소셜 프리뷰(OG)와 같다. 이 그림이 develop에 있으면 `/ship`이 그 판의 노트 맨 위에 건다 — 규약은 `dev-skills-src/release-notes.md`의 "판의 모양".

바꾸는 것은 주소의 쿼리뿐이다: `kick`(머리말) · `ver`(버전 알약) · `l1` · `l2`(제목 두 줄, `l2`에 형광펜) · `shot`(창 캡처). 글꼴은 Google Fonts에서 읽으니 네트워크가 있어야 한다.

```sh
# 1) 창 캡처 — readme-shots 의 장면을 넓은 창으로. board 장면은 assets/board-kotlinconf.png 를 덮으니 옮기고 되돌린다
node tools/readme-shots.mjs --kotlinconf <kotlinconf-app> --bw 1040 --bh 720 board
mv assets/board-kotlinconf.png <스크래치>/shot.png && git checkout assets/board-kotlinconf.png

# 2) 합성 — 헤드리스 Chrome
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars \
  --window-size=1280,820 --force-device-scale-factor=2 --virtual-time-budget=8000 --allow-file-access-from-files \
  --screenshot="$PWD/assets/release-0.21.0.png" \
  "file://$PWD/prototypes/release-hero/index.html?kick=New%20in&ver=0.21&l1=Kotlin%20Multiplatform,&l2=in%20your%20browser.&shot=file://<스크래치>/shot.png"
```

창은 아래가 잘린다 — 헤더와 첫 줄 카드가 보이면 된다. 다른 장면을 쓰면 `--bw 1040`(틀의 창 폭)을 지켜 2배 PNG가 흐려지지 않게 한다. 쿼리 다섯 중 하나라도 빠지면 그 자리가 빨간 `kick?` 같은 표시로 찍힌다 — 지난 판 글자로 조용히 나가지 않게. `shot` 경로에 `&`가 있으면 `%26`으로 적는다.
