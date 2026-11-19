#!/usr/bin/env python3
"""리소스 값 핫리로드(D-68) 그림 대조 — values 값만 넣은 그림이 맞는가, 되돌리면 원래 그림인가, 로더가 바뀌어도 값이 남는가. 실행: python3 tools/resource_check.py [--gradle]

진짜 데몬 · layoutlib으로 nowinandroid `ForYouScreen.kt`(25장)를 띄우고 `feature/foryou/api`의 `strings.xml` 값 하나를 바꿔 가며 보드 전부의 PNG를 견준다.
단위 테스트는 가짜 렌더러라 렌더러의 리소스 저장소 · 리졸버 캐시를 못 본다 — 렌더러 판올림이나 이 경로를 고친 뒤 돌린다.

`--gradle`은 정답 그림까지 본다 — 값을 고친 채 대상 저장소에서 Gradle로 리소스 APK를 다시 만들고(`--offline`) 데몬을 다시 띄워 그린 보드가
값만 넣은 보드와 같은가. 대상 저장소의 Gradle이라 사람의 승인을 받고 돌린다(implement의 멈춤 목록). 끝에 값을 되돌리고 한 번 더 빌드해 APK를 원래대로 둔다.

격리는 `nfr_bench.py`와 같다(보는 파일은 복사본 `.cache/spike/nfr/`, 덤프는 `.cache/nfr/`). values만은 그래프의 진짜 `res/values`를
감시하므로 그 파일을 고치고 끝에 되돌린다 — 개인 체크아웃(nowinandroid)에서만 돌린다. 하나라도 실패하면 종료 1.
"""

import argparse
import hashlib
import json
import os
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import nfr_bench as N  # noqa: E402

VALUES = N.NIA + "/feature/foryou/api/src/main/res/values/strings.xml"
SNIP = "What are you interested in?"
GRADLE_TASK = ":app:processDemoDebugResources"   # 앱의 리소스 APK(.ap_)와 R.jar를 만든다
TOPIC = 10                                        # `ForYouScreenTopicSelection` 첫 기기 — 고치는 문자열이 보이는 카드


