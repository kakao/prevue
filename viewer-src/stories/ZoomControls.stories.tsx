import type { Meta, StoryObj } from '@storybook/react-vite';
import { ZoomControls } from '../src/components/Workspace';
import { zoomView } from '../src/workspace/view';
import { WithView, WorkspaceBody } from './workspace';

// 확대 줄(W4). 배율의 100% 는 실제 크기(1dp = 1 CSS px)다. 배율 · 메뉴 · 잠금은 데몬 상태가 아니라 뷰어가 잰 값이다.
const meta = { title: '작업공간/ZoomControls' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
const Panel = ({ value }: { value: Parameters<typeof zoomView.set>[0] }) => <WithView store={zoomView} value={value}><WorkspaceBody><div className="story-zoom"><aside className="panel"><ZoomControls /></aside></div></WorkspaceBody></WithView>;
// 맞춤 — 기기 밀도(pxPerDp 2.625)에서 맞춤이 실제 크기의 38%다. `맞춤` 단추는 접혀 있다.
export const Fit: Story = { render: () => <Panel value={{ pct: 38, real: true, atFit: true, menu: false, disabled: false }} /> };
// 확대한 뒤 — `맞춤` 단추가 폭이 자라며 살아난다. 메뉴는 그 위로 열린다.
export const Zoomed: Story = { render: () => <Panel value={{ pct: 200, real: true, atFit: false, menu: true, disabled: false }} /> };
// 밀도를 모르는 기기(id:) — 배율은 맞춤 기준이고 `실제 크기`가 메뉴에서 빠진다.
export const NoDensity: Story = { render: () => <Panel value={{ pct: 100, real: false, atFit: true, menu: true, disabled: false }} /> };
// 첫 장을 기다리는 동안 — 조작 도구가 잠긴다.
export const Preparing: Story = { render: () => <Panel value={{ pct: 100, real: true, atFit: true, menu: false, disabled: true }} /> };
