#!/usr/bin/env python3
"""NFR 통합 측정 — 진짜 데몬을 CLI 로 몰아 기획 6절의 숫자를 재고, 넘으면 종료 1. 실행: python3 tools/nfr_bench.py

재는 것: NFR-11 콜드 · NFR-1 저장 → 첫 카드(중앙값 · p90) · NFR-1b 저장 → 보드 전부 · NFR-12 다른 모듈 전환 ·
NFR-6 반복 뒤 RSS · NFR-14 유휴 감시 CPU · NFR-4 무한 루프 컴포저블의 상한과 데몬 생존.
NFR-6 스트림: 앞 단계의 데몬을 내린 뒤 `fixtures/pearl` 데몬을 따로 띄워, 카드를 인터랙티브로 켜고 `/stream`을 연 채
시드로 섞은 조작(탭 · ← · 스크롤 · 저장)을 돌리며 데몬의 phys_footprint(`footprint`)를 잰다. 덤프는 이 체크아웃의
`bin/prevue warmup`이 뜬다(저장소 안 픽스처라 승인 밖).
뷰어 탭(D-54): NFR-19 탭 전환(낡은 탭 · 낡지 않은 탭) · NFR-20 탭 10개의 RSS 증분 · NFR-1 탭 10개의 저장 → 첫 카드 증분.
결과는 성능 실측 회차 형식(마크다운)으로 찍고 `.cache/nfr/<시각>.json` 에 원값을 남긴다.

격리: 대상 저장소는 읽기만 한다. 저장은 `.cache/spike/nfr/` 복사본에 하고 `--watch` 로 감시한다. `--resource-at` 만 예외다 —
values 는 그래프의 진짜 `res/values` 만 감시해(D-68) 그 파일(`--values`)을 고치고 끝에 되돌린다(개인 체크아웃 nowinandroid 만). 덤프를 `.cache/nfr/.prevue/projects/<키>/`
로 복사해 띄워 산출물 · 오버레이가 그 아래에 생긴다 — 같은 대상을 보는 다른 워크트리의 데몬과 PNG 를 나눠 쓰지 않는다.
기본 대상은 nowinandroid(`ForYouScreen.kt` 620줄 · 25장 ↔ `core:ui` `NewsResourceCard.kt`). 덤프는 미리 떠 둔 것을 쓰고 Gradle 은 부르지 않는다.
"""

import argparse
import http.client
import json
import os
import random
import re
import shutil
import socket
import statistics
import subprocess
import sys
import threading
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLI = os.path.join(ROOT, "plugin", "bin", "prevue")
sys.path.insert(0, os.path.join(ROOT, "plugin", "bin"))
import prevue_plan as P  # noqa: E402

NIA = os.path.expanduser("~/Desktop/Private/nowinandroid")
# 기획 6절. 바꾸면 기획부터 고친다.
LIMITS = {
    "NFR-11": ("콜드 — start → 첫 PNG 중앙값", 5000),
    "NFR-1": ("저장 → 첫 카드 중앙값", 1000),
    "NFR-1 p90": ("저장 → 첫 카드 p90", 1500),
    "NFR-1b": ("저장 → 보드 전부 중앙값", 3000),
    "NFR-12": ("다른 모듈 전환 중앙값", 1000),
    "NFR-6": ("반복 뒤 RSS — 마지막 10바퀴 중앙값(MB)", 2560),
    "NFR-6 봉우리": ("반복 중 RSS 최대(MB)", 3072),
    "NFR-14": ("유휴 감시 CPU(%)", 2.0),
    "NFR-4": ("무한 루프 렌더 → 실패 응답(ms)", 30000 + 3000),
    "NFR-4 회복": ("실패 → 다른 프리뷰를 다시 그림(ms)", 10000),
    "NFR-19": ("낡은 탭 전환 → 첫 카드 중앙값", 1000),
    "NFR-19b": ("낡은 탭 전환 → 보드 전부 중앙값", 3000),
    "NFR-19c": ("낡지 않은 탭 전환 → 화면 중앙값", 200),
    "NFR-1 tabs": ("탭 10개 — 저장 → 첫 카드 중앙값, 탭 하나 대비 증분(%)", 10),
    "NFR-20": ("탭 10개 왕복 + 저장 — RSS 최대, 탭 하나 대비 증분(MB)", 150),
    "NFR-6 스트림": ("인터랙티브 + 스트림 조작 중 footprint 중앙값(MB)", 2560),
    "NFR-6 스트림 봉우리": ("인터랙티브 + 스트림 조작 중 footprint 최대(MB)", 3072),
    "NFR-6 스트림 조작": ("조작 실패 + 로그 예외 줄 + 데몬 재시작", 0),
}
FIXTURE = os.path.join(ROOT, "fixtures", "pearl")
FIXTURE_SRC = os.path.join(FIXTURE, "feature", "pearl", "src", "main", "kotlin", "com", "example", "pearl", "feature", "pearl")
TABS = 10
HANG = """package nfr.bench

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview

@Preview
@Composable
fun NfrHang() {
    while (true) { }
}
"""

# 127.0.0.1 은 NO_PROXY 대상이다 — 환경의 프록시를 타지 않게 연다.
_http = urllib.request.build_opener(urllib.request.ProxyHandler({}))


def ms_since(t):
    return round((time.monotonic() - t) * 1000)


