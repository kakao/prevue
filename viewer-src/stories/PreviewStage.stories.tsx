import type { Meta, StoryObj } from '@storybook/react-vite';
import { PreviewStage } from '../src/components/WorkspaceShell';
import { useShot } from './workspace';

// 정지 그림 · 스트림을 보이는 무대. 그림의 src 는 JSX 가 갖지 않는다 — 뷰어에서는 focus.ts 가 크로스페이드 · 스트림 붙이기로 갈아 끼운다.
const meta = { title: '작업공간/PreviewStage' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Still: Story = { render: () => { useShot(); return <div className="wrap"><PreviewStage /></div>; } };
