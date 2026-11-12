#!/usr/bin/env python3
"""Gradle JUnit 결과 XML을 클래스마다 한 줄로 요약한다.

`./gradlew -q :daemon:integrationTest --tests …`는 통과해도 실패해도 출력이 거의 비어,
결과를 보려면 XML을 열어야 했다. 이 스크립트가 그 일을 한다.

    python3 tools/test-summary.py [결과 폴더]

폴더를 빼면 integrationTest 결과를 본다. 단위 테스트는
plugin/daemon/daemon/build/test-results/test 를 넘긴다.
종료 0 = 전부 통과 · 1 = 실패나 오류가 있다 · 2 = XML이 없다.
판정은 Gradle의 종료 코드다 — 요약은 읽기용이다. 테스트 태스크는 돌 때마다 이 폴더를 비우지만,
컴파일이 실패해 태스크가 돌지 않으면 지난 실행의 XML이 그대로 남아 여기서 0이 나온다. 시각 열로 가린다.
"""
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT = ROOT / "plugin/daemon/daemon/build/test-results/integrationTest"


def first_line(text):
    return next((line.strip() for line in (text or "").splitlines() if line.strip()), "")


def summarize(path):
    suite = ET.parse(path).getroot()
    count = lambda key: int(suite.get(key, 0))
    line = (f"{suite.get('name')}  tests={count('tests')} failures={count('failures')} "
            f"errors={count('errors')} skipped={count('skipped')}  {suite.get('timestamp', '?')}")
    broken = []
    for case in suite.iter("testcase"):
        problem = case.find("failure")
        if problem is None:
            problem = case.find("error")
        if problem is not None:
            message = first_line(problem.get("message")) or first_line(problem.text)
            broken.append(f"  ✗ {case.get('name')} — {message}")
    return line, broken, count("failures") + count("errors")


def main(argv):
    folder = Path(argv[1]) if len(argv) > 1 else DEFAULT
    files = sorted(folder.glob("TEST-*.xml")) if folder.is_dir() else []
    if not files:
        print(f"결과 XML이 없다 — {folder}")
        return 2
    total_failed = 0
    for path in files:
        line, broken, failed = summarize(path)
        print(line)
        # 클래스마다 첫 실패만 — 나머지는 대개 같은 원인이고, 전부는 XML에 있다.
        if broken:
            print(broken[0] + (f"  (외 {len(broken) - 1}건)" if len(broken) > 1 else ""))
        total_failed += failed
    return 1 if total_failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
