import type { Meta, StoryObj } from '@storybook/react-vite';
import { ResizeScene } from '../src/components/WorkspaceShell';
import './workspace';

// 크기 · 회전 · 접기 전환의 틀과 그림의 껍데기. 기기 틀이 그려진 모습은 작업공간/Workspace 의 Device 가 보인다 — 장면이 조작 독도 함께 쥔다.
const meta = { title: '작업공간/ResizeScene' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Shell: Story = { render: () => <div className="wrap"><ResizeScene /><pre>#resizeScene · #resizeGeometry · #ua · #ub · #ruler · #rig — resize-scene.js 가 켠다</pre></div> };
