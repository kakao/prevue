// 모듈들이 함께 읽는 것 — 데몬이 보낸 마지막 상태와 소스 색인뿐이다. 화면 상태는 여기 두지 않는다(D-41).
export const $ = id => document.getElementById(id);

export const store = {
  st: null,                     // 마지막으로 받은 ViewerState — version 이 낮은 것은 버린다
  // 베이스네임 → 저장소 상대 경로들(FR-20). 트리에서 프레임워크 노드를 거르는 데(narrow)만 쓴다 — 풀패스는 데몬이 붙인다.
  projectFiles: new Map(),
};

export function cardOf(i) {
  for (const g of store.st.board.groups) for (const c of g.cards) if (c.index === i) return c;
  return null;
}