def p90(xs):
    s = sorted(xs)
    return s[max(0, -(-len(s) * 9 // 10) - 1)]


class Bench:
    def __init__(self, a):
        self.a, self.port = a, a.port or self.free_port()
        self.base = "http://127.0.0.1:%d" % self.port
        self.log = os.path.join(os.environ.get("PREVUE_HOME", os.path.expanduser("~/.prevue")), "daemons", "daemon-%d.log" % self.port)
        key = P.repo_key(a.repo)
        src = os.path.expanduser("~/.prevue/projects/" + key)
        self.home = os.path.join(ROOT, ".cache", "nfr", ".prevue", "projects", key)
        shutil.rmtree(os.path.join(self.home, "daemon"), ignore_errors=True)
        os.makedirs(self.home, exist_ok=True)
        for d in (a.dump, a.resources_from):
            if d and not os.path.isfile(os.path.join(src, d)):
                sys.exit("덤프가 없다: %s — prevue warmup 으로 먼저 뜬다(대상 Gradle, 승인 필요)" % os.path.join(src, d))
            if d:
                shutil.copy(os.path.join(src, d), self.home)
        self.spike = os.path.join(ROOT, ".cache", "spike", "nfr")
        shutil.rmtree(self.spike, ignore_errors=True)
        os.makedirs(self.spike)
        self.file = shutil.copy(a.file, self.spike)
        self.text = open(self.file, encoding="utf-8").read()
        self.lines = self.text.count("\n")
        if a.literal_at and (self.text.count(a.literal_at) != 1 or not re.search(r"\d", a.literal_at)):
            sys.exit("--literal-at 은 숫자가 든 조각이고 파일에 한 번만 있어야 한다: %r" % a.literal_at)
        # D-68. 고치는 values 파일의 원래 내용 — main 이 끝에 되돌린다.
        self.values_text = None
        if a.resource_at:
            self.values_text = open(a.values, encoding="utf-8").read()
            if self.values_text.count(a.resource_at) != 1:
                sys.exit("--resource-at 은 %s 에 한 번만 있어야 한다: %r" % (a.values, a.resource_at))
        self.hang = os.path.join(self.spike, "NfrHang.kt")
        self.raw, self.rows = {}, []

    @staticmethod
    def free_port():
        with socket.socket() as s:
            s.bind(("127.0.0.1", 0))
            return s.getsockname()[1]

    def cli(self, *args, timeout=120):
        t = time.monotonic()
        p = subprocess.run([CLI, *args, "--port", str(self.port)], capture_output=True, text=True, timeout=timeout)
        return p.returncode, p.stdout, ms_since(t)

    def get(self, path):
        with _http.open(self.base + path, timeout=5) as r:
            return json.loads(r.read())

    def post(self, path, body, timeout=120):
        req = urllib.request.Request(self.base + path, json.dumps(body).encode(), {"Content-Type": "application/json"})
        try:
            with _http.open(req, timeout=timeout) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            return json.loads(e.read())

    def start(self):
        args = ["start", "--classpath", os.path.join(self.home, self.a.dump), "--watch", self.spike, "--no-open", "--show", self.file]
        if self.a.resources_from:
            args[3:3] = ["--resources-from", os.path.join(self.home, self.a.resources_from)]
        t = time.monotonic()
        proc = subprocess.Popen([CLI, *args, "--port", str(self.port)], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        first = None
        while proc.poll() is None and first is None:
            try:
                if any(c.get("ok") for c in (self.get("/board").get("cards") or [])):
                    first = ms_since(t)
            except (OSError, ValueError):
                pass
            time.sleep(0.05)
        out, err = proc.communicate(timeout=120)
        if proc.returncode != 0:
            sys.exit("start 실패(%d): %s %s" % (proc.returncode, out[-800:], err[-800:]))
        return first or ms_since(t), ms_since(t)

    def stop(self):
        self.cli("stop", timeout=60)

    def save(self, i):
        """파일 끝 주석 한 줄을 바꿔 제자리 덮어쓴다(지난 회차들과 같은 저장).
        `--literal-at` 이면 그 조각의 첫 정수만 바꾼다 — 리터럴 빠른 경로(D-67)를 탄다. 첫 저장은 그 파일을 처음 컴파일해 버린다.
        `--resource-at` 이면 values 파일의 그 조각 뒤에 번호를 붙인다 — 리소스 값 핫리로드(D-68)를 탄다. 저장한 파일을 돌려준다."""
        if self.a.resource_at:
            with open(self.a.values, "w", encoding="utf-8") as f:
                f.write(self.values_text.replace(self.a.resource_at, "%s %d" % (self.a.resource_at, 1 + i % 2), 1))
            return self.a.values
        if self.a.literal_at:
            m = re.search(r"\d+", self.a.literal_at)
            snip = self.a.literal_at[:m.start()] + str(int(m.group()) + 1 + i % 2) + self.a.literal_at[m.end():]
            text = self.text.replace(self.a.literal_at, snip, 1)
        else:
            text = self.text + "// nfr %d\n" % i
        with open(self.file, "w", encoding="utf-8") as f:
            f.write(text)
        return self.file

    def restore_values(self):
        if self.values_text is not None:
            with open(self.a.values, "w", encoding="utf-8") as f:
                f.write(self.values_text)

    def reload_lines(self, since):
        with open(self.log, encoding="utf-8", errors="replace") as f:
            f.seek(since)
            return [l for l in f.read().splitlines() if l.startswith("reload ") or " reload " in l], f.tell()

    def offset(self):
        return os.path.getsize(self.log) if os.path.exists(self.log) else 0

    # ── 측정 ──

    def cold(self):
        firsts, boards = [], []
        for i in range(self.a.cold):
            if i:
                self.stop()
            first, board = self.start()
            firsts.append(first)
            boards.append(board)
        self.raw["cold"] = {"firstMs": firsts, "boardMs": boards}
        self.row("NFR-11", statistics.median(firsts), "%d회 %s · 보드 25장까지 %s" % (len(firsts), firsts, boards))

    def hot(self):
        first, board, fast = [], [], 0
        for i in range(self.a.saves + 1):                        # 첫 회는 버린다 — 첫 컴파일 세대
            time.sleep(self.a.interval)
            off = self.offset()
            saved = self.save(i)
            t = time.monotonic()
            rc, out, _ = self.cli("wait", saved, timeout=60)
            done = ms_since(t)
            lines, _ = self.reload_lines(off)
            m = [re.search(r"ok=true .*saveToScreen=(\d+)ms", l) for l in lines]
            m = [x for x in m if x]
            if rc != 0 or not m:
                sys.exit("저장 %d: wait %d 또는 reload 줄 없음 — %s %s" % (i, rc, out[-600:], lines))
            if i:                                                # wait 는 저장 직후 불렀다 — 그 벽시계가 저장 → 보드 전부다
                first.append(int(m[0].group(1)))
                board.append(done)
                fast += any(l.rstrip().endswith(" literals") or l.rstrip().endswith(" resources") for l in lines)
        self.raw["hot"] = {"firstMs": first, "boardMs": board, ("resourceSaves" if self.a.resource_at else "literalSaves"): fast}
        how = " · 리터럴 저장 `%s` — 빠른 경로 %d/%d회" % (self.a.literal_at, fast, len(first)) if self.a.literal_at else ""
        if self.a.resource_at:
            how = " · values 저장 `%s`(%s) — 값만 넣기 %d/%d회" % (self.a.resource_at, os.path.basename(self.a.values), fast, len(first))
        self.row("NFR-1", statistics.median(first), "%d줄 · %d회%s" % (self.lines, len(first), how))
        self.row("NFR-1 p90", p90(first), "")
        self.row("NFR-1b", statistics.median(board), "보드 %d장" % len(self.get("/board")["cards"]))

    def switch(self):
        other, ms = self.a.other, []
        for _ in range(self.a.switches):
            rc, out, t = self.cli("show", other, timeout=60)
            if rc != 0:
                sys.exit("전환 실패(%d): %s" % (rc, out[-600:]))
            ms.append(t)
            self.cli("show", self.file, timeout=60)
        self.raw["switch"] = ms
        self.row("NFR-12", statistics.median(ms), "%s → %s · CLI 벽시계 %s" % (os.path.basename(self.file), os.path.basename(other), ms))

    def memory(self):
        rss, heap = [], []
        for i in range(self.a.rounds):
            self.cli("show", self.a.other, timeout=60)
            self.cli("show", self.file, timeout=60)
            self.save(1000 + i)
            self.cli("wait", self.file, timeout=60)
            m = self.get("/status")["memory"]
            rss.append(m["rssMb"])
            heap.append(m["heapUsedMb"])
            print("  바퀴 %d RSS %d · 힙 %d MB" % (i + 1, m["rssMb"], m["heapUsedMb"]), file=sys.stderr)
        self.raw["rssMb"], self.raw["heapUsedMb"] = rss, heap
        # GC 가 힙을 키웠다 줄이기까지 시차가 있어 봉우리가 선다 — 새는지는 정상 상태(뒤 10바퀴)로 본다(사용자 2026-10-04).
        self.row("NFR-6", statistics.median(rss[-10:]), "모듈 왕복 + 저장 %d바퀴 · 처음 %d → 끝 %dMB · 힙 사용 %d~%dMB" %
                 (len(rss), rss[0], rss[-1], min(heap), max(heap)))
        self.row("NFR-6 봉우리", max(rss), "")

    def idle_cpu(self):
        time.sleep(self.a.idle)
        st = self.get("/status")
        w, v = st.get("watch") or {}, st.get("valuesWatch") or {}
        self.raw["watch"], self.raw["valuesWatch"] = w, v
        # values XML 감시(D-68)도 같은 상주 비용이다 — 둘을 더한다.
        cpu = float(w.get("cpuPct", "inf")) + float(v.get("cpuPct", 0))
        self.row("NFR-14", round(cpu, 2), "유휴 %d초 · 감시 파일 %s(대형 앱 규모는 .kt 4,590) · values %s개 %s%%" %
                 (self.a.idle, w.get("files"), v.get("files", 0), v.get("cpuPct", 0)))

    def timeout(self):
        """무한 루프 컴포저블을 감시 디렉터리에 저장한 뒤 — 실패가 상한 안에 오는가, 그 뒤 데몬이 다시 그리는가.
        루프는 감시가 컴파일해 다시 그릴 때 돈다(`show` 는 컴파일 전이라 빈 이미지로 끝난다). 렌더 스레드는 되찾을 수 없어 데몬이 자기를 다시 띄운다."""
        open(self.hang, "w", encoding="utf-8").write(HANG)
        t = time.monotonic()
        rc, out, shown = self.cli("show", self.hang, timeout=120)
        failed_at = back = None
        tries = []
        while back is None and ms_since(t) < 120_000:
            try:
                r, o, w = self.cli("show", self.file, timeout=60)
            except subprocess.TimeoutExpired:
                r, o, w = -1, "CLI 60초 무응답", 60_000
            tries.append({"rc": r, "ms": w, "out": o[-300:]})
            if r == 0 and '"ok": true' in o:
                back = ms_since(t)
            elif failed_at is None and ("TIMEOUT" in o or r == 3):     # 잃은 렌더의 실패, 또는 다시 뜨는 중
                failed_at = ms_since(t)
        self.raw["hang"] = {"rc": rc, "showMs": shown, "out": out[-800:], "failedMs": failed_at, "backMs": back, "tries": tries}
        self.row("NFR-4", failed_at if failed_at is not None else float("inf"), "show 자체는 %dms(컴파일 전 빈 이미지)" % shown)
        self.row("NFR-4 회복", back - failed_at if back and failed_at is not None else float("inf"),
                 "다시 그리기까지 %s" % ("%sms" % back if back else "못 함"))

    # ── 뷰어 탭(D-54) ──

    def show_timed(self, target):
        """탭 전환을 데몬 쪽에서 잰다 — CLI 기동(셸 · python)이 0.2초 상한을 먹지 않게 `/show`를 바로 친다.
        첫 카드는 보드가 그 파일이 되고 지금 세대의 그림이 한 장이라도 있는 순간, 보드 전부는 카드가 다 지금 세대인 순간이다."""
        t = time.monotonic()
        res = {}
        th = threading.Thread(target=lambda: res.update(self.post("/show", {"target": target, "by": "nfr"})))
        th.start()
        first = whole = None
        want = os.path.realpath(target)
        while whole is None and ms_since(t) < 60_000:
            try:
                b = self.get("/board")
            except (OSError, ValueError):
                b = {}
            cards = b.get("cards") or []
            if os.path.realpath(b.get("file") or "") == want:
                if first is None and any(c.get("ok") and not c.get("stale") for c in cards):
                    first = ms_since(t)
                if cards and all(c.get("rendered") and not c.get("stale") for c in cards):
                    whole = ms_since(t)
            time.sleep(0.01)
        th.join(60)
        if res.get("error") or not res.get("tab"):           # 그 카드의 렌더 실패(ok=false)는 탭이 열린 것이다 — 열기 자체가 실패한 것만 멈춘다
            sys.exit("탭 전환 실패: %s" % json.dumps(res, ensure_ascii=False)[-600:])
        return first, whole, res.get("tab")

    def tab_files(self):
        """탭 10개를 채울 파일들 — 이 데몬이 그리는 모듈의 `@Preview` 파일을 이름순으로. 대상 저장소는 읽기만 한다."""
        mods = self.get("/status").get("modules") or []
        skip = {os.path.realpath(self.file), os.path.realpath(self.a.other)}
        out = []
        for m in mods:
            d = os.path.join(self.a.repo, *m.strip(":").split(":"), "src", "main")
            for root, _, names in sorted(os.walk(d)):
                for n in sorted(names):
                    p = os.path.join(root, n)
                    # `@Preview`가 있어도 멀티프리뷰 애너테이션만 둔 파일은 열 것이 없다 — 데몬에게 묻는다
                    if (n.endswith(".kt") and os.path.realpath(p) not in skip and "@Preview" in open(p, encoding="utf-8", errors="replace").read()
                            and self.post("/previews", {"file": p}).get("previews")):
                        out.append(p)
                    if len(out) >= TABS - 2:
                        return out
        return out

    def close_all_but(self, keep):
        for t in self.get("/status").get("tabs") or []:
            f = t.get("fqn") or t.get("file")
            if f and os.path.realpath(f) != os.path.realpath(keep):
                self.post("/close", {"target": f})

    def tab_switch(self):
        """NFR-19. 숨은 화면 탭이 저장으로 낡은 채 돌아오기(다시 그림)와, 낡지 않은 컴포넌트 탭으로 돌아오기(되살림)."""
        self.close_all_but(self.file)
        self.show_timed(self.a.other)
        stale_first, stale_board, fresh = [], [], []
        for i in range(self.a.switches):
            self.save(2000 + i)                                  # 컴포넌트 탭을 보는 중에 화면 파일을 저장 — 화면 탭이 낡는다
            self.cli("wait", self.file, timeout=60)
            first, whole, _ = self.show_timed(self.file)
            stale_first.append(first)
            stale_board.append(whole)
            first, _, _ = self.show_timed(self.a.other)          # 그사이 저장이 없었다 — 되살린다
            fresh.append(first)
        self.raw["tabSwitch"] = {"staleFirstMs": stale_first, "staleBoardMs": stale_board, "freshMs": fresh}
        self.row("NFR-19", statistics.median(stale_first), "%s 탭 · %d회 %s" % (os.path.basename(self.file), len(stale_first), stale_first))
        self.row("NFR-19b", statistics.median(stale_board), "%s" % stale_board)
        self.row("NFR-19c", statistics.median(fresh), "%s 탭 · %s" % (os.path.basename(self.a.other), fresh))

    def tab_rounds(self, files, keep):
        """탭을 하나씩 다 거친 뒤 화면 파일로 돌아와 저장한다. keep 이 거짓이면 옮길 때마다 앞 탭을 닫아 탭 하나로 같은 일을 한다."""
        first, rss = [], []
        for i in range(self.a.tab_rounds):
            for f in files[1:] + files[:1]:
                before = [t.get("fqn") or t.get("file") for t in self.get("/status").get("tabs") or [] if t.get("active")]
                self.show_timed(f)
                if not keep:
                    for b in before:
                        if b and os.path.realpath(b) != os.path.realpath(f):
                            self.post("/close", {"target": b})
            off = self.offset()
            self.save(3000 + i + (100 if keep else 0))
            rc, out, _ = self.cli("wait", self.file, timeout=60)
            m = [re.search(r"ok=true .*saveToScreen=(\d+)ms", l) for l in self.reload_lines(off)[0]]
            m = [x for x in m if x]
            if rc != 0 or not m:
                sys.exit("탭 회차 저장: wait %d 또는 reload 줄 없음 — %s" % (rc, out[-600:]))
            first.append(int(m[0].group(1)))
            rss.append(self.get("/status")["memory"]["rssMb"])
        return first, rss

    def tabs(self):
        """NFR-20 · NFR-1 탭 조건. 같은 파일 · 같은 저장을 탭 하나(앞 탭을 닫으며)와 탭 10개로 돌려 견준다 — 차이가 곧 탭이 쥔 것이다."""
        files = [self.file, self.a.other] + self.tab_files()
        if len(files) < TABS:
            sys.exit("탭 %d개를 채울 @Preview 파일이 모자라다(%d)" % (TABS, len(files)))
        self.close_all_but(self.file)
        one_first, one_rss = self.tab_rounds(files, keep=False)
        many_first, many_rss = self.tab_rounds(files, keep=True)
        n = len(self.get("/status").get("tabs") or [])
        self.raw["tabs"] = {"files": files, "one": {"firstMs": one_first, "rssMb": one_rss}, "many": {"firstMs": many_first, "rssMb": many_rss}, "open": n}
        m1, m10 = statistics.median(one_first), statistics.median(many_first)
        self.row("NFR-1 tabs", round((m10 - m1) * 100 / m1, 1), "탭 하나 %dms → 탭 %d개 %dms · %d바퀴" % (m1, n, m10, len(many_first)))
        self.row("NFR-20", max(many_rss) - max(one_rss), "탭 하나 최대 %d(%s) → 탭 %d개 최대 %d(%s)MB" % (max(one_rss), one_rss, n, max(many_rss), many_rss))

    def row(self, nfr, value, note):
        what, limit = LIMITS[nfr]
        print("%s %s — %s" % (nfr, value, note), file=sys.stderr)
        self.rows.append((nfr, what, limit, value, value <= limit, note))

    def describe(self):
        return ["- 대상: `%s`(%d줄) ↔ `%s`. 복사본 `.cache/spike/nfr/`를 `--watch`, 덤프는 `.cache/nfr/`로 격리" %
                (os.path.basename(self.a.file), self.lines, os.path.basename(self.a.other)),
                "- 저장 %d회(첫 회 버림) · 간격 %.1f초 · 콜드 %d회 · 전환 %d회 · 메모리 %d바퀴(모듈 왕복 + 저장) · 탭 %d바퀴" %
                (self.a.saves, self.a.interval, self.a.cold, self.a.switches, self.a.rounds, self.a.tab_rounds)]


def footprint_mb(pid):
    """macOS phys_footprint — RSS 는 유휴 페이지를 압축 · 스왑으로 내려 흔들린다(인터랙티브 스트림 중 RSS 노트)."""
    out = subprocess.run(["footprint", "-p", str(pid)], capture_output=True, text=True, timeout=30).stdout
    m = re.search(r"Footprint: ([\d.]+) (KB|MB|GB)", out)
    return round(float(m.group(1)) * {"KB": 1 / 1024, "MB": 1, "GB": 1024}[m.group(2)]) if m else None


class StreamBench(Bench):
    """NFR-6 스트림. 픽스처의 목록 ↔ 상세 앱(`PearlApp.kt` 카드 0)을 인터랙티브로 켜고 `/stream`을 연 채 조작한다.
    조작마다 트리로 기대 화면(목록 · 상세)을 판정한다 — 먹지 않은 조작으로 잰 메모리는 믿을 수 없다."""

    def __init__(self, a):
        fa = argparse.Namespace(**vars(a))
        fa.repo, fa.file, fa.other = FIXTURE, os.path.join(FIXTURE_SRC, "PearlApp.kt"), None
        fa.dump, fa.resources_from, fa.port, fa.literal_at, fa.resource_at = "feature_pearl-debug.json", "app-debug.json", 0, "", ""
        super().__init__(fa)
        self.screen_file = shutil.copy(os.path.join(FIXTURE_SRC, "PearlScreen.kt"), self.spike)
        self.pid_file = self.log[:-len(".log")] + ".pid"
        self.lit = 28
        self.scrolls = [0, 0]                                    # 정착한 스크롤 — 안 움직임 · 움직임

    def describe(self):
        return ["- 스트림: `fixtures/pearl` `PearlApp.kt` 카드 0 인터랙티브 · `/stream` 연 채 · 시드 %s × 조작 %d번 · footprint %d초마다. "
                "복사본 `.cache/spike/nfr/`를 `--watch`, 덤프는 `.cache/nfr/`로 격리" % (self.a.stream_seeds, self.a.stream_ops, self.a.stream_every)]

    def touch(self, *args):
        rc, out, _ = self.cli("touch", *args, timeout=90)
        return rc, out

    def tree_now(self):
        url = self.post("/viewer/catchup", {}).get("treeUrl")
        if not url:
            raise RuntimeError("catchup 이 treeUrl 을 안 줬다")
        with _http.open(self.base + url, timeout=10) as r:
            return json.loads(r.read())

    @staticmethod
    def screen(tree):
        if "imageSize" not in tree:                              # 렌더 실패의 트리 — fqn · failure 만 있다
            return {"name": "none", "cards": [], "full": [], "back": None, "backLine": None}
        ns, stack = [], list(tree.get("composeViewInfo", []))
        while stack:
            n = stack.pop()
            ns.append(n)
            stack.extend(n.get("children", []))
        area = lambda b: b[2] > b[0] and b[3] > b[1]
        has = lambda name: any(n["name"] == name and n["fileName"] == "PearlApp.kt" and area(n["bounds"]) for n in ns)
        lst, det = has("PearlScreen"), has("DrinkDetailScreen")
        cards = sorted({tuple(n["bounds"]) for n in ns if n["name"] == "DrinkCard" and n["fileName"] == "PearlScreen.kt" and area(n["bounds"])},
                       key=lambda b: (b[1], b[0]))
        grid = next((n["bounds"] for n in ns if n["name"] == "LazyVerticalGrid" and n["fileName"] == "PearlScreen.kt"), None)
        h = tree["imageSize"][1]
        back = [n for n in ns if n["fileName"] == "DrinkDetailScreen.kt" and n["name"] == "BackButton" and area(n["bounds"])]
        return {"name": "list" if lst and not det else "detail" if det and not lst else "both" if lst and det else "none",
                "cards": cards, "full": [b for b in cards if grid and b[1] >= grid[1] and b[3] <= min(grid[3], h)],
                "back": back[0]["bounds"] if back else None, "backLine": back[0]["lineNumber"] if back else None}

    def settle(self, expect, pred=None, timeout=8.0):
        """트리가 두 번 잇달아 같을 때까지 본다. expect 가 None 이면 목록 · 상세 어느 쪽이든. (맞았나, 정착한 화면)"""
        t, s, last = time.monotonic(), None, None
        while time.monotonic() - t < timeout:
            try:
                s = self.screen(self.tree_now())
            except (OSError, ValueError, RuntimeError, KeyError) as e:
                s = {"name": "error:%r" % e, "cards": []}
            if last is not None and (s["name"], s.get("cards"), s.get("back")) == (last["name"], last.get("cards"), last.get("back")):
                return ((s["name"] in ("list", "detail")) if expect is None else s["name"] == expect and (pred is None or pred(s))), s
            last = s
            time.sleep(0.3)
        return False, s

    def save_screen(self, i, literal):
        text = open(self.screen_file, encoding="utf-8").read()
        if literal:
            old, self.lit = "fontSize = %d.sp" % self.lit, 57 - self.lit          # 28 ↔ 29
            text = text.replace(old, "fontSize = %d.sp" % self.lit, 1)
        else:
            text = re.sub(r"\n// nfr stream \d+\n?$", "\n", text).rstrip("\n") + "\n// nfr stream %d\n" % i
        with open(self.screen_file, "w", encoding="utf-8") as f:
            f.write(text)
        rc, out, _ = self.cli("wait", self.screen_file, timeout=90)
        # 인터랙티브 동안은 다른 카드를 안 그려 complete:false 가 정상이다 — 그 카드 자신이 ok 일 때만 성공으로 본다
        try:
            j = json.loads(out.strip().splitlines()[-1])
            cards, focus = j.get("cards") or [], j.get("interactive")
            partial = j.get("complete") is False and focus is not None and focus < len(cards) and cards[focus].get("ok") is True
        except (ValueError, IndexError, AttributeError, TypeError):
            partial = False
        return 0 if rc == 1 and partial else rc, out

    @staticmethod
    def middle(b):
        return str((b[0] + b[2]) // 2), str((b[1] + b[3]) // 2)

    def ops(self, seed, fails):
        """스트레스 테스트의 픽스처 시나리오 — 조작마다 기대 화면을 판정하고, 틀려도 실제 화면으로 맞추고 이어 간다."""
        rnd, chain, before_detail = random.Random(seed), [], None
        cur = self.screen(self.tree_now())
        if cur["name"] not in ("list", "detail"):
            sys.exit("스트림: 처음 화면이 목록 · 상세가 아니다(%s)" % cur["name"])
        for i in range(1, self.a.stream_ops + 1):
            burst, viewer, r = rnd.random() < 0.25, rnd.random() < 0.5, rnd.random()
            if r < 0.08:
                kind = rnd.choice(["save-lit", "save-comp"])
            elif cur["name"] == "list":
                kind = "tap" if r < 0.55 else "scroll" if r < 0.85 else "long"
            else:
                kind = "back"
            op = "%d#%d %s/%s%s" % (seed, i, kind, "viewer" if viewer else "cli", "/burst" if burst else "")
            nosettle = ["--no-settle"] if burst else []
            expect, pred, rc, out = cur["name"], None, 0, ""
            try:
                if kind in ("tap", "long"):
                    if not cur["full"]:                          # 묶음이 짐작한 화면일 수 있다 — 실제 화면으로 맞춘다
                        cur = self.screen(self.tree_now())
                        continue
                    x, y = self.middle(rnd.choice(cur["full"]))
                    before_detail, expect = cur["cards"], "detail"
                    if viewer:
                        self.post("/viewer/touch", {"x": int(x), "y": int(y), "type": kind})
                    else:
                        rc, out = self.touch(x, y, kind, *nosettle)
                elif kind == "back":
                    if not cur["back"]:
                        cur = self.screen(self.tree_now())
                        continue
                    x, y = self.middle(cur["back"])
                    if viewer:
                        self.post("/viewer/touch", {"x": int(x), "y": int(y), "type": "tap"})
                    elif rnd.random() < 0.5:
                        rc, out = self.touch("--at", "DrinkDetailScreen.kt:%d" % cur["backLine"], *nosettle)
                    else:
                        rc, out = self.touch(x, y, "tap", *nosettle)
                    expect, want = "list", before_detail
                    pred = lambda s, want=want: want is None or s["cards"] == want
                elif kind == "scroll":
                    dy, gx, gy = rnd.choice([-1, 1]) * rnd.choice([300, 700, 1400]), 470, 1200
                    if viewer:
                        for _ in range(4):
                            self.post("/viewer/wheel", {"x": gx, "y": gy, "dx": 0, "dy": dy / 4})
                    else:                                        # 스와이프 — press · drag 여섯 번 · release
                        y0 = max(300, min(1900, gy + dy // 2 if dy > 0 else gy - (-dy) // 2))
                        y1 = max(300, min(1900, y0 - dy))
                        steps = [("press", y0, ["--no-settle"])] + [("drag", y0 + (y1 - y0) * k // 6, ["--no-settle"]) for k in range(1, 7)]
                        for t, yy, extra in steps + [("release", y1, nosettle)]:
                            r2, o2 = self.touch(str(gx), str(yy), t, *extra)
                            if r2:
                                rc, out = r2, o2
                    expect = "list"
                else:
                    rc, out = self.save_screen(i, kind == "save-lit")
                    expect, before_detail = "list", None
                    pred = lambda s: bool(s["cards"]) and s["cards"][0][1] < 400   # 저장하면 처음 화면으로 돌아간다(D-11)
            except (OSError, ValueError, RuntimeError, KeyError, subprocess.TimeoutExpired) as e:
                fails.append("%s — 조작 예외 %r" % (op, e))
            if rc:
                fails.append("%s — 종료 %d %s" % (op, rc, out[-300:]))
            if burst and rnd.random() < 0.6 and i < self.a.stream_ops:
                # 잇단 조작 — 전환 도중의 탭은 어디 맞을지 모른다. 다음 조작은 짐작한 화면으로 뽑고, 묶음 끝에 정착만 본다
                cur = dict(cur, name=expect)
                chain.append(op)
                continue
            ok, s = self.settle(None, None) if chain else self.settle(expect, pred)
            if not ok:
                fails.append("%s — 기대 %s, 실제 %s%s" % (op, "정착" if chain else expect, s and s.get("name"), " · 묶음 %s" % chain if chain else ""))
            if chain:
                chain, before_detail = [], None
            elif kind == "scroll" and ok:
                self.scrolls[0 if s["cards"] == cur["cards"] else 1] += 1   # 목록 끝이면 안 움직이는 게 맞다 — 세기만 한다
            cur = s if s and s["name"] in ("list", "detail") else self.screen(self.tree_now())
            if i % 50 == 0:
                print("  스트림 시드 %d #%d 실패 %d" % (seed, i, len(fails)), file=sys.stderr)

    def stream(self):
        self.start()
        r = self.post("/focus", {"index": 0, "interactive": True, "by": "nfr"})
        if r.get("error") or r.get("ok") is False:
            sys.exit("스트림: 인터랙티브를 켜지 못했다: %s" % json.dumps(r, ensure_ascii=False)[-400:])
        if not self.settle(None, timeout=60)[0]:
            sys.exit("스트림: 인터랙티브 화면이 정착하지 않았다")
        pid0, log0 = open(self.pid_file).read().strip(), self.offset()
        frames, samples, stop = [0], [], threading.Event()

        def watch_stream():
            while not stop.is_set():
                try:
                    with _http.open(self.base + "/stream", timeout=30) as r:
                        tail = b""
                        while not stop.is_set():
                            chunk = r.read(65536)
                            if not chunk:
                                break
                            buf = tail + chunk                    # 청크 경계에 걸친 머리도 센다
                            frames[0] += buf.count(b"Content-Type: image/")
                            tail = buf[-19:]
                except (OSError, http.client.HTTPException):    # 데몬을 내리면 청크 중간에 끊긴다
                    time.sleep(0.5)

        def sample():
            while not stop.wait(self.a.stream_every):
                try:
                    m = self.get("/status")["memory"]
                    samples.append({"footprintMb": footprint_mb(open(self.pid_file).read().strip()), "rssMb": m["rssMb"], "heapUsedMb": m["heapUsedMb"]})
                except Exception as e:                           # noqa: BLE001 — 표본 하나를 잃어도 끝까지 잰다
                    samples.append({"error": repr(e)})

        for f in (watch_stream, sample):
            threading.Thread(target=f, daemon=True).start()
        fails, t0 = [], time.monotonic()
        try:
            for seed in [int(x) for x in self.a.stream_seeds.split(",")]:
                self.ops(seed, fails)
        finally:
            stop.set()
        with open(self.log, encoding="utf-8", errors="replace") as f:
            f.seek(log0)
            exc = [l for l in f.read().splitlines() if re.search(r"Exception|Error|at [a-z]+\.[A-Za-z.]+\(", l)]
        restarted = open(self.pid_file).read().strip() != pid0
        foot = [x["footprintMb"] for x in samples if x.get("footprintMb")]
        rss = [x["rssMb"] for x in samples if x.get("rssMb")]
        if frames[0] == 0 or not foot:
            sys.exit("스트림: 프레임 %d · footprint 표본 %d — 잴 수 없었다" % (frames[0], len(foot)))
        secs = round(time.monotonic() - t0)
        self.raw["stream"] = {"samples": samples, "frames": frames[0], "fails": fails, "logExceptions": exc[:50], "restarted": restarted, "seconds": secs}
        self.row("NFR-6 스트림", statistics.median(foot), "표본 %d개(%d초마다) · 처음 %d → 끝 %dMB · RSS 중앙값 %d · 최대 %dMB · 기준 G1 1,415MB(10-08)" %
                 (len(foot), self.a.stream_every, foot[0], foot[-1], statistics.median(rss), max(rss)))
        self.raw["stream"]["scrolls"] = {"still": self.scrolls[0], "moved": self.scrolls[1]}
        self.row("NFR-6 스트림 봉우리", max(foot), "프레임 %d장 · %d초 · 스크롤 움직임 %d · 안 움직임(끝) %d" % (frames[0], secs, self.scrolls[1], self.scrolls[0]))
        self.row("NFR-6 스트림 조작", len(fails) + len(exc) + restarted, "실패 %d %s · 로그 예외 줄 %d · 데몬 재시작 %s" %
                 (len(fails), fails[:3], len(exc), "있음" if restarted else "없음"))


def report(benches, sha):
    when = time.strftime("%Y-%m-%d")
    print("## %s · %s · `%s` · NFR 통합 측정(`tools/nfr_bench.py`)\n" % (when, " · ".join(os.path.basename(b.a.repo) for b in benches), sha))
    print("\n".join(l for b in benches for l in b.describe()) + "\n")
    rows = [r for b in benches for r in b.rows]
    print("| NFR | 무엇 | 상한 | 값 | 판정 | 비고 |\n|---|---|---|---|---|---|")
    for nfr, what, limit, value, ok, note in rows:
        print("| %s | %s | %s | %s | %s | %s |" % (nfr, what, limit, value, "통과" if ok else "**넘음**", note))
    path = os.path.join(ROOT, ".cache", "nfr", time.strftime("%Y%m%d-%H%M%S") + ".json")
    raw = {k: v for b in benches for k, v in b.raw.items()}
    json.dump({"sha": sha, "raw": raw, "rows": rows}, open(path, "w"), ensure_ascii=False, indent=1, default=str)
    print("\n원값: `%s`" % os.path.relpath(path, ROOT))
    return all(r[4] for r in rows)


def run(b, steps):
    try:
        steps()
    finally:
        try:
            b.stop()
        finally:
            b.restore_values()                                   # 대상 체크아웃은 무슨 일이 있어도 되돌린다
            shutil.rmtree(b.spike, ignore_errors=True)


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--repo", default=NIA)
    ap.add_argument("--file", default=NIA + "/feature/foryou/impl/src/main/kotlin/com/google/samples/apps/nowinandroid/feature/foryou/impl/ForYouScreen.kt")
    ap.add_argument("--other", default=NIA + "/core/ui/src/main/kotlin/com/google/samples/apps/nowinandroid/core/ui/NewsResourceCard.kt")
    ap.add_argument("--dump", default="feature_foryou_impl-demoDebug.json", help="~/.prevue/projects/<키>/ 아래 이름")
    ap.add_argument("--resources-from", default="app-demoDebug.json")
    ap.add_argument("--port", type=int, default=0)
    ap.add_argument("--cold", type=int, default=3)
    ap.add_argument("--saves", type=int, default=20)
    ap.add_argument("--interval", type=float, default=1.5)
    ap.add_argument("--switches", type=int, default=5)
    ap.add_argument("--rounds", type=int, default=30)
    ap.add_argument("--idle", type=int, default=20)
    ap.add_argument("--tab-rounds", type=int, default=5)
    ap.add_argument("--literal-at", default="", help="저장마다 이 조각의 첫 정수만 바꾼다(D-67 리터럴 빠른 경로). 비우면 끝 주석 한 줄")
    ap.add_argument("--resource-at", default="", help="저장마다 --values 파일의 이 조각 뒤에 번호를 붙인다(D-68 리소스 값 핫리로드). 끝에 되돌린다")
    ap.add_argument("--values", default=NIA + "/feature/foryou/api/src/main/res/values/strings.xml")
    ap.add_argument("--stream-seeds", default="1,2", help="NFR-6 스트림 — 쉼표로, 시드마다 --stream-ops 번 조작한다(한 데몬에 잇달아)")
    ap.add_argument("--stream-ops", type=int, default=300)
    ap.add_argument("--stream-every", type=int, default=10, help="footprint 를 재는 간격(초)")
    ap.add_argument("--skip", default="", help="쉼표로 — cold,hot,switch,memory,tabswitch,tabs,idle,timeout,stream")
    a = ap.parse_args()
    skip = set(filter(None, a.skip.split(",")))
    sha = subprocess.run(["git", "-C", ROOT, "rev-parse", "--short", "HEAD"], capture_output=True, text=True).stdout.strip()
    benches = []
    steps = ("cold", "hot", "switch", "memory", "tabswitch", "tabs", "idle", "timeout")
    fixture_dumps = os.path.expanduser("~/.prevue/projects/" + P.repo_key(FIXTURE))
    if "stream" not in skip and not all(os.path.isfile(os.path.join(fixture_dumps, d)) for d in ("feature_pearl-debug.json", "app-debug.json")):
        # 앞 단계를 다 돈 뒤에 멈추지 않게 미리 본다
        sys.exit("픽스처 덤프가 없다: %s — bin/prevue warmup %s --variant debug --resources-from :app (저장소 안 픽스처라 승인 밖)"
                 " 또는 --skip stream" % (fixture_dumps, os.path.join(FIXTURE_SRC, "PearlPreviews.kt")))
    if not skip.issuperset(steps):
        b = Bench(a)
        benches.append(b)

        def main_steps():
            if "cold" in skip:
                b.start()
            else:
                b.cold()
            for name in steps[1:]:
                if name not in skip:
                    getattr(b, {"idle": "idle_cpu", "tabswitch": "tab_switch"}.get(name, name))()
        run(b, main_steps)
    if "stream" not in skip:                                     # 앞 데몬을 내린 뒤 — 두 데몬이 메모리를 나눠 쓰지 않게
        s = StreamBench(a)
        benches.append(s)
        try:
            run(s, s.stream)
        except (Exception, SystemExit) as e:                     # noqa: BLE001 — 스트림이 멈춰도 앞 단계의 숫자는 남긴다
            s.row("NFR-6 스트림", float("inf"), "멈춤: %s" % (e.code if isinstance(e, SystemExit) else repr(e)))
    sys.exit(0 if benches and report(benches, sha) else 1)


if __name__ == "__main__":
    main()
