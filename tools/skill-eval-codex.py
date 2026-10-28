#!/usr/bin/env python3
"""Codex 스킬 평가(NFR-15 · D-55) — tools/skill-eval.sh(Claude `plugin eval`)와 같은 케이스 · 같은 가짜 prevue 를 Codex 로 돌린다.

Codex 에는 plugin eval 이 없어 여기서 조립 · 실행 · 채점을 한다.
- 조립: build/eval-codex/market 에 로컬 마켓플레이스(`prevue-eval`)를 짓는다 — 진짜 plugin/codex/skills · plugin/bin/help 에 가짜 bin/prevue.
- 실행: 케이스마다 임시 작업 디렉터리에 scaffold.sh 를 돌리고 `codex exec --json` 으로 프롬프트 하나를 보낸다.
  사용자 설정(`~/.codex/config.toml`)은 읽지 않는다(--ignore-user-config) — 설치된 진짜 prevue 플러그인 · 훅 · 다른 플러그인이
  섞이지 않게. 인증은 CODEX_HOME 그대로다(갱신 토큰을 복사하면 원래 Codex 의 로그인이 풀릴 수 있다).
- 채점: 케이스의 graders/*.md 를 Codex 이벤트로 옮겨 읽는다. Skill 호출 = 그 스킬의 SKILL.md 를 읽은 명령,
  Bash = command_execution, Edit = file_change(apply_patch), last_message = 마지막 agent_message, llm = Codex 판정 한 번.

모델 호출이 들어 사용량이 든다 — CI 에 걸지 않고, 스킬 · 도움말을 고친 PR 에서 손으로 돌려 결과를 PR 에 적는다.
  python3 tools/skill-eval-codex.py                          # 전부, 3회씩
  python3 tools/skill-eval-codex.py --case approval-first --runs 1
"""

import argparse
import concurrent.futures as cf
import json
import os
import re
import shutil
import struct
import subprocess
import sys
import tempfile
import time
import zlib

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CASES = os.path.join(ROOT, "tests", "evals", "cases")
# Codex 에만 있는 길(샌드박스 동의 · 재시작)의 케이스. Claude 평가(skill-eval.sh)는 cases 만 읽는다.
CODEX_CASES = os.path.join(ROOT, "tests", "evals", "codex-cases")
CASE_DIRS = (CASES, CODEX_CASES)
OUT = os.path.join(ROOT, "build", "eval-codex")
MARKET = os.path.join(OUT, "market")
PLUGIN = "prevue@prevue-eval"
CODEX_HOME = os.environ.get("CODEX_HOME") or os.path.expanduser("~/.codex")


# 터미널이 codex 를 감싸 MCP 서버 등을 -c 로 덧붙이면 평가 세션에 그 도구가 낀다 — 그때는 감싸지 않은 실행 파일을 준다.
CODEX = os.environ.get("PREVUE_EVAL_CODEX") or "codex"


# ── 조립 ─────────────────────────────────────────────────────────────────────

def png(path, w=412, h=915):
    """응답의 image 가 가리킬 카드 그림(회색). skill-eval.sh 와 같은 것."""
    raw = b"".join(b"\x00" + b"\xee\xee\xee" * w for _ in range(h))
    chunk = lambda t, d: struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
                + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b""))


