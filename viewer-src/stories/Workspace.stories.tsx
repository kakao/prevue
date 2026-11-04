import type { Meta, StoryObj } from '@storybook/react-vite';
import { Workspace } from '../src/components/Workspace';
import { useLiveScene, useShot, WorkspaceBody } from './workspace';

// 한 장의 배치 — 왼쪽 무대(장면 + 캔버스)와 오른쪽 검사 패널(D-99). 뷰어에서는 무대 · 패널의 칸을 빌드가 index.html 에 미리 그려 둔다.
const meta = { title: '작업공간/Workspace' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
// 보기 모드의 캔버스 — 정지 PNG 하나. 조작이 아니면 장면(기기 틀)은 숨는다.
export const View: Story = { render: () => { useShot(); return <div className="story-stage"><WorkspaceBody><Workspace screen="focus" /></WorkspaceBody></div>; } };
// 조작 모드의 기기 틀 — 번들 밖의 resize-scene.js 를 띄워 pearl 첫 카드를 원래 크기로 담는다. 패널에서 크기 · 기기를 고르면 틀이 옮겨 간다.
export const Device: Story = { render: () => { const Live = () => { useLiveScene(); return null; }; return <div className="story-stage"><WorkspaceBody><Workspace screen="focus" /><Live /></WorkspaceBody></div>; } };
