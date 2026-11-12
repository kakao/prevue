import type { Meta, StoryObj } from '@storybook/react-vite';
import '../legacy/style.css';
import { WorkspaceLoading } from '../src/components/Workspace';
import { loadingView } from '../src/workspace/view';
import { WithView } from './workspace';

// 첫 장을 기다리는 자리 표시와 받지 못했을 때의 실패 문장. 첫 장 대기는 데몬 상태가 아니라 뷰어가 그림을 디코드하며 정한다.
const meta = { title: '작업공간/WorkspaceLoading' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Waiting: Story = { render: () => <WithView store={loadingView} value={{ on: true, failed: false }}><div className="stage"><WorkspaceLoading /></div></WithView> };
export const Failed: Story = { render: () => <WithView store={loadingView} value={{ on: true, failed: true }}><div className="stage"><WorkspaceLoading /></div></WithView> };
