import type { Meta, StoryObj } from '@storybook/react-vite';
import '../legacy/style.css';
import { PreviewBoard } from '../src/components/PreviewBoard';
import { useMessages } from '../src/messages';
import { pearlBoard } from './pearl';
import { SceneStory } from './preparation';

// 준비 요청부터 실제 뷰어 도착까지(D-102). 데몬이 뜨기 전에는 prepare.html 이 단계를 보이고, 뷰어가 이어받으면
// 보드가 처음부터 이 장면 아래에 있다가 다 그린 PNG를 보인 뒤 걷힌다.
const meta = { title: '준비/PreparationScreen' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
const card = pearlBoard.groups[0].cards[0];
export const Preparing: Story = { render: () => <SceneStory phase="project" file={pearlBoard.file} /> };
export const Arrived: Story = { render: () => <><PreviewBoard board={pearlBoard} screen="board" /><SceneStory phase="render" file={pearlBoard.file} drawn={card} /></> };
function Stopped() { const { phrase } = useMessages(); return <SceneStory phase="environment" file={pearlBoard.file} failure={phrase('prep.stopped')} />; }
// 실패 화면에는 다시 시도 버튼이 없다 — 다시 요청하라는 안내만 있다.
export const Failure: Story = { render: () => <Stopped /> };
