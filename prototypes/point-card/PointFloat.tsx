// 가리키기 카드의 자리와 그림 위 표시 — 프로토타입(D-162). 연결할 때 보드 · 한 장 보기의 drawBox 자리를 이것으로 바꾼다(다음 작업).
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

export type Rect = { left: number; top: number; width: number; height: number };
/** 카드가 선 자리와 그때의 겉 높이 — 다음 자리를 정할 때 "지금 보이는 카드"의 범위가 된다. */
export type Spot = { left: number; top: number; height: number };
/** 간격은 tokens.css 에서 읽는다 — gap 그림과 카드 사이, edge 무대 가장자리와 카드 사이. */
export type Spacing = { gap: number; edge: number };

/** 새 박스 위쪽이 지금 카드의 [위 − edge, 아래 − 48] 안이면 카드를 둔다 — 형제 · 가까운 자식을 오갈 때 출렁이지 않게. 48 은 박스가 카드 끝에 걸쳐 보이지 않게 남기는 몫이다. */
const HOLD_BELOW = 48;

/**
 * 카드 자리 — x 는 가리킨 그림 밖 오른쪽에 고정하고(무대가 모자라면 왼쪽), y 는 가리킨 박스의 위쪽을 따르며 무대 안으로 당긴다.
 * 이웃 그림 위에 서는 것은 허용한다. 좌표는 모두 무대 기준이다. 머무를지는 지금 보이는 카드(prev)의 높이로 가린다.
 */
export function placeCard({ stage, shot, box, card, prev, space }: { stage: { width: number; height: number }; shot: Rect; box: Rect; card: { width: number; height: number }; prev: Spot | null; space: Spacing }): Spot {
  const right = shot.left + shot.width + space.gap;
  const left = right + card.width <= stage.width - space.edge ? right : Math.max(space.edge, shot.left - space.gap - card.width);
  const clamp = (top: number) => Math.max(space.edge, Math.min(top, stage.height - card.height - space.edge));
  const hold = prev && box.top >= prev.top - space.edge && box.top <= prev.top + prev.height - HOLD_BELOW;
  return { left, top: clamp(hold ? prev.top : box.top), height: card.height };
}

const px = (el: Element, name: string) => parseFloat(getComputedStyle(el).getPropertyValue(name)) || 0;

/**
 * 떠 있는 카드 — 자리(y)와 높이를 같은 곡선(--easing-spring, 600ms)으로 한 덩어리처럼 옮긴다. 무대는 이 요소의 offsetParent 이고 크기를 지켜본다.
 * 높이를 옮기려고 카드 몸통(.pc-body)을 재어 --h 로 준다. 몸통 안에서 펼침이 움직이는 중이면 끝난 뒤 한 번만 잰다 — 프레임마다 재면 곡선이 매번 다시 시작해 내용을 쫓아간다.
 * 처음 뜰 때는 자리로 바로 서고(data-placed 전에는 전환 없음), 그다음 프레임부터 움직인다.
 */
export function PointCardFloat({ shot, box, children }: { shot: Rect; box: Rect; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0), [stage, setStage] = useState({ width: 0, height: 0 });
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
      if (entries.some(e => e.target === parent)) setStage({ width: parent.clientWidth, height: parent.clientHeight });
      if (entries.some(e => e.target === body)) measure();
    });
    watch.observe(body); watch.observe(parent);
    setStage({ width: parent.clientWidth, height: parent.clientHeight }); setHeight(body.offsetHeight);
    return () => { wait = -1; watch.disconnect(); };
  }, []);
  useLayoutEffect(() => {
    const el = ref.current, card = el?.querySelector<HTMLElement>('.point-card');
    if (!el || !card || !height || !stage.width) return;
    const space = { gap: px(el, '--space-16'), edge: px(el, '--space-8') };
    // 높이는 옮겨 가는 중인 겉이 아니라 다다를 몸통에 카드 안쪽 여백을 더해 잰다.
    const outer = { width: el.offsetWidth, height: height + px(card, 'padding-top') + px(card, 'padding-bottom') };
    setSpot(prev => placeCard({ stage, shot, box, card: outer, prev, space }));
  }, [box.left, box.top, box.width, box.height, height, stage.width, stage.height]); // eslint-disable-line react-hooks/exhaustive-deps
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
