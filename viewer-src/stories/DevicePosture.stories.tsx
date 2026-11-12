import type { Meta, StoryObj } from '@storybook/react-vite';
import { DevicePosture } from '../src/components/WorkspaceShell';
import { WorkspaceBody } from './workspace';

// 접는 기기의 돌리기 · 접기 · 힌지 표시 — 조작 독 가운데의 아이콘 버튼(D-167). 그림이 상태를 보이고, 가능한 자세만 보이며 이름(툴팁 · aria-label)은 resize-scene.js 가 자세에 맞춰 바꾼다. 기기가 아니면 숨는다.
const meta = { title: '작업공간/DevicePosture' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Shell: Story = { render: () => <WorkspaceBody><div className="panel story-dock"><DevicePosture /></div></WorkspaceBody>, play: () => { document.getElementById('devCtl')!.hidden = false; } };
export const Folded: Story = { render: Shell.render, play: () => {
  document.getElementById('devCtl')!.hidden = false;
  document.getElementById('dcRot')!.dataset.orientation = 'landscape-left';
  document.getElementById('dcFold')!.dataset.folded = 'true';
  document.getElementById('dcHinge')!.setAttribute('aria-pressed', 'false');
} };
