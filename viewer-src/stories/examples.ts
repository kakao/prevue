import board from '../../plugin/daemon/daemon/src/test/contract/viewer.state.board.json';
import focus from '../../plugin/daemon/daemon/src/test/contract/viewer.state.focus.json';
import tabs from '../../plugin/daemon/daemon/src/test/contract/viewer.state.tabs.json';
import choice from '../../plugin/daemon/daemon/src/test/contract/viewer.state.choice.json';
import type { ViewerState } from '../src/state';

// 화면 스토리의 재료는 계약 예제뿐이다 — 가짜 상태를 손으로 짓지 않는다. screen만 JSON import에서 string으로 넓어진다.
export const exampleNames = ['board', 'focus', 'tabs', 'choice'] as const;
export const examples = [board, focus, tabs, choice].map(({ example }) => ({ ...example, screen: example.screen as ViewerState['screen'] })) satisfies ViewerState[];
export const exampleArgs = {
  args: { example: 0 },
  argTypes: { example: { control: { type: 'select' as const, labels: Object.fromEntries(exampleNames.map((name, i) => [i, name])) }, options: [0, 1, 2, 3] } },
};
