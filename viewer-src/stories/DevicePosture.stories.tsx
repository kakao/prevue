import type { Meta, StoryObj } from '@storybook/react-vite';
import { DevicePosture } from '../src/components/WorkspaceShell';
import { WorkspaceBody } from './workspace';

// 접는 기기의 돌리기 · 접기 · 힌지 표시 — 조작 독 가운데의 글자 붙은 버튼(D-167). 가능한 자세만 보이고 이름은 resize-scene.js 가 자세에 맞춰 바꾼다. 기기가 아니면 숨는다.
const meta = { title: '작업공간/DevicePosture' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Shell: Story = { render: () => <WorkspaceBody><div className="panel story-dock"><DevicePosture /></div></WorkspaceBody>, play: () => { document.getElementById('devCtl')!.hidden = false; } };
