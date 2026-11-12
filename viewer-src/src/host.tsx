import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

// 혼합 기간의 자리 — index.html 이 영역의 바깥 요소만 두고(기존 모듈이 처음부터 그 요소를 쥔다), 안은 React 가 그린다.
// 바깥 요소가 없으면(Storybook) 컴포넌트가 같은 바깥 요소를 스스로 그린다. 바깥 요소의 속성은 어느 쪽이든 효과에서 맞춘다.
export function useHost<T extends HTMLElement>(given?: T | null) {
  const [own, setOwn] = useState<T | null>(null);
  const element = given ?? own;
  const place = (body: ReactNode, shell: (ref: (node: T | null) => void, body: ReactNode) => ReactNode) =>
    given ? createPortal(body, given) : shell(setOwn, body);
  return { element, place };
}

// 외부: React 는 그린 요소에 내부 키(__reactFiber$… · __reactProps$…)를 열거되는 속성으로 단다. 브라우저 검사(CDP)가
// 그 요소를 값으로 돌려받으면 파이버 사슬을 따라가다 "Object reference chain is too long"으로 실패한다. 값은 그대로 두고 열거만 끈다.
export function hideReactKeys(element: Element) {
  for (const key of Object.keys(element)) if (key.startsWith('__react')) Object.defineProperty(element, key, { enumerable: false });
}
