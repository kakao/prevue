import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import board from '../../plugin/daemon/app/src/test/contract/viewer.state.board.json';
import { ViewerRoot } from '../src/ViewerRoot';
import type { ViewerState } from '../src/state';

const meta = { title: '공통/ViewerRoot' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
const state = { ...board.example, screen: 'board' as const } satisfies ViewerState;
export const Boundary: Story = { render: () => {
  const [version, setVersion] = useState<number | null>(null);
  return <div><ViewerRoot state={state} renderLegacy={value => setVersion(value.version)} /><output data-version={version ?? ''}>apply(state): {version ?? '…'}</output></div>;
} };
