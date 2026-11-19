<!-- 생성물이다. dev-skills-src/implement/tools/review.md 를 고치고 tools/gen-agents.sh 로 만든다 -->
# 리뷰 맡기기

리뷰 범위를 `<merge-base SHA>..<끝 커밋>`으로 정하고, 분류기로 등급을 골라 그 등급의 리뷰어(`reviewer-medium` · `reviewer-high` · `reviewer-xhigh`)에게 맡긴다. 리뷰어는 `review` 스킬과 리뷰 규약 `dev-skills-src/review.md`로 판정한다. 분류기는 워크트리 루트에서 돌린다.

```sh
test -f ~/.codex/skills/review/scripts/review_tier.py     # 실패하면 review 스킬이 없다 — 건너뛴다
python3 ~/.codex/skills/review/scripts/review_tier.py --range <merge-base SHA>..<끝 커밋> --config dev-skills-src/review.md [--recheck]
```

- **`test -f`가 실패하면** `review` 스킬이 없는 환경이다 — 건너뛰고 "독립 리뷰 없음"을 적는다. **있는데 리뷰어를 띄울 수 없으면 멈춘다** — 자기 diff를 다시 읽는 것으로 대신하지 않는다.
- 출력 첫 줄이 등급이고 나머지가 근거다. `skip`이면 띄우지 않는다 — `<merge-base>..<끝 커밋>` 범위로 돌린 분류기가 `skip`이면 승인 진입 조건의 리뷰는 해당 없음이다. 종료 코드 2면 `high`로 띄우고 stderr를 넘긴다. 수정 확인이면 `--recheck`를 붙인다.
- **수정 확인을 맡기지 않는 수정(아래 "고칠 것")이면 분류기도 돌리지 않는다** — `--recheck`는 문서만 바뀌어도 늘 medium을 낸다. 문서만 바뀐 수정도 반영 여부는 보라는 분류기의 설계를, 이 저장소는 뜻이 바뀌지 않는 수정에 한해 판단으로 바꿨다.

리뷰어 정의는 `~/.codex/agents/reviewer-<등급>.toml`이다.

- 커스텀 에이전트 이름을 지정할 수 있으면 그 리뷰어로 띄운다.
- 일반 협업 도구만 있으면 그 TOML의 `developer_instructions`를 위임 프롬프트 앞에 넣고 `fork_turns: "none"` · `reasoning_effort: <등급>`으로 띄운다.
- 그 effort를 지원하지 않으면 지원되는 가장 높은 effort로 띄우고, 요청 등급과 실제 값을 PR 본문의 "꼭 봐 주세요"에 적는다. 적용 절은 원래 등급의 지시 그대로 둔다.
- **협업 도구 자체가 없으면 멈춘다** — 독립 리뷰를 못 했다고 보고하고, 자기 diff를 다시 읽는 것으로 리뷰를 대신하지 않는다.

리뷰어에게는 리뷰 규약 `dev-skills-src/review.md`와 코딩 표준 `dev-skills-src/coding.md`의 경로, 기준(`origin/develop`과의 merge-base) · 끝 커밋을 SHA로, 분류기의 근거, 계획과 성공 기준, 지금까지의 확인 기록, `check-local.sh` 요약을 넘긴다. 수정을 확인받는 경우라면 직전 리뷰 결과(화면 확인 결함이나 CI 실패 요지면 그것)와 수정 기준 커밋도 넘긴다.

- **고칠 것**: 고치기 전에 지금 상태를 커밋해서 다음 리뷰의 기준점으로 삼는다. 목록에 있는 것만 고친다. 검증 돌리기를 다시 통과시킨다. 수정 확인을 맡길지는 고친 것에 따라 정한다 — 주석 · 공백과 뜻이 바뀌지 않는 표현 · 오타만 고쳤으면 맡기지 않고 기록 파일과 승인 보고에 적는다. 그 밖은 맡긴다. 이 저장소에서는 `*.md`가 곧 동작이라, 한쪽 문 경로이거나 스킬 · 지침 본문의 뜻을 바꾸면 문구 수정이어도 맡긴다.
- **물을 것**: 한 번에 모아서 묻고, 답에 따라 고칠 것에 더한다.
- **머지 위험 줄**과 diff만으로 확정하지 못한 위험은 PR 본문의 "꼭 봐 주세요"에 사람 말로 옮긴다 — 본문에는 "머지 위험"이라는 줄을 따로 두지 않는다.
