import type { Meta, StoryObj } from '@storybook/react-vite';
import '../static/style.css';
import { PreviewBoard } from '../src/components/PreviewBoard';
import { useMessages } from '../src/messages';
import { pearlBoard } from './pearl';
import { SceneStory } from './preparation';

const meta = { title: '준비/PreparationScreen' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
const card = pearlBoard.groups[0].cards[0];
export const Preparing: Story = { render: () => <SceneStory phase="project" file={pearlBoard.file} /> };
export const Arrived: Story = { render: () => <><PreviewBoard board={pearlBoard} screen="board" /><SceneStory phase="render" file={pearlBoard.file} drawn={card} /></> };
function Stopped() { const { phrase } = useMessages(); return <SceneStory phase="environment" file={pearlBoard.file} failure={phrase('prep.stopped')} />; }
export const Failure: Story = { render: () => <Stopped /> };
