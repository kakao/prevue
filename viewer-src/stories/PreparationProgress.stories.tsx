import type { Meta, StoryObj } from '@storybook/react-vite';
import { useMessages } from '../src/messages';
import { pearlBoard } from './pearl';
import { SceneStory, type SceneArgs } from './preparation';

// 단계 글 · 지금 하는 일 · 경과 · 네 칸 막대. 지난 칸은 차고 지금 칸은 끝에 닿지 않고 다가가기만 한다.
const meta = { title: '준비/PreparationProgress', args: { phase: 'project' }, argTypes: { phase: { control: { type: 'select' }, options: ['project', 'environment', 'render'] } } } satisfies Meta<SceneArgs>;
export default meta;
type Story = StoryObj<SceneArgs>;
export const Phase: Story = { render: ({ phase }) => <SceneStory phase={phase} file={pearlBoard.file} /> };
// 파일을 정하지 않은 준비는 다 되면 파일을 고르라고 한다.
export const NoFile: Story = { render: () => <SceneStory phase="environment" /> };
function Stopped() { const { phrase } = useMessages(); return <SceneStory phase="render" file={pearlBoard.file} failure={phrase('prep.render.cannot')} />; }
// 멈춘 칸이 빨갛고 지금 하는 일 줄은 걷힌다.
export const Failure: Story = { render: () => <Stopped /> };