class Check:
    def __init__(self, gradle):
        a = argparse.Namespace(
            repo=N.NIA,
            file=N.NIA + "/feature/foryou/impl/src/main/kotlin/com/google/samples/apps/nowinandroid/feature/foryou/impl/ForYouScreen.kt",
            other=N.NIA + "/core/ui/src/main/kotlin/com/google/samples/apps/nowinandroid/core/ui/NewsResourceCard.kt",
            dump="feature_foryou_impl-demoDebug.json", resources_from="app-demoDebug.json", port=0, cold=1, saves=0,
            interval=1.5, switches=0, rounds=0, idle=0, tab_rounds=0, skip="", literal_at="", resource_at=SNIP, values=VALUES)
        self.b = N.Bench(a)
        self.gradle = gradle
        # 고친 값으로 리소스 APK를 다시 만들었다 — 끝에 되돌려 한 번 더 빌드해야 한다.
        self.apk_dirty = False
        self.results = []

    @staticmethod
    def sha(path):
        with open(path, "rb") as f:
            return hashlib.sha256(f.read()).hexdigest()[:12]

    def board(self, target):
        """[target]의 저장을 기다려 지금 보드의 카드마다 PNG 해시와 reload 줄을 낸다."""
        off = self.b.offset()
        rc, out, _ = self.b.cli("wait", target, timeout=90)
        j = json.loads(out)
        if rc != 0 or "cards" not in j:
            sys.exit("wait 실패(%d): %s" % (rc, out[:600]))
        lines, _ = self.b.reload_lines(off)
        return {str(c["index"]): self.sha(c["image"]) for c in j["cards"] if c.get("image")}, lines, j.get("stale") or {}

    def values(self, text):
        with open(VALUES, "w", encoding="utf-8") as f:
            f.write(text)
        return self.board(VALUES)

    def edited(self, label):
        return self.b.values_text.replace(SNIP, label, 1)

    def check(self, name, ok, detail=""):
        self.results.append(ok)
        print(("통과 " if ok else "실패 ") + name + ("  " + detail if detail else ""))

    @staticmethod
    def diff(x, y):
        return "%d장 중 다른 장 %s" % (len(x), [k for k in x if x[k] != y.get(k)])

    def focus(self, i):
        """카드 [i]를 인터랙티브로 켜 그 그림의 해시를 내고 끈다 — 인터랙티브는 사설 로더라(D-11) 공유 로더와 다른 길이다."""
        r = self.b.post("/focus", {"index": i, "interactive": True, "by": "resource-check"})
        h = self.sha(r["image"])
        self.b.post("/focus", {"index": i, "interactive": False, "by": "resource-check"})
        return h

    def restart(self):
        self.b.stop()
        self.b.start()
        return self.board(self.b.file)[0]

    def build(self):
        t = time.monotonic()
        p = subprocess.run([os.path.join(N.NIA, "gradlew"), "--offline", "-q", GRADLE_TASK], cwd=N.NIA, capture_output=True, text=True, timeout=900)
        if p.returncode != 0:
            sys.exit("Gradle 실패(%d): %s" % (p.returncode, (p.stdout + p.stderr)[-1500:]))
        print("  Gradle %s %.1f초" % (GRADLE_TASK, time.monotonic() - t))

    def run(self):
        hot = lambda lines: any(l.rstrip().endswith(" resources") for l in lines)   # noqa: E731
        self.b.start()
        base, _, _ = self.board(self.b.file)
        on_base = self.focus(TOPIC)
        a, l, stale = self.values(self.edited("Pick what you like"))
        self.check("값만 넣었다(컴파일 없음 · 낡음 없음)", hot(l) and not stale, "%s %s" % (l, stale))
        self.check("고친 값의 그림이 원래와 다르다", a != base, self.diff(a, base))
        back, l, _ = self.values(self.b.values_text)
        self.check("되돌리면 원래 그림(보드 전부)", hot(l) and back == base, self.diff(back, base))
        a2, _, _ = self.values(self.edited("Pick what you like"))
        self.check("같은 값을 다시 넣으면 같은 그림", a2 == a, self.diff(a2, a))
        # 코드를 컴파일해 세대(로더)를 바꾼다 — 리소스는 로더 밖이라 넣은 값이 그대로여야 한다.
        with open(self.b.file, "a", encoding="utf-8") as f:
            f.write("\n// resource-check\n")
        after, _, _ = self.board(self.b.file)
        self.check("코드를 컴파일한 뒤(새 로더)에도 넣은 값", after == a, self.diff(after, a))
        self.check("인터랙티브(사설 로더)에도 넣은 값", self.focus(TOPIC) != on_base)
        if not self.gradle:
            return
        # 정답 그림 — 값을 고친 채 Gradle로 리소스 APK를 다시 만들고 데몬을 다시 띄운다.
        self.apk_dirty = True
        self.build()
        truth = self.restart()
        self.check("정답(Gradle + 재시작) == 값만 넣은 그림(보드 전부)", truth == after, self.diff(truth, after))
        self.b.restore_values()
        self.build()                                                             # APK를 원래대로
        self.apk_dirty = False
        restored = self.restart()
        self.check("되돌려 빌드한 그림 == 처음 그림(보드 전부)", restored == base, self.diff(restored, base))


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--gradle", action="store_true", help="정답 그림까지 — 대상 저장소의 Gradle을 두 번 부른다(승인 필요)")
    c = Check(ap.parse_args().gradle)
    try:
        c.run()
    finally:
        try:
            c.b.stop()
        finally:
            c.b.restore_values()                                 # 대상 체크아웃은 무슨 일이 있어도 되돌린다
            if c.apk_dirty:
                c.build()
        import shutil
        shutil.rmtree(c.b.spike, ignore_errors=True)
    print("결과: %d/%d 통과" % (sum(c.results), len(c.results)))
    sys.exit(0 if all(c.results) else 1)


if __name__ == "__main__":
    main()
