import { useState } from 'react';
import { FileSearch } from '../src/components/QuickOpen';
import type { PreviewFile } from '../src/match';

// 데몬 없이 상자를 돌린다 — 치고 고르는 것은 그대로 되고, 고른 파일을 여는 것만 없다. 검색어는 입력에 넣어 두고 시작할 수 있다.
export function Search({ files, ready, recent = [], query: initial = '' }: { files: PreviewFile[] | null; ready: boolean; recent?: string[]; query?: string }) {
  const [query, setQuery] = useState(initial), [sel, setSel] = useState(initial ? 0 : -1);
  return <FileSearch files={files} ready={ready} query={query} sel={sel} recent={recent}
    fieldRef={el => { if (el && initial && !el.dataset.seeded) { el.value = initial; el.dataset.seeded = '1'; } }}
    onQuery={(q, s) => { setQuery(q); setSel(s); }} onSelect={setSel} />;
}
