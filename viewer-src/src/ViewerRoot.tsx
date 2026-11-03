import { useLayoutEffect } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import type { ViewerState } from './state';

export function ViewerRoot({ state, renderLegacy }: {
  state: ViewerState;
  renderLegacy: (state: ViewerState) => void;
}) {
  // 기존 영역은 기존 JS만 쓴다. 다음 이전 단계부터 React가 맡은 영역을 여기에 조립한다.
  useLayoutEffect(() => renderLegacy(state));
  return null;
}

export function createViewerRoot(renderLegacy: (state: ViewerState) => void) {
  const host = document.createElement('div');
  host.hidden = true;
  document.body.append(host);
  const root = createRoot(host);
  return {
    apply(state: ViewerState) {
      // View Transition의 새 화면 스냅숏 전에 기존 영역도 함께 커밋한다.
      flushSync(() => root.render(<ViewerRoot state={state} renderLegacy={renderLegacy} />));
    },
    dispose() { root.unmount(); host.remove(); },
  };
}
