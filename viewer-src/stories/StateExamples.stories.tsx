import type { Meta, StoryObj } from '@storybook/react-vite';
import board from '../../plugin/daemon/app/src/test/contract/viewer.state.board.json';
import focus from '../../plugin/daemon/app/src/test/contract/viewer.state.focus.json';
import single from '../../plugin/daemon/app/src/test/contract/viewer.state.single.json';
import tabs from '../../plugin/daemon/app/src/test/contract/viewer.state.tabs.json';
import choice from '../../plugin/daemon/app/src/test/contract/viewer.state.choice.json';
import type { ViewerState } from '../src/state';

// screen만 JSON import에서 string으로 넓어진다. 나머지는 생성 계약과 실행 상태 타입을 함께 검사한다.
const examples = [board, focus, single, tabs, choice].map(({ example }) => ({ ...example, screen: example.screen as ViewerState['screen'] })) satisfies ViewerState[];
const meta = { title: '재료/StateExamples', args: { example: 0 }, argTypes: { example: { control: 'select', options: [0, 1, 2, 3, 4], mapping: undefined } } } satisfies Meta<{ example: number }>;
export default meta;
type Story = StoryObj<{ example: number }>;
export const Contract: Story = { render: ({ example }) => <div><h1>{['board', 'focus', 'single', 'tabs', 'choice'][example]}</h1><pre>{JSON.stringify(examples[example], null, 2)}</pre></div> };
