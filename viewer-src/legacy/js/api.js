// 데몬을 아는 유일한 파일. 나머지 모듈은 여기를 지나서만 데몬과 말한다.

export function post(path, body) {
  return fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) });
}

export const get = url => fetch(url);

// 이 페이지의 스트림 이름표 — 같은 페이지가 스트림을 새로 열면 데몬이 이 페이지의 옛 스트림을 닫는다(WebKit 은 옛 연결을 닫지 않는다).
const viewerId = Math.random().toString(36).slice(2, 10);
export const viewerStream = url => `${url}${url.includes("?") ? "&" : "?"}v=${viewerId}`;
// 폭은 같은 이름표로 알린다 — 데몬이 붙은 뷰어 중 가장 큰 폭으로 줄여, 작은 창 하나가 다른 창의 스트림을 흐리게 하지 않는다.
export const reportStreamWidth = width => post("/stream/viewport", { width, viewer: viewerId });

export const fetchProjectFiles = () => fetch("/project-files.json").then(r => r.json());

/** 빠른 열기의 목록(D-56) — 이 데몬이 열 수 있는 프리뷰 파일. 열 때마다 새로 받는다. */
export const fetchPreviewFiles = () => fetch("/preview-files.json").then(r => r.json());

/** 데몬 이벤트(SSE). 상태(state)와 일회성 알림(ui)만 온다(D-42). */
export function connect({ open, state, ui, error }) {
  // 숨겨진 탭의 SSE와 스트림이 연결 한도를 채우면 터치 요청이 대기한다.
  let es = null;
  function visible() {
    if (document.hidden) { es?.close(); es = null; return; }
    if (es) return;
    const next = new EventSource("/events");
    es = next;
    next.onopen = () => { if (es === next) open(); };
    next.onmessage = e => {
      if (es !== next) return;
      const ev = JSON.parse(e.data);
      if (ev.type === "state") state(ev.state);
      else if (ev.type === "ui") ui(ev.event);
    };
    next.onerror = e => { if (es === next) error(e); };
  }
  document.addEventListener("visibilitychange", visible);
  visible();
}
