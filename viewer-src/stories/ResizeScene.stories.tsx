import type { Meta, StoryObj } from '@storybook/react-vite';
import { ResizeScene } from '../src/components/WorkspaceShell';
import './workspace';

const meta = { title: '작업공간/ResizeScene' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Shell: Story = { render: () => <div className="wrap"><ResizeScene /><pre>#resizeScene · #resizeGeometry · #ua · #ub · #ruler · #rig — resize-scene.js 가 켠다</pre></div> };
