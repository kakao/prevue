import type { Meta, StoryObj } from '@storybook/react-vite';
import '../static/style.css';
import { WorkspaceLoading } from '../src/components/Workspace';
import { loadingView } from '../src/workspace/view';
import { WithView } from './workspace';

const meta = { title: '작업공간/WorkspaceLoading' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Waiting: Story = { render: () => <WithView store={loadingView} value={{ on: true, failed: false }}><div className="stage"><WorkspaceLoading /></div></WithView> };
export const Failed: Story = { render: () => <WithView store={loadingView} value={{ on: true, failed: true }}><div className="stage"><WorkspaceLoading /></div></WithView> };
