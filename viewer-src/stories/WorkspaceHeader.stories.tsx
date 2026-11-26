import type { Meta, StoryObj } from '@storybook/react-vite';
import '../static/style.css';
import { WorkspaceHeader } from '../src/components/Workspace';
import { focusExample } from './workspace';

const meta = { title: '작업공간/WorkspaceHeader' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
const Bar = ({ state }: { state: typeof focusExample }) => <header className="bar" id="bar"><div className="bar-row">
  <div className="bar-l"><WorkspaceHeader state={state} /></div><div className="bar-r" id="barR" />
</div></header>;
export const Focus: Story = { render: () => <Bar state={focusExample} /> };