def assemble(src=ROOT):
    """로컬 마켓플레이스. 심볼릭 링크가 아니라 사본이다 — 플러그인 트리 밖을 가리키는 링크는 실리지 않는다(Claude 평가에서 실측).
    src 는 스킬 · 도움말을 가져올 체크아웃이다(--skills-from). 가짜 prevue · 케이스 · 채점기는 늘 이 체크아웃의 것이라
    두 판을 견주면 차이가 스킬 · 도움말 몫만 남는다."""
    if os.path.isdir(MARKET):
        shutil.rmtree(MARKET)
    plugin = os.path.join(MARKET, "prevue")
    os.makedirs(os.path.join(MARKET, ".agents", "plugins"))
    os.makedirs(os.path.join(plugin, ".codex-plugin"))
    os.makedirs(os.path.join(plugin, "bin"))
    os.makedirs(os.path.join(plugin, "fixtures"))
    with open(os.path.join(MARKET, ".agents", "plugins", "marketplace.json"), "w") as f:
        json.dump({"name": "prevue-eval", "interface": {"displayName": "Prevue (eval)"},
                   "plugins": [{"name": "prevue", "source": {"source": "local", "path": "./prevue"},
                                "policy": {"installation": "AVAILABLE", "authentication": "ON_USE"},
                                "category": "Developer Tools"}]}, f, ensure_ascii=False, indent=1)
    # 플러그인은 plugin/ 에 있다(D-123). 그 전 판의 체크아웃은 루트가 곧 플러그인이다
    product = os.path.join(src, "plugin") if os.path.isdir(os.path.join(src, "plugin")) else src
    shutil.copy(os.path.join(product, ".codex-plugin", "plugin.json"), os.path.join(plugin, ".codex-plugin", "plugin.json"))
    shutil.copytree(os.path.join(product, "codex"), os.path.join(plugin, "codex"))
    shutil.copytree(os.path.join(product, "bin", "help"), os.path.join(plugin, "bin", "help"))
    shutil.copy(os.path.join(ROOT, "tests", "evals", "prevue"), os.path.join(plugin, "bin", "prevue"))
    os.chmod(os.path.join(plugin, "bin", "prevue"), 0o755)
    png(os.path.join(plugin, "fixtures", "card.png"))
    # 설치 = 캐시에 사본을 두는 것 + 설정 두 줄(마켓플레이스 · enabled). 설정은 실행마다 -c 로 줘서 사용자 config.toml 을 건드리지 않고,
    # 캐시는 `prevue-eval` 마켓 이름 아래에만 둔다 — 사용자 설정이 그 이름을 모르므로 평소 Codex 세션에는 실리지 않는다.
    with open(os.path.join(plugin, ".codex-plugin", "plugin.json")) as f:
        version = json.load(f)["version"]
    cache = os.path.join(CODEX_HOME, "plugins", "cache", "prevue-eval")
    if os.path.isdir(cache):
        shutil.rmtree(cache)
    shutil.copytree(plugin, os.path.join(cache, "prevue", version))


# ── 케이스 · 채점기 읽기 ──────────────────────────────────────────────────────
# PyYAML 없이(macOS 기본 python3) 이 저장소의 케이스가 쓰는 모양만 읽는다: 스칼라 · [목록] · { 맵 } · 한 겹 들여쓴 맵.

def _scalar(v):
    v = v.strip()
    if len(v) >= 2 and v[0] == v[-1] and v[0] in "'\"":
        return v[1:-1]
    if v.startswith("[") and v.endswith("]"):
        return [_scalar(x) for x in re.findall(r"""'[^']*'|"[^"]*"|[^,\s][^,]*""", v[1:-1]) if x.strip()]
    if v.startswith("{") and v.endswith("}"):
        out = {}
        for k, x in re.findall(r"""(\w+)\s*:\s*('[^']*'|"[^"]*"|[^,}]+)""", v[1:-1]):
            out[k] = _scalar(x)
        return out
    if re.fullmatch(r"-?\d+", v):
        return int(v)
    return v


def front(text):
    """(머리 맵, 본문). --- 로 감싼 머리가 없으면 ({}, text)."""
    m = re.match(r"^---\n(.*?)\n---\n?(.*)$", text, re.S)
    if not m:
        return {}, text
    head, body, key = {}, m.group(2), None
    for line in m.group(1).splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if line.startswith((" ", "\t")) and key is not None:
            k, _, v = line.strip().partition(":")
            if not isinstance(head.get(key), dict):
                head[key] = {}
            head[key][k.strip()] = _scalar(v)
            continue
        k, _, v = line.partition(":")
        key = k.strip()
        head[key] = _scalar(v) if v.strip() else {}
    return head, body


