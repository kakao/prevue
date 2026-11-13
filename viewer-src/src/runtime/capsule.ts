// 아래에 떠 있는 캡슐의 내용 — 오류 · 잠깐의 알림 · 처음 한 번 안내. 그리는 것은 React 의 NotificationCapsule 이다.
// 보드 · 한 장 · 빠른 열기 · 가리키기가 모두 여기로 알리므로 DOM 없는 저장소로 둔다. 가리킨 결과는 그림 밖 카드가 말한다(D-162).
export type CapsuleContent = { error: string; log: string; once: { key: string; text: string } | null };
let content: CapsuleContent = { error: "", log: "", once: null };
let summary = "", flashTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function set(next: Partial<CapsuleContent>) {
  if ((Object.keys(next) as (keyof CapsuleContent)[]).every(key => content[key] === next[key])) return;
  content = { ...content, ...next };
  for (const listener of listeners) listener();
}

export const capsuleContent = () => content;
export function subscribeCapsule(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// 처음 한 번 안내 — 닫기(×)를 눌러야 걷히고, 걷은 것은 브라우저에 남겨 다시 띄우지 않는다.
// 저장소를 못 쓰면(사생활 보호 창) 이 화면에서만 기억한다 — 열 때마다 다시 뜨는 것보다 낫다.
const dismissed = new Set<string>();
// 상태가 올 때마다 불리므로 저장소에서 한 번 읽은 것은 메모리에 둔다.
const seen = (key: string) => {
  if (dismissed.has(key)) return true;
  try { if (localStorage.getItem(key)) { dismissed.add(key); return true; } } catch { /* 못 읽으면 아직 안 본 것이다 */ }
  return false;
};
/** 글은 닫기 전에만 만든다(text 는 함수). 같은 글이 떠 있으면 그대로 둔다. */
export function showOnce(key: string, text: () => string) {
  if (seen(key)) return;
  const t = text();
  if (content.once && content.once.key === key && content.once.text === t) return;
  set({ once: { key, text: t } });
}
/** 안내가 말하던 것에서 벗어나면 걷는다 — 닫은 것으로 치지 않아 다시 돌아오면 또 뜬다. */
export function hideOnce(key: string) {
  if (!content.once || content.once.key !== key) return;
  set({ once: null });
}
export function dismissOnce() {
  if (!content.once) return;
  dismissed.add(content.once.key);
  try { localStorage.setItem(content.once.key, "1"); } catch { /* 이 화면에서만 기억한다 */ }
  set({ once: null });
}
/** 오류만 남긴다 — 렌더 실패·트리 실패·데몬 끊김은 조용히 사라지면 안 되는 것들이다. */
export function setStatus(msg: string, kind?: "error") {
  set({ error: kind === "error" ? msg : "" });
}
export function flash(msg: string) {
  clearTimeout(flashTimer);
  set({ log: msg });
  flashTimer = setTimeout(() => set({ log: summary }), 2500);
}
/** 알림이 사라진 뒤에도 남는 한 줄(소스 색인 없음 같은 것). */
export function setSummary(t: string) { summary = t; set({ log: t }); }

/** state.error 를 맞춘다. 오류가 걷히면 지운다. */
export function renderError(error: string) {
  if (error) setStatus(error, "error"); else if (content.error) setStatus("");
}
