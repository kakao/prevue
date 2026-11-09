// 가리키기 카드(D-162)의 내용을 짓는다 — 고를 수 있는 노드 목록 · 가리킨 노드 · Preview 색인에서. DOM 도 데몬도 모르는 순수 함수라 스토리와 함께 쓴다.
import type { CardBox, CardModifier, CardOrigin, CardPreview, CardRow, CardTree, PointNode } from './view';

/** 고를 수 있는 노드 하나 — id 는 트리 순서, ups 는 조상 노드의 id(가까운 것이 뒤), mods 는 그 자리의 첫 레이아웃이 가진 modifier 체인. */
export type TreeHit = PointNode & { id: number; ups: number[]; mods: CardModifier[] | null };

const rowOf = (n: TreeHit): CardRow => ({ id: String(n.id), name: n.name || `${n.fileName}:${n.lineNumber}` });

/**
 * 트리 칸 — 목록(그림에서 고를 수 있는 노드) 안에서만 잇는다. 목록에서 빠진 조상(Compose 내부 · 크기 없는 노드)은 건너뛰어
 * 가장 가까운 목록 안의 조상이 부모다. 형제 · 자식은 트리 순서다.
 */
export function treeOf(list: TreeHit[], here: TreeHit): CardTree {
  const byId = new Map(list.map(n => [n.id, n]));
  const parentOf = (n: TreeHit) => { for (let i = n.ups.length - 1; i >= 0; i--) if (byId.has(n.ups[i])) return n.ups[i]; return null; };
  const parent = parentOf(here);
  const level = list.filter(n => parentOf(n) === parent).sort((a, b) => a.id - b.id);
  return {
    ups: here.ups.filter(id => byId.has(id)).map(id => rowOf(byId.get(id)!)),
    here: rowOf(here),
    before: level.filter(n => n.id < here.id).map(rowOf),
    after: level.filter(n => n.id > here.id).map(rowOf),
    downs: list.filter(n => parentOf(n) === here.id).sort((a, b) => a.id - b.id).map(rowOf),
  };
}

/** 크기 — 밀도(그림 px 당 dp)를 알면 dp, 모르면 그린 그림의 px 이다. 여백은 체인의 padding 이 말한다. */
export function boxOf(n: TreeHit, dpPerPx: number | null): CardBox {
  const [l, t, r, b] = n.bounds, k = dpPerPx ?? 1;
  return { width: (r - l) * k, height: (b - t) * k, unit: dpPerPx ? 'dp' : 'px', padded: !!n.mods?.some(m => m.name === 'padding') };
}

/** `/preview-files.json` 의 Preview 본문 호출과 정의 색인(PR 127) — 이름으로 찾는다. */
export type PreviewFiles = {
  ready?: boolean;
  files?: Array<{ path: string; rel: string; previews?: Array<{ fn: string; calls: string[] }> }>;
  composables?: Array<{ name: string; module: string }>;
};
export type PreviewIndex = { modules: Map<string, string>; callers: Map<string, CardPreview[]> };

export function indexOf(d: PreviewFiles): PreviewIndex {
  const modules = new Map((d.composables || []).map(c => [c.name, c.module]));
  const callers = new Map<string, CardPreview[]>();
  for (const f of d.files || []) for (const p of f.previews || []) for (const name of new Set(p.calls)) {
    const list = callers.get(name) ?? [];
    list.push({ file: f.path, rel: f.rel, fn: p.fn });
    callers.set(name, list);
  }
  return { modules, callers };
}

/** 출처 칩 — 이름이 프로젝트에 정의돼 있으면 그 모듈, 아니면 Compose 기본. 같은 이름의 컴포저블은 가리지 못한다. */
export function originOf(name: string | null | undefined, index: PreviewIndex | null): CardOrigin {
  if (!index || !name) return null;
  const module = index.modules.get(name);
  return module ? { module } : 'compose';
}

/** 가리킨 노드를 본문에서 직접 부르는 Preview — 지금 보는 Preview(seen)는 도착지가 아니라 뺀다. */
export function previewsOf(name: string | null | undefined, index: PreviewIndex | null, seen: { file: string | null; fn: string | null }): CardPreview[] {
  if (!index || !name) return [];
  return (index.callers.get(name) || []).filter(p => !(p.file === seen.file && p.fn === seen.fn));
}
