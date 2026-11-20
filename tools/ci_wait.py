#!/usr/bin/env python3
"""작업 PR 의 필수 CI(Verify 의 ci-success)를 한 번에 기다려 판정한다 — implement 의 PR 올리기 도구가 부른다.

    python3 tools/ci_wait.py <PR 번호> [--appear-timeout 600] [--poll 15]

종료 코드: 0 초록 · 1 CI 실패(실패 job 과 로그 요지를 찍는다) · 2 develop 과 충돌(CI 가 뜨지 않는다)
          · 3 상한 안에 run 이 생기지 않았다 · 4 도구 오류(gh 실패 · PR 이 열려 있지 않다)

왜 스크립트인가: `gh pr checks --required --watch` 는 ci-success 가 생기기 전이면 "no required checks reported"로
곧바로 끝나고, 충돌한 PR 은 pull_request CI 가 아예 뜨지 않는다. 그래서 충돌 확인 → head 의 run 찾기 → run 이
끝날 때까지 watch → 필수 체크 판정 → 실패 로그 요지를 여기서 묶는다. 로그는 jobs 로그 API 로 원인 job 만 받아 첫
##[error] 앞부분을 자른다 — `--log-failed` 는 run 전체를 쏟아 원인 줄이 정리 단계 출력에 묻힌다. 일시 실패인지 · 다시 돌릴지는 부른 쪽이 판단한다 — 여기서 재실행하지 않는다.
"""

import argparse
import json
import re
import subprocess
import sys
import time

WORKFLOW = "build.yml"
REQUIRED = "ci-success"
ANSI = re.compile(r"\x1b\[[0-9;?]*[A-Za-z]")
STAMP = re.compile(r"^\d{4}-\d\d-\d\dT[\d:.]+Z ")
LOG_LINES = 40


class GhError(Exception):
    pass


class Conflict(Exception):
    pass


def gh(*args, check=True):
    p = subprocess.run(["gh", *args], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if check and p.returncode != 0:
        raise GhError(f"gh {' '.join(args)} — 종료 {p.returncode}: {p.stderr.strip()}")
    return p


def gh_json(*args):
    return json.loads(gh(*args).stdout or "null")


def pr_state(pr, poll):
    # mergeable 은 민 직후 UNKNOWN 이다 — GitHub 가 계산을 마칠 때까지 몇 번 다시 묻는다
    for _ in range(10):
        st = gh_json("pr", "view", str(pr), "--json", "state,mergeable,headRefOid")
        if st["state"] != "OPEN":
            raise GhError(f"PR #{pr} 이 열려 있지 않다({st['state']})")
        if st["mergeable"] == "CONFLICTING":
            raise Conflict
        if st["mergeable"] != "UNKNOWN":
            return st
        time.sleep(poll)
    return st


def conflict(pr):
    print(f"충돌 — PR #{pr} 이 develop 과 충돌(mergeable=CONFLICTING)해 pull_request CI 가 뜨지 않는다. "
          "origin/develop 을 merge 해 풀고 다시 민다.")
    return 2


def find_run(pr, sha, timeout, poll):
    deadline = time.monotonic() + timeout
    while True:
        runs = gh_json("run", "list", "--commit", sha, "--event", "pull_request", "--workflow", WORKFLOW,
                       "--limit", "1", "--json", "databaseId")
        if runs:
            return runs[0]["databaseId"]
        pr_state(pr, poll)
        if time.monotonic() >= deadline:
            return None
        time.sleep(poll)


def failure_excerpt(log):
    lines = [STAMP.sub("", ANSI.sub("", ln)) for ln in log.splitlines()]
    end = next((i for i, ln in enumerate(lines) if ln.startswith("##[error]")), len(lines) - 1)
    return lines[max(0, end - LOG_LINES + 1):end + 1]


def report_failure(run):
    view = gh_json("run", "view", str(run), "--json", "attempt,url,jobs")
    print(f"CI 실패 — run {run} attempt {view['attempt']} · {view['url']}")
    failed = [j for j in view["jobs"] if j.get("conclusion") == "failure"]
    # ci-success 는 다른 job 의 실패를 옮길 뿐이라 원인 로그가 아니다
    causes = [j for j in failed if j["name"] != REQUIRED] or failed
    for job in causes:
        steps = [s["name"] for s in job.get("steps", []) if s.get("conclusion") == "failure"]
        print(f"\n## {job['name']} — 실패 스텝: {', '.join(steps) or '(모름)'}")
        # 원인 job 의 로그만 받는다 — --log-failed 는 실패 job 전부를 한 덩어리로 쏟는다
        log = gh("api", "--allow-escape-sequences", f"repos/{{owner}}/{{repo}}/actions/jobs/{job['databaseId']}/logs",
                 check=False)
        if log.returncode != 0:
            print(f"(로그를 못 읽었다: {log.stderr.strip()})")
            continue
        print("\n".join(failure_excerpt(log.stdout)))
    return 1


def wait(pr, timeout, poll):
    while True:
        sha = pr_state(pr, poll)["headRefOid"]
        run = find_run(pr, sha, timeout, poll)
        if run is None:
            print(f"run 없음 — {timeout}초 안에 head {sha[:8]} 의 {WORKFLOW} run 이 생기지 않았다.")
            return 3
        print(f"기다림 — head {sha[:8]} · run {run}", flush=True)
        # 진행 화면은 버린다. 비 TTY 에서는 새로 고칠 때마다 다시 찍혀 기록만 길어진다. 판정은 아래 checks 가 한다
        gh("run", "watch", str(run), "--compact", "--exit-status", check=False)
        if gh_json("pr", "view", str(pr), "--json", "headRefOid")["headRefOid"] != sha:
            print("head 가 바뀌었다 — 새 head 의 run 을 다시 기다린다.", flush=True)
            continue
        # 실패 · 대기 중이면 종료 코드가 0 이 아니어도 JSON 은 찍힌다. "no required checks reported"면 빈 출력이다
        out = gh("pr", "checks", str(pr), "--required", "--json", "name,bucket,link", check=False).stdout
        checks = json.loads(out) if out.strip() else []
        verdict = next((c for c in checks if c["name"] == REQUIRED), None)
        bucket = verdict["bucket"] if verdict else None
        if bucket == "pass":
            print(f"초록 — {REQUIRED} 통과 · run {run} · {verdict['link']}")
            return 0
        if bucket in (None, "pending"):
            # watch 가 run 이 끝나기 전에 비정상 종료했다 — 도는 CI 를 실패로 보고하지 않는다
            raise GhError(f"run {run} 을 기다렸지만 {REQUIRED} 판정이 아직 없다({bucket or '체크 없음'})")
        return report_failure(run)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("pr", type=int)
    ap.add_argument("--appear-timeout", type=int, default=600, help="run 이 생기기를 기다리는 상한(초)")
    ap.add_argument("--poll", type=float, default=15, help="다시 묻는 간격(초)")
    a = ap.parse_args(argv)
    try:
        return wait(a.pr, a.appear_timeout, a.poll)
    except Conflict:
        return conflict(a.pr)
    except (GhError, OSError, json.JSONDecodeError, KeyError) as e:
        print(f"도구 오류 — {e}", file=sys.stderr)
        return 4


if __name__ == "__main__":
    sys.exit(main())
