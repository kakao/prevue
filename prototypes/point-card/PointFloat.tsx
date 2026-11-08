// 가리키기 카드의 자리와 그림 위 표시 — 프로토타입(D-162). 연결할 때 보드 · 한 장 보기의 drawBox 자리를 이것으로 바꾼다(다음 작업).
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

export type Rect = { left: number; top: number; width: number; height: number };
export type Spot = { left: number; top: number };

/** 그림과 카드 사이 · 무대 가장자리와 카드 사이 · 카드 안쪽 여백(px). tokens.css 의 --space-16 · --space-8 · --space-8 과 같은 값이다. */
const GAP = 16, EDGE = 8, PAD = 8;
/** 새 박스 위쪽이 지금 카드의 [위 − 8, 아래 − 48] 안이면 카드를 두고 — 형제 · 가까운 자식을 오갈 때 출렁이지 않게. 아래쪽 48 은 박스가 카드 끝에 걸쳐 보이지 않게 남기는 몫이다. */
const HOLD_ABOVE = 8, HOLD_BELOW = 48;

/**
 * 카드 자리 — x 는 가리킨 그림 밖 오른쪽에 고정하고(무대가 모자라면 왼쪽), y 는 가리킨 박스의 위쪽을 따르며 무대 안으로 당긴다.
 * 이웃 그림 위에 서는 것은 허용한다. 좌표는 모두 무대 기준이다.
 */
export function placeCard({ stage, shot, box, card, prev }: { stage: { width: number; height: number }; shot: Rect; box: Rect; card: { width: number; height: number }; prev: Spot | null }): Spot {
  const right = shot.left + shot.width + GAP;
  const left = right + card.width <= stage.width - EDGE ? right : Math.max(EDGE, shot.left - GAP - card.width);
  const clamp = (top: number) => Math.max(EDGE, Math.min(top, stage.height - card.height - EDGE));
  const hold = prev && box.top >= prev.top - HOLD_ABOVE && box.top <= prev.top + card.height - HOLD_BELOW;
  return { left, top: clamp(hold ? prev.top : box.top) };
}

/**
 * 떠 있는 카드 — 자리(y)와 높이를 같은 곡선(--easing-spring, 600ms)으로 한 덩어리처럼 옮긴다.
 * 높이를 옮기려고 카드 몸통(.pc-body)을 재어 --h 로 준다. 처음 뜰 때는 자리로 바로 서고(data-placed 전에는 전환 없음), 그다음 프레임부터 움직인다.
 */
export function PointCardFloat({ stage, shot, box, children }: { stage: { width: number; height: number }; shot: Rect; box: Rect; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0), [spot, setSpot] = useState<Spot | null>(null), [placed, setPlaced] = useState(false);
  useLayoutEffect(() => {
    const body = ref.current?.querySelector<HTMLElement>('.pc-body');
    if (!body) return;
    const measure = () => setHeight(body.offsetHeight);
    const watch = new ResizeObserver(measure);
    watch.observe(body); measure();
    return () => watch.disconnect();
  }, []);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !height) return;
    // 높이는 옮겨 가는 중인 겉이 아니라 다다를 몸통으로 잰다.
    const card = { width: el.offsetWidth, height: height + PAD * 2 };
    setSpot(prev => placeCard({ stage, shot, box, card, prev }));
  }, [box.left, box.top, box.width, box.height, height, stage.width, stage.height]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    if (!spot || placed) return;
    const frame = requestAnimationFrame(() => setPlaced(true));
    return () => cancelAnimationFrame(frame);
  }, [spot, placed]);
  const style: CSSProperties & { '--h'?: string } = { ...(spot ?? { left: 0, top: 0, visibility: 'hidden' }), '--h': height ? `${height}px` : undefined };
  return <div ref={ref} className="pc-float" style={style} data-placed={placed || undefined}>{children}</div>;
}

/**
 * 그림 위 표시 — 마우스가 그림 위에 있으면(over) 모든 노드의 구조 테두리가 페이드로 나타나고, 손 아래 노드(hover)는 반투명 바탕 하나가
 * 자리와 크기를 미끄러지듯 옮기며 따라온다. 고른 노드(pick)는 더 진한 바탕에 2px 테두리다. 표시를 붙였다 떼면 깜빡여서, 늘 그려 두고 투명도 · 자리만 옮긴다.
 */
export function PointMarks({ nodes, hover, pick, over }: { nodes: Array<{ id: string; rect: Rect }>; hover: Rect | null; pick: { id: string; rect: Rect } | null; over: boolean }) {
  const last = useRef<Rect | null>(null);
  if (hover) last.current = hover;
  const at = hover ?? last.current;
  return <div className={`pc-marks${over ? ' over' : ''}`} aria-hidden="true">
    <div className="pc-outlines">{nodes.map(n => <div key={n.id} className="pc-outline" style={n.rect} />)}</div>
    {at && <div className={`pc-mark hover${hover ? ' on' : ''}`} style={at} />}
    {pick && <div key={pick.id} className="pc-mark pick" style={pick.rect} />}
  </div>;
}
