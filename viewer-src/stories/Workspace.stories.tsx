import type { Meta, StoryObj } from '@storybook/react-vite';
import { Workspace } from '../src/components/Workspace';
import { useLiveScene, WorkspaceBody } from './workspace';

// 한 장의 배치 — 창을 다 쓰는 무대(장면 + 캔버스)와 그 아래 가운데의 조작 독(크기 · 기기 메뉴 · 자세나 커스텀 슬라이더 · 확대, D-167). 뷰어에서는 무대 · 독의 칸을 빌드가 index.html 에 미리 그려 둔다.
const meta = { title: '작업공간/Workspace' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
// 조작 모드의 기기 틀 — 번들 밖의 resize-scene.js 를 띄워 pearl 첫 카드를 원래 크기로 담는다. 독의 메뉴에서 크기 · 기기를 고르면 틀이 옮겨 간다.
export const Device: Story = { render: () => { const Live = () => { useLiveScene(); return null; }; return <div className="story-stage"><WorkspaceBody><Workspace screen="focus" /><Live /></WorkspaceBody></div>; } };
// 메뉴를 연 뒤 — 크기 · 기기 목록이 버튼 위로 열린다. 고르면 닫히고, 고른 것의 조작은 독 가운데에 뜬다.
export const MenuOpen: Story = { ...Device, play: () => { document.getElementById('pnSum')!.click(); } };
// 기기를 고른 뒤 — 독 가운데에 그 기기의 자세(돌리기 · 접기 · 힌지 선)가 뜬다.
export const DeviceDock: Story = { ...Device, play: () => { document.querySelector<HTMLElement>('#pnPick [data-sel="ipduo"]')!.click(); } };
// 커스텀을 고른 뒤 — 독 가운데에 폭 · 높이 슬라이더가 뜬다.
export const CustomDock: Story = { ...Device, play: () => { document.querySelector<HTMLElement>('#pnPick [data-sel="custom"]')!.click(); } };
