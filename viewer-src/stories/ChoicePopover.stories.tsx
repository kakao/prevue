import type { Meta, StoryObj } from '@storybook/react-vite';
import '../static/style.css';
import { ChoicePopover } from '../src/components/PointOverlay';
import { choiceExample } from './workspace';

const meta = { title: '가리키기/ChoicePopover' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Contract: Story = { render: () => <ChoicePopover choice={choiceExample.choice} repo={choiceExample.header.repo} /> };
