import type { Meta, StoryObj } from '@storybook/react-vite';
import { SizePicker } from '../src/components/WorkspaceShell';
import { WorkspaceBody } from './workspace';

// 원래 크기 · 프리셋 · 커스텀 · 기기. 기기 칸의 이름 · 윤곽 · dp 는 resize-scene.js 가 기기 표에서 채운다 — 채운 모습은 작업공간/Workspace 의 Device.
const meta = { title: '작업공간/SizePicker' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Shell: Story = { render: () => <WorkspaceBody><aside className="panel"><SizePicker /></aside></WorkspaceBody> };
