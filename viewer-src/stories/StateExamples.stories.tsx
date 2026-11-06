import type { Meta, StoryObj } from '@storybook/react-vite';
import { exampleNames, examples } from './examples';

const meta = { title: '재료/StateExamples', args: { example: 0 }, argTypes: { example: { control: 'select', options: [0, 1, 2, 3], mapping: undefined } } } satisfies Meta<{ example: number }>;
export default meta;
type Story = StoryObj<{ example: number }>;
export const Contract: Story = { render: ({ example }) => <div><h1>{exampleNames[example]}</h1><pre>{JSON.stringify(examples[example], null, 2)}</pre></div> };