def case_names():
    return sorted(n for base in CASE_DIRS if os.path.isdir(base)
                  for n in os.listdir(base) if os.path.isdir(os.path.join(base, n)))


def load_case(name):
    d = next((os.path.join(b, name) for b in CASE_DIRS if os.path.isdir(os.path.join(b, name))), None)
    if d is None:
        raise SystemExit("케이스가 없다: %s" % name)
    with open(os.path.join(d, "prompt.md"), encoding="utf-8") as f:
        head, prompt = front(f.read())
    graders = []
    gdir = os.path.join(d, "graders")
    for g in sorted(os.listdir(gdir)):
        with open(os.path.join(gdir, g), encoding="utf-8") as f:
            gh, gb = front(f.read())
        gh["name"], gh["body"] = g[:-3], gb.strip()
        graders.append(gh)
    return {"name": name, "dir": d, "head": head, "prompt": prompt.strip(), "graders": graders}


# ── 실행 ─────────────────────────────────────────────────────────────────────

def codex_cmd(ws, logdir, prompt, args):
    # 플러그인 키에 따옴표를 붙이지 않는다 — -c 의 점 경로는 따옴표를 이름에 그대로 넣어 "잘못된 플러그인 이름"으로 버린다(실측).
    # 가짜 prevue 의 호출 기록은 작업 디렉터리 밖이라 샌드박스가 막는다 — 그 디렉터리만 쓰기로 연다.
    # 처음 보는 git 작업 디렉터리는 Codex 가 사용자 config.toml 에 trust_level 을 적는다(--ignore-user-config 여도, 실행마다 한 줄씩 쌓였다).
    # 그 경로를 -c 로 미리 신뢰된 것으로 준다 — 점 경로라 따옴표 없이, 임시 디렉터리 경로에는 점이 없다.
    # --approve-for-me: 권한 상승 요청을 자동 리뷰가 판정한다(샌드박스는 workspace-write 로 고정 — -s 와 함께 못 쓴다).
    # exec 기본은 상승이 아예 막혀 에이전트가 "이 세션에서는 권한 상승이 안 된다 — 직접 쳐 달라"로 빠졌다(실측).
    # 대화형에서 사람이 승인하는 자리를 흉내 낸다.
    # 샌드박스 네트워크는 연다 — Prevue 를 쓰는 Codex 사용자는 health 의 동의를 거쳐 이 값을 넣어 둔 상태다.
    # 그 동의 자체는 codex-cases 의 sandbox-* 가 가짜 응답으로 잰다.
    trust = "projects.%s.trust_level=\"trusted\"" % os.path.realpath(ws)
    return [CODEX, "exec", "--json", "--ephemeral", "--ignore-user-config", "--disable", "hooks", "--approve-for-me",
            "-C", ws, "--add-dir", logdir, "-m", args.model, "-c", trust,
            "-c", "sandbox_workspace_write.network_access=true",
            "-c", 'model_reasoning_effort="%s"' % args.effort,
            "-c", 'marketplaces.prevue-eval.source_type="local"',
            "-c", 'marketplaces.prevue-eval.source="%s"' % MARKET,
            "-c", "plugins.%s.enabled=true" % PLUGIN,
            prompt]


