import type { Meta, StoryObj } from '@storybook/react-vite';
import '../legacy/style.css';
import { HelpButton } from '../src/components/ShortcutHelp';
import { ProjectHeader } from '../src/components/ProjectHeader';
import { StatusPill } from '../src/components/StatusPill';
import { exampleArgs, examples } from './examples';

// 바깥 줄(.bar · 워드마크 · 오른쪽 묶음)은 제품에서 index.html 의 마크업이다. 여기서는 같은 줄에 앉혀 본다.
const meta = { title: '공통/ProjectHeader', ...exampleArgs } satisfies Meta<{ example: number }>;
export default meta;
type Story = StoryObj<{ example: number }>;
export const Contract: Story = { render: ({ example }) => {
  const state = examples[example];
  return <header className="bar"><div className="bar-row">
    <div className="bar-l"><ProjectHeader header={state.header} tabs={state.tabs} app={{}} /></div>
    <div className="bar-r"><StatusPill state={state} /><HelpButton /></div>
  </div></header>;
} };
