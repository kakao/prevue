import type { Meta, StoryObj } from '@storybook/react-vite';
import { DevicePosture } from '../src/components/Dock';
import { idleDock, WorkspaceBody } from './workspace';

const meta = { title: '작업공간/DevicePosture' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Shell: Story = { render: () => <WorkspaceBody><div className="panel story-dock"><DevicePosture dock={idleDock({ posture: true, foldable: true })} /></div></WorkspaceBody> };
export const Folded: Story = { render: () => <WorkspaceBody><div className="panel story-dock">
  <DevicePosture dock={idleDock({ posture: true, foldable: true, folded: true, orientation: 'landscape-left', hinge: false })} />
</div></WorkspaceBody> };
