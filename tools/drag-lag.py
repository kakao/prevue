#!/usr/bin/env python3
# 인터랙티브 끌기의 밀림을 잰다 — 목록 맨 위에서 아래로 당겨(오버스크롤) 그리기가 느린 구간(틱 ~90ms)을 만들고,
# 손동작이 끝난 뒤 데몬이 뗌을 처리하기까지 얼마나 늦는지(밀림)와 보낸 끌기 중 몇 개를 그렸는지 낸다.
# 휠 · 프레임 간격은 tools/scroll-jank.mjs 가 잰다. 브라우저 없이 /viewer/touch 로 바로 보낸다.
#
#   python3 tools/drag-lag.py <전용 프리뷰 서버 URL> [끌기 개수=30]
#
# 데몬은 이 체크아웃의 plugin/bin/prevue 로 띄운 fixtures/pearl 의 AdaptivePreviews.kt 여야 한다(tests/viewer/README.md).
# frameTrace 는 마지막으로 정착한 버스트라 이 손동작의 누름 · 뗌이 실릴 때까지 기다린다 — 일찍 읽으면 앞 버스트를 읽는다.
import json
import sys
import time
import urllib.request

base = sys.argv[1].rstrip('/')
count = int(sys.argv[2]) if len(sys.argv) > 2 else 30


def post(path, body):
    request = urllib.request.Request(base + path, data=json.dumps(body).encode(), headers={'Content-Type': 'application/json'})
    urllib.request.urlopen(request, timeout=10).read()


def touch(kind, x, y):
    post('/viewer/touch', {'type': kind, 'x': x, 'y': y})


# 새로 들어가 목록을 맨 위에 두고, 기기 사전 렌더(입력이 1초 잠잠하면 돈다)가 끝나길 기다린다.
post('/viewer/exit', {})
time.sleep(2)
post('/focus', {'index': 0, 'interactive': True})
time.sleep(11)

x, top = 540, 800
touch('press', x, top)
pressed = time.time()
time.sleep(0.2)
for i in range(count):
    touch('drag', x, top + 12 * (i + 1))
    time.sleep(0.033)
time.sleep(0.3)
touch('release', x, top + 12 * count)
gesture = int((time.time() - pressed) * 1000)

trace = []
for _ in range(150):
    time.sleep(0.1)
    trace = json.load(urllib.request.urlopen(base + '/status')).get('frameTrace') or []
    kinds = {entry.get('wake') for entry in trace}
    if 'touch:release' in kinds and 'touch:press' in kinds:
        break
else:
    sys.exit('이 손동작의 버스트가 정착하지 않았다 — frameTrace 에 누름 · 뗌이 없다')

press_at = min(entry['ms'] for entry in trace if entry.get('wake') == 'touch:press')
release_at = max(entry['ms'] for entry in trace if entry.get('wake') == 'touch:release')
slow = sorted(entry['tickMs'] for entry in trace if 'n' in entry and press_at <= entry['ms'] <= release_at and entry['tickMs'] > 25)
print(json.dumps({
    'gestureMs': gesture,
    'releaseHandledMs': release_at - press_at,
    'lagMs': release_at - press_at - gesture,
    'dragsSent': count,
    # 입력 하나가 흔적 둘을 남긴다(LiveLoop.input 의 wake 와 Pacing.input)
    'dragsDrawn': sum(1 for entry in trace if entry.get('wake') == 'touch:drag') // 2,
    'slowTicks': len(slow),
    'slowTickMedianMs': slow[len(slow) // 2] if slow else 0,
}))
