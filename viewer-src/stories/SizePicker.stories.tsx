import type { Meta, StoryObj } from '@storybook/react-vite';
import { SizePicker } from '../src/components/Dock';
import { idleDock, WorkspaceBody } from './workspace';

const meta = { title: '작업공간/SizePicker' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
const rows = { original: '411×891', narrow: '320×640', foldable: '673×841', custom: '240–1600' };
export const Shell: Story = { render: () => <WorkspaceBody><div className="pn-body story-menu"><SizePicker dock={idleDock({ checked: 'original', rows })} /></div></WorkspaceBody> };
