import type { Meta, StoryObj } from '@storybook/react-vite';
import '../legacy/style.css';
import { StaleBanner } from '../src/components/StaleBanner';
import { exampleArgs, examples } from './examples';

const meta = { title: '공통/StaleBanner', ...exampleArgs } satisfies Meta<{ example: number }>;
export default meta;
type Story = StoryObj<{ example: number }>;
// 계약 예제에는 낡음 줄이 없다 — 띠는 접힌 채다. 줄이 있으면 이유마다 한 줄씩 펼친다.
export const Contract: Story = { render: ({ example }) => <div className="story-shell"><StaleBanner rows={examples[example].stale} /><pre>{JSON.stringify(examples[example].stale)}</pre></div> };
