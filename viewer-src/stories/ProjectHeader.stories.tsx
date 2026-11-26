import type { Meta, StoryObj } from '@storybook/react-vite';
import '../static/style.css';
import { HelpButton } from '../src/components/ShortcutHelp';
import { ProjectHeader } from '../src/components/ProjectHeader';
import { StatusPill } from '../src/components/StatusPill';
import { exampleArgs, examples } from './examples';

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
