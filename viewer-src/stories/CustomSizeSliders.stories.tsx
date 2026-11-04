import type { Meta, StoryObj } from '@storybook/react-vite';
import { CustomSizeSliders } from '../src/components/WorkspaceShell';
import { WorkspaceBody } from './workspace';

// 커스텀 폭 · 높이 슬라이더. 커스텀일 때만 펼치고, 눈금 위치 · 값 · 방향키는 resize-scene.js 가 잡는다. 여기서는 접힌 껍데기를 펼쳐 보인다.
const meta = { title: '작업공간/CustomSizeSliders' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Shell: Story = { render: () => <WorkspaceBody><aside className="panel"><CustomSizeSliders /></aside></WorkspaceBody>, play: () => { document.getElementById('pnSl')!.hidden = false; } };
