import type { Meta, StoryObj } from '@storybook/react-vite';
import '../static/style.css';
import { VacantTab } from '../src/components/VacantTab';
import { exampleArgs, examples } from './examples';

const meta = { title: '파일/VacantTab', ...exampleArgs } satisfies Meta<{ example: number }>;
export default meta;
type Story = StoryObj<{ example: number }>;
export const Contract: Story = { render: ({ example }) => <div className="story-shell"><VacantTab screen={examples[example].screen} vacant={examples[example].vacant} /><pre>{JSON.stringify({ screen: examples[example].screen, vacant: examples[example].vacant })}</pre></div> };
