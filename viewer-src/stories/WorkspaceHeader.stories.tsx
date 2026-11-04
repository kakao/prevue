import type { Meta, StoryObj } from '@storybook/react-vite';
import '../legacy/style.css';
import { WorkspaceHeader } from '../src/components/Workspace';
import { focusExample, singleExample } from './workspace';

// 헤더가 내비게이션 바가 된다(W2). 보드에서 들어왔으면 뒤로 버튼이 그 파일(탭 이름)을 갖고, 단건이면 보기 | 조작이 그 자리다(W8).
const meta = { title: '작업공간/WorkspaceHeader' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
const Bar = ({ state }: { state: typeof focusExample }) => <header className="bar" id="bar"><div className="bar-row">
  <div className="bar-l"><WorkspaceHeader state={state} /></div><div className="bar-r" id="barR" />
</div></header>;
export const FromBoard: Story = { render: () => <Bar state={focusExample} /> };
export const Single: Story = { render: () => <Bar state={singleExample} /> };
