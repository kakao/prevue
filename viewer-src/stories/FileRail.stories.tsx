import type { Meta, StoryObj } from '@storybook/react-vite';
import '../legacy/style.css';
import { FileRail } from '../src/components/FileRail';
import { exampleArgs, examples } from './examples';

const meta = { title: '공통/FileRail', ...exampleArgs, args: { example: 3 } } satisfies Meta<{ example: number }>;
export default meta;
type Story = StoryObj<{ example: number }>;
// 작업 공간(focus)에서는 레일이 접힌다(D-99) — focus · single 예제는 비어 보이는 것이 맞다.
export const Contract: Story = { render: ({ example }) => <div className="story-shell"><FileRail tabs={examples[example].tabs} screen={examples[example].screen} /></div> };
