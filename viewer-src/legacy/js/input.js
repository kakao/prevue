// 인터랙티브 입력(FR-14·15) — 사람의 터치 · 휠을 데몬에 보낸다. 좌표는 그림 px 로 받는다 — 화면에서 그림으로 바꾸는 것은 focus.js 다.
import { post } from "./api.js";
import { phrase } from "./strings.js";
import { flash } from "./capsule.js";

// 순서가 곧 제스처다 — press·drag·release를 하나의 체인으로 직렬화해 네트워크가 순서를 바꾸지 못하게 한다.
let touchChain = Promise.resolve();
async function send(type, x, y) {
  const r = await post("/viewer/touch", { x, y, type });
  if (!r.ok) flash(phrase("input.touch.failed", { status: r.status }));
}
function touch(type, x, y) { touchChain = touchChain.then(() => send(type, x, y)).catch(() => {}); }

// 누름부터 뗌까지. 드래그는 창 전체에서 받아야 한다 — 이미지 밖에서 손을 떼면 릴리즈가 영영 오지 않고
// 데몬은 손가락이 닿은 채로 남아 다음 제스처가 통째로 어긋난다. 창의 이벤트를 그림 px 로 바꿔 넘기는 것은 focus.js 다.
let dragging = null;
export const pressing = () => !!dragging;
export function press(x, y) { dragging = [x, y]; touch("press", x, y); }
export function drag(x, y) {
  if (!dragging) return;
  if (Math.abs(x - dragging[0]) + Math.abs(y - dragging[1]) > 6) { dragging = [x, y]; queueDrag(x, y); }
}
export function release(x, y) {
  if (!dragging) return;
  dragging = null;
  touch("release", x, y);
}

// 드래그 좌표는 체인에 하나만 대기시키고, 그 차례가 오면 그때의 최신 좌표를 보낸다 — 네트워크가 마우스보다 느려도 밀리지 않는다.
// requestAnimationFrame에 기대지 않는다. 탭이 뒤에 있으면 rAF가 멈춰 드래그가 통째로 사라진다.
let latestDrag = null, dragQueued = false;
function queueDrag(x, y) {
  latestDrag = [x, y];
  if (dragQueued) return;
  dragQueued = true;
  touchChain = touchChain.then(() => { dragQueued = false; const p = latestDrag; latestDrag = null; return p ? send("drag", p[0], p[1]) : null; }).catch(() => {});
}

/*
 * 휠(그림 px)을 모은다. 드래그처럼 체인에 하나만 대기시키고 그 차례에 모인 것을 한 번에 보낸다 — 트랙패드는 휠을 초당 백 번 넘게 쏜다.
 * 터치와 같은 체인이라 누름 · 끌기 · 휠의 순서가 뒤집히지 않는다.
 */
let wheelAcc = null;
export function wheel(x, y, dx, dy) {
  if (wheelAcc) { wheelAcc.dx += dx; wheelAcc.dy += dy; wheelAcc.x = x; wheelAcc.y = y; return; }
  wheelAcc = { x, y, dx, dy };
  touchChain = touchChain.then(() => {
    const a = wheelAcc; wheelAcc = null;
    return post("/viewer/wheel", { x: Math.round(a.x), y: Math.round(a.y), dx: a.dx, dy: a.dy });
  }).catch(() => {});
}
