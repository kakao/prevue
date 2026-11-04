import type { Meta, StoryObj } from '@storybook/react-vite';
import { DevicePosture } from '../src/components/WorkspaceShell';
import { WorkspaceBody } from './workspace';

// 접는 기기의 접기 · 회전 · 힌지 표시. 가능한 자세만 보이고 이름표는 resize-scene.js 가 자세에 맞춰 바꾼다. 접는 기기가 아니면 숨는다.
const meta = { title: '작업공간/DevicePosture' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Shell: Story = { render: () => <WorkspaceBody><aside className="panel"><DevicePosture /></aside></WorkspaceBody>, play: () => { document.getElementById('devCtl')!.hidden = false; } };
