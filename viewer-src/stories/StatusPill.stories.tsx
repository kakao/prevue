import type { Meta, StoryObj } from '@storybook/react-vite';
import '../static/style.css';
import { StatusPill } from '../src/components/StatusPill';
import { exampleArgs, examples } from './examples';

const meta = { title: '공통/StatusPill', ...exampleArgs } satisfies Meta<{ example: number }>;
export default meta;
type Story = StoryObj<{ example: number }>;
export const Contract: Story = { render: ({ example }) => <div className="story-row"><StatusPill state={examples[example]} /></div> };
export const Restarting: Story = { render: ({ example }) => <StatusPill state={examples[example]} connection="restarting" /> };
export const Lost: Story = { render: ({ example }) => <StatusPill state={examples[example]} connection="lost" /> };
