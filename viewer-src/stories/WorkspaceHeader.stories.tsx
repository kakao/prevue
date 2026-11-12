import type { Meta, StoryObj } from '@storybook/react-vite';
import '../legacy/style.css';
import { WorkspaceHeader } from '../src/components/Workspace';
import { focusExample } from './workspace';

// 헤더가 내비게이션 바가 된다(W2). 한 장은 늘 보드 위라 뒤로 버튼이 그 파일(탭 이름)을 갖는다(D-155).
const meta = { title: '작업공간/WorkspaceHeader' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
const Bar = ({ state }: { state: typeof focusExample }) => <header className="bar" id="bar"><div className="bar-row">
  <div className="bar-l"><WorkspaceHeader state={state} /></div><div className="bar-r" id="barR" />
</div></header>;
export const Focus: Story = { render: () => <Bar state={focusExample} /> };