def run_one(case, i, args):
    rdir = os.path.join(OUT, "runs", case["name"])
    os.makedirs(rdir, exist_ok=True)
    ws = tempfile.mkdtemp(prefix="prevue-eval-%s-" % case["name"])
    logdir = tempfile.mkdtemp(prefix="prevue-eval-log-")
    try:
        subprocess.run(["bash", os.path.join(case["dir"], "scaffold.sh")], cwd=ws, check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        subprocess.run(["git", "init", "-q"], cwd=ws, check=True)   # 대상은 늘 git 저장소다
        # 하네스를 Codex 셸에서 띄워도 바깥 샌드박스 표시가 새지 않게 — 가짜 CLI 가 모든 호출을 [sandbox] 로 본다
        env = {k: v for k, v in os.environ.items() if not k.startswith("CODEX_SANDBOX")}
        env.update({k: str(v) for k, v in (case["head"].get("env") or {}).items()})
        env["EVAL_PREVUE_LOG"] = os.path.join(logdir, "prevue.log")
        env["TMPDIR"] = logdir   # 가짜 CLI 의 준비 상태 파일이 실행과 함께 지워지게
        # 공통 케이스는 Codex 권한(샌드박스 설정 · setup · warmup 의 권한 상승)이 이미 있다고 보고 Claude 와 같은 조건으로 잰다.
        # 권한 동작은 codex-cases 에서만 잰다.
        if os.path.dirname(case["dir"]) == CASES:
            env["EVAL_PREVUE_PERMITTED"] = "1"
        t0 = time.time()
        timeout = int(case["head"].get("timeout_seconds") or 300)
        try:
            p = subprocess.run(codex_cmd(ws, logdir, case["prompt"], args), env=env, capture_output=True, text=True, timeout=timeout)
            stdout, stderr, rc = p.stdout, p.stderr, p.returncode
        except subprocess.TimeoutExpired as e:
            stdout = (e.stdout or b"").decode() if isinstance(e.stdout, bytes) else (e.stdout or "")
            stderr, rc = "TIMEOUT", -1
        secs = time.time() - t0
        with open(os.path.join(rdir, "%d.jsonl" % i), "w") as f:
            f.write(stdout)
        with open(os.path.join(rdir, "%d.stderr" % i), "w") as f:
            f.write(stderr)
        if os.path.exists(env["EVAL_PREVUE_LOG"]):
            shutil.copy(env["EVAL_PREVUE_LOG"], os.path.join(rdir, "%d.prevue.log" % i))
        trace = parse(stdout)
        # 가짜 CLI 의 호출 기록(샌드박스 안에서 불렸으면 [sandbox])과 평가용 Codex 설정 사본 — 채점기가 target 으로 읽는다
        for key, name in (("prevue_log", "prevue.log"), ("codex_config", "codex-config.toml")):
            try:
                with open(os.path.join(logdir, name), encoding="utf-8") as f:
                    trace[key] = f.read()
            except OSError:
                trace[key] = ""
        if not trace["events"] and rc != 0:   # codex 가 뜨지도 못했다 — 채점 실패가 아니라 하네스 오류다
            raise RuntimeError("codex exec 실패(rc=%s): %s" % (rc, (stderr.strip().splitlines() or ["?"])[0][:200]))
        trace.update({"seconds": round(secs, 1), "rc": rc, "workspace": ws})
        results = [grade(g, trace, case, args) for g in case["graders"]]
        return {"case": case["name"], "run": i, "trace": trace, "grades": results,
                "pass": all(r["pass"] for r in results)}
    finally:
        shutil.rmtree(logdir, ignore_errors=True)
        if not args.keep:
            shutil.rmtree(ws, ignore_errors=True)


# ── 트레이스 ──────────────────────────────────────────────────────────────────

SKILL_READ = re.compile(r"/skills/([\w-]+)/SKILL\.md")


def parse(jsonl):
    """codex exec --json 의 이벤트를 채점이 읽는 순서 있는 행동 목록으로 줄인다."""
    events, usage, last, errors = [], {}, "", []
    for line in jsonl.splitlines():
        try:
            e = json.loads(line)
        except ValueError:
            continue
        t = e.get("type", "")
        if t == "turn.completed":
            for k, v in (e.get("usage") or {}).items():
                usage[k] = usage.get(k, 0) + (v or 0)
        if t in ("error", "turn.failed"):
            errors.append(json.dumps(e, ensure_ascii=False)[:300])
        if t != "item.completed":
            continue
        it = e.get("item") or {}
        kind = it.get("type")
        if kind == "command_execution":
            cmd = it.get("command", "")
            events.append({"tool": "Bash", "input": cmd, "exit": it.get("exit_code"), "output": it.get("aggregated_output") or ""})
            for s in SKILL_READ.findall(cmd):
                events.append({"tool": "Skill", "input": '{"skill": "prevue:%s"}' % s if s.startswith("prevue") else '{"skill": "%s"}' % s})
        elif kind == "file_change":
            events.append({"tool": "Edit", "input": json.dumps(it.get("changes", []), ensure_ascii=False)})
        elif kind == "agent_message":
            last = it.get("text", "")
            events.append({"tool": "message", "input": last})
        elif kind == "mcp_tool_call":
            events.append({"tool": "mcp", "input": json.dumps(it, ensure_ascii=False)[:500]})
    return {"events": events, "last_message": last, "usage": usage, "errors": errors}


# ── 채점 ─────────────────────────────────────────────────────────────────────

def _hits(trace, tool, match):
    rx = re.compile(match) if match else None
    return [k for k, e in enumerate(trace["events"]) if e["tool"] == tool and (rx is None or rx.search(e["input"]))]


def _applies(g, trace):
    """when · unless: { target: <trace 키>, pattern: <정규식> } — 그 갈래에서만 매기는 채점기(예: 자동 리뷰가 설정 쓰기를 거부한 회차)."""
    for key, want in (("when", True), ("unless", False)):
        c = g.get(key)
        if isinstance(c, dict) and bool(re.search(str(c.get("pattern", "")), trace.get(c.get("target", "last_message"), "") or "", re.M)) != want:
            return False
    return True


def grade(g, trace, case, args):
    if not _applies(g, trace):
        return {"grader": g["name"], "pass": True, "why": "해당 없음(when/unless)"}
    t = g.get("type")
    if t == "tool_used":
        n = len(_hits(trace, g.get("tool"), g.get("input_match")))
        lo, hi = g.get("min", 1), g.get("max")
        ok = n >= lo and (hi is None or n <= hi)
        return {"grader": g["name"], "pass": ok, "why": "%d회" % n}
    if t == "tool_order":
        b, a = g.get("before") or {}, g.get("after") or {}
        hb, ha = _hits(trace, b.get("tool"), b.get("input_match")), _hits(trace, a.get("tool"), a.get("input_match"))
        ok = bool(hb) and bool(ha) and min(hb) < max(ha)
        return {"grader": g["name"], "pass": ok, "why": "before %s · after %s" % (hb[:3], ha[:3])}
    if t == "regex":
        # match: contains(기본) · not_contains · count:N — claude plugin eval 과 같은 이름
        # target: last_message(기본) · events · prevue_log(가짜 CLI 호출 기록) · codex_config(평가용 Codex 설정 사본, 실행 뒤)
        target = g.get("target", "last_message")
        text = trace.get(target, "") if target in ("last_message", "prevue_log", "codex_config") else json.dumps(trace["events"], ensure_ascii=False)
        found = re.findall(g.get("pattern", ""), text, re.M)   # ^ · $ 는 줄 단위(호출 기록 · 설정 파일)
        how = str(g.get("match", "contains"))
        if how == "not_contains":
            ok = not found
        elif how.startswith("count:"):
            ok = len(found) == int(how.split(":", 1)[1])
        else:
            ok = bool(found)
        return {"grader": g["name"], "pass": ok, "why": "%s %d건" % (how, len(found))}
    if t == "llm":
        return judge(g, trace, args)
    return {"grader": g["name"], "pass": False, "why": "모르는 채점기 %s" % t}


def judge(g, trace, args):
    """llm 채점기. 같은 모델에게 트레이스를 주고 PASS/FAIL 을 받는다(Codex 한 번 — 도구 없이 읽기만)."""
    lines = []
    for e in trace["events"]:
        if e["tool"] == "Skill":
            continue
        lines.append("[%s] %s" % ("assistant" if e["tool"] == "message" else e["tool"], e["input"][:1500]))
        # 명령의 출력도 준다 — 없으면 "응답의 ask 를 그대로 물었나"를 판정자가 ask 를 모른 채 짐작한다(choose-app 오판정)
        if e.get("output") and "/SKILL.md" not in e["input"]:
            lines.append("[output] %s" % e["output"][:2000])
    prompt = ("You are grading an AI coding agent's transcript against a rubric. Reply with JSON only.\n\n"
              "## Rubric\n%s\n\n## Transcript (in order; [Bash] = shell command the agent ran, [Edit] = file change, "
              "[assistant] = message to the user; the run ended after the last line — the user never replied)\n%s\n"
              % (g["body"], "\n".join(lines)))
    schema = os.path.join(OUT, "judge.schema.json")
    with open(schema, "w") as f:
        json.dump({"type": "object", "additionalProperties": False, "required": ["pass", "reason"],
                   "properties": {"pass": {"type": "boolean"}, "reason": {"type": "string"}}}, f)
    out = os.path.join(OUT, "judge.%d.%d.json" % (os.getpid(), int(time.time() * 1000)))
    d = tempfile.mkdtemp(prefix="prevue-eval-judge-")
    try:
        subprocess.run([CODEX, "exec", "--ephemeral", "--ignore-user-config", "--disable", "hooks",
                        "--skip-git-repo-check", "-C", d, "-s", "read-only", "-m", args.model,
                        "-c", 'model_reasoning_effort="medium"', "--output-schema", schema, "-o", out, prompt],
                       capture_output=True, text=True, timeout=180)
        with open(out) as f:
            v = json.load(f)
        return {"grader": g["name"], "pass": bool(v.get("pass")), "why": v.get("reason", "")[:200]}
    except Exception as e:  # 판정이 실패하면 실패로 센다 — 통과로 넘기지 않는다
        return {"grader": g["name"], "pass": False, "why": "판정 실패: %s" % e}
    finally:
        shutil.rmtree(d, ignore_errors=True)
        if os.path.exists(out):
            os.remove(out)


# ── 보고 ─────────────────────────────────────────────────────────────────────

def summary(results):
    rows = {}
    for r in results:
        rows.setdefault(r["case"], []).append(r)
    print("\n| 케이스 | 통과 | 시간(중앙) | 명령 | --help | 스킬 읽기 | 입력 토큰(캐시 제외) | 출력 토큰 |")
    print("|---|---|---|---|---|---|---|---|")
    tot = [0, 0]
    for name, rs in rows.items():
        p = sum(1 for r in rs if r["pass"])
        tot[0] += p
        tot[1] += len(rs)
        med = lambda xs: sorted(xs)[len(xs) // 2]
        cmds = [sum(1 for e in r["trace"]["events"] if e["tool"] == "Bash") for r in rs]
        helps = [sum(1 for e in r["trace"]["events"] if e["tool"] == "Bash" and re.search(r"--help|\bhelp\b", e["input"])) for r in rs]
        skills = [sum(1 for e in r["trace"]["events"] if e["tool"] == "Skill") for r in rs]
        u = [r["trace"]["usage"] for r in rs]
        fresh = [x.get("input_tokens", 0) - x.get("cached_input_tokens", 0) for x in u]
        print("| %s | %d/%d | %.0fs | %s | %s | %s | %s | %s |" % (
            name, p, len(rs), med([r["trace"]["seconds"] for r in rs]), med(cmds), med(helps), med(skills),
            med(fresh), med([x.get("output_tokens", 0) for x in u])))
        for r in rs:
            for g in r["grades"]:
                if not g["pass"]:
                    print("|  ↳ %d회차 %s | 실패 | %s |||||| " % (r["run"], g["grader"], g["why"].replace("|", "/")))
    print("\n합계 %d/%d" % tuple(tot))


def config_traces(path):
    """사용자 Codex 설정에 남은 평가 흔적 수. 평가가 사용자 설정을 건드리지 않는지 실행 앞뒤로 견준다."""
    try:
        with open(path, encoding="utf-8") as f:
            return f.read().count("prevue-eval-")
    except OSError:
        return 0


def main(argv):
    ap = argparse.ArgumentParser(description="Codex 스킬 평가")
    ap.add_argument("--case", action="append", help="케이스 이름(여러 번). 없으면 전부")
    ap.add_argument("--runs", type=int, default=3)
    ap.add_argument("--jobs", type=int, default=3)
    ap.add_argument("--model", default=os.environ.get("PREVUE_EVAL_CODEX_MODEL", "gpt-6-sol"))
    ap.add_argument("--effort", default=os.environ.get("PREVUE_EVAL_CODEX_EFFORT", "high"))
    ap.add_argument("--keep", action="store_true", help="작업 디렉터리를 지우지 않는다(디버깅)")
    ap.add_argument("--regrade", metavar="REPORT", help="모델을 다시 부르지 않고 저장된 report.json 의 트레이스를 지금 채점기로 다시 채점한다(llm 채점은 그대로 둔다)")
    ap.add_argument("--clean", action="store_true", help="Codex 캐시에 둔 평가용 플러그인(plugins/cache/prevue-eval)을 지우고 끝낸다")
    ap.add_argument("--skills-from", metavar="CHECKOUT", default=ROOT,
                    help="스킬(codex/) · 도움말(bin/help)을 이 체크아웃에서 가져온다 — 다른 판과 견줄 때. 가짜 CLI · 케이스는 이 체크아웃 것."
                         " 설치 자리(Codex 캐시)가 하나라 두 판은 차례로 돌린다")
    args = ap.parse_args(argv)
    if args.clean:
        shutil.rmtree(os.path.join(CODEX_HOME, "plugins", "cache", "prevue-eval"), ignore_errors=True)
        print("지웠다: %s" % os.path.join(CODEX_HOME, "plugins", "cache", "prevue-eval"))
        return 0
    if args.regrade:
        with open(args.regrade) as f:
            results = json.load(f)
        cases = {}
        for r in results:
            c = cases.setdefault(r["case"], load_case(r["case"]))
            old = {g["grader"]: g for g in r["grades"]}
            r["grades"] = [old.get(g["name"], {"grader": g["name"], "pass": False, "why": "llm — 다시 돌려야 한다"})
                           if g.get("type") == "llm" else grade(g, r["trace"], c, args) for g in c["graders"]]
            r["pass"] = all(g["pass"] for g in r["grades"])
        summary(results)
        return 0 if all(r["pass"] for r in results) else 1
    names = args.case or case_names()
    cases = [load_case(n) for n in names]
    os.makedirs(OUT, exist_ok=True)
    for n in names:   # 지난 실행의 트레이스가 이번 보고에 섞이지 않게
        shutil.rmtree(os.path.join(OUT, "runs", n), ignore_errors=True)
    assemble(os.path.abspath(args.skills_from))
    config = os.path.join(CODEX_HOME, "config.toml")
    traces_before = config_traces(config)
    jobs = [(c, i) for c in cases for i in range(1, args.runs + 1)]
    results = []
    with cf.ThreadPoolExecutor(max_workers=args.jobs) as ex:
        futs = {ex.submit(run_one, c, i, args): (c["name"], i) for c, i in jobs}
        for fu in cf.as_completed(futs):
            name, i = futs[fu]
            try:
                r = fu.result()
            except Exception as e:
                r = {"case": name, "run": i, "pass": False, "grades": [{"grader": "harness", "pass": False, "why": str(e)}],
                     "trace": {"events": [], "seconds": 0, "usage": {}, "last_message": "", "errors": [str(e)]}}
            results.append(r)
            print("%s #%d %s %.0fs %s" % (name, i, "PASS" if r["pass"] else "FAIL", r["trace"]["seconds"],
                                         " ".join("%s=%s" % (g["grader"], "ok" if g["pass"] else "X") for g in r["grades"])),
                  flush=True)
    results.sort(key=lambda r: (r["case"], r["run"]))
    with open(os.path.join(OUT, "report.json"), "w") as f:
        json.dump(results, f, ensure_ascii=False, indent=1)
    summary(results)
    if config_traces(config) > traces_before:
        print("\n경고: 사용자 Codex 설정(%s)에 평가 작업 디렉터리(prevue-eval-…) 항목이 새로 생겼다 — 지워야 한다" % config)
    return 0 if all(r["pass"] for r in results) else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
