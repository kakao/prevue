import type { Meta, StoryObj } from '@storybook/react-vite';
import { Workspace } from '../src/components/Workspace';
import { examples } from './examples';
import { useLiveScene, WorkspaceBody } from './workspace';

const meta = { title: '작업공간/Workspace' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
// 시스템 UI 토글은 계약 예제의 한 장 값(어노테이션 없음 — 꺼짐)이다.
const systemUi = examples[1].focus?.systemUi ?? null;
// 조작 모드의 기기 틀 — 번들 밖의 resize-scene.js 를 띄워 pearl 첫 카드를 원래 크기로 담는다. 독의 메뉴에서 크기 · 기기를 고르면 틀이 옮겨 간다.
function Live() { const dock = useLiveScene(); return <Workspace screen="focus" systemUi={systemUi} dock={dock} />; }
export const Device: Story = { render: () => <div className="story-stage"><WorkspaceBody><Live /></WorkspaceBody></div> };
// 메뉴를 연 뒤 — 크기 · 기기 목록이 버튼 위로 열린다. 고르면 닫히고, 고른 것의 조작은 독 가운데에 뜬다.
export const MenuOpen: Story = { ...Device, play: () => { document.getElementById('pnSum')!.click(); } };
// 기기를 고른 뒤 — 독 가운데에 그 기기의 자세(돌리기 · 접기 · 힌지 선)가 뜬다.
export const DeviceDock: Story = { ...Device, play: () => { document.querySelector<HTMLElement>('#pnPick [data-sel="duo"]')!.click(); } };
// 커스텀을 고른 뒤 — 독 가운데에 폭 · 높이 슬라이더가 뜬다.
export const CustomDock: Story = { ...Device, play: () => { document.querySelector<HTMLElement>('#pnPick [data-sel="custom"]')!.click(); } };
