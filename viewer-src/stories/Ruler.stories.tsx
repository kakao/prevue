import type { Meta, StoryObj } from '@storybook/react-vite';
import { Ruler } from '../src/components/WorkspaceShell';
import './workspace';

// 치수선 — 지금 폭 · 높이를 읽고 커스텀이면 숫자를 고친다. 자리 · 값 · 잠금은 resize-scene.js 가 쓴다. 장면 밖에서는 숨은 채라 껍데기만 펼쳐 보인다.
const meta = { title: '작업공간/Ruler' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Shell: Story = { render: () => <div className="resize-scene"><Ruler /></div>, play: () => { document.getElementById('ruler')!.hidden = false; } };
