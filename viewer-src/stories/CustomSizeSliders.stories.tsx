import type { Meta, StoryObj } from '@storybook/react-vite';
import { CustomSizeSliders } from '../src/components/Dock';
import { idleDock, WorkspaceBody } from './workspace';

const meta = { title: '작업공간/CustomSizeSliders' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Shell: Story = { render: () => <WorkspaceBody><div className="panel story-dock"><CustomSizeSliders dock={idleDock({ sliders: true, slW: 411, slH: 891 })} /></div></WorkspaceBody> };
