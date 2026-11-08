// 가리키기 카드의 자리와 그림 위 표시 — 프로토타입(D-162). 연결할 때 보드 · 한 장 보기의 drawBox 자리를 이것으로 바꾼다(다음 작업).
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

export type Rect = { left: number; top: number; width: number; height: number };
export type Spot = { left: number; top: number };
/** 간격은 tokens.css 에서 읽는다 — gap 그림과 카드 사이, edge 무대 가장자리와 카드 사이. */
export type Spacing = { gap: number; edge: number };

/**
 * 카드 자리 — 가리킨 그림 밖 오른쪽(무대가 모자라면 왼쪽)에, 위쪽은 그림 위쪽에 맞춰 고정한다. 어느 노드를 가리켜도 카드는 움직이지 않는다.
 * 이웃 그림 위에 서는 것은 허용한다. 좌표는 모두 무대 기준이다.
 */
export function placeCard({ stage, shot, card, space }: { stage: { width: number }; shot: Rect; card: { width: number }; space: Spacing }): Spot {
  const right = shot.left + shot.width + space.gap;
  const left = right + card.width <= stage.width - space.edge ? right : Math.max(space.edge, shot.left - space.gap - card.width);
  return { left, top: shot.top };
}

const px = (el: Element, name: string) => parseFloat(getComputedStyle(el).getPropertyValue(name)) || 0;

/**
 * 떠 있는 카드 — 자리는 그림 위쪽에 고정하고, 내용이 바뀔 때 높이만 감쇠 곡선(--easing-spring, 600ms)으로 옮긴다. 무대는 이 요소의 offsetParent 이고 크기를 지켜본다.
 * 높이를 옮기려고 카드 몸통(.pc-body)을 재어 --h 로 준다. 몸통 안에서 펼침이 움직이는 중이면 끝난 뒤 한 번만 잰다 — 프레임마다 재면 곡선이 매번 다시 시작해 내용을 쫓아간다.
 * 처음 뜰 때는 자리로 바로 서고(data-placed 전에는 전환 없음), 그다음 프레임부터 움직인다.
 */
export function PointCardFloat({ shot, children }: { shot: Rect; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0), [stageWidth, setStageWidth] = useState(0);
  const [spot, setSpot] = useState<Spot | null>(null), [placed, setPlaced] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current, body = el?.querySelector<HTMLElement>('.pc-body'), parent = el?.offsetParent as HTMLElement | null;
    if (!el || !body || !parent) return;
    let wait = 0;
    const measure = () => {
      // 몸통 높이를 바꾸는 것은 Preview 목록의 펼침(grid-template-rows 전환)뿐이다 — 페이드 · 트리 칸 안의 움직임은 기다리지 않는다.
      const moving = body.getAnimations({ subtree: true }).filter(a => a.playState === 'running' && a instanceof CSSTransition && a.transitionProperty === 'grid-template-rows');
      const n = ++wait;
      if (moving.length) { Promise.all(moving.map(a => a.finished.catch(() => {}))).then(() => { if (n === wait) setHeight(body.offsetHeight); }); return; }
      setHeight(body.offsetHeight);
    };
    const watch = new ResizeObserver(entries => {
      if (entries.some(e => e.target === parent)) setStageWidth(parent.clientWidth);
      if (entries.some(e => e.target === body)) measure();
    });
    watch.observe(body); watch.observe(parent);
    setStageWidth(parent.clientWidth); setHeight(body.offsetHeight);
    return () => { wait = -1; watch.disconnect(); };
  }, []);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !stageWidth) return;
    setSpot(placeCard({ stage: { width: stageWidth }, shot, card: { width: el.offsetWidth }, space: { gap: px(el, '--space-16'), edge: px(el, '--space-8') } }));
  }, [shot.left, shot.top, shot.width, shot.height, stageWidth]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    if (!spot || placed) return;
    const frame = requestAnimationFrame(() => setPlaced(true));
    return () => cancelAnimationFrame(frame);
  }, [spot, placed]);
  const at = spot ? { left: spot.left, top: spot.top } : { left: 0, top: 0, visibility: 'hidden' as const };
  const style: CSSProperties & { '--h'?: string } = { ...at, '--h': height ? `${height}px` : undefined };
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
