# Prevue 회고 규약

`retro` 스킬이 읽는 이 저장소의 값이다. 형식과 절차는 그 스킬이 갖는다. 세션 규칙(`AGENTS.md`의 "회고" 절)이 이 문서를 회고 규약으로 선언하고, `implement` 6단계가 남기기를 부른다.

- 남기기 노트와 장부는 베이스 체크아웃의 `agentdocs/retro/`에 쌓인다 — git 밖이고(`.gitignore`) 워크트리를 지워도 남는다. Claude Code와 Codex 세션이 같은 폴더를 쓴다.
- 워커는 워크트리 안에서 이 폴더에 쓴다. Claude Code는 샌드박스를 켜지 않은 기본 설정에서는 별도 설정 없이 쓰인다. Codex는 홈 설정(`~/.codex/config.toml`)의 `sandbox_workspace_write.writable_roots`에 베이스 체크아웃의 `agentdocs`가 있어야 쓴다.
- 함께 읽을 다른 기록은 없다.

```json retro
{
  "notes": "agentdocs/retro",
  "also": []
}
```
