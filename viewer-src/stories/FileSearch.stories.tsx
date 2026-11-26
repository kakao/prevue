import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';
import '../static/style.css';
import files from '../../plugin/daemon/daemon/src/test/contract/preview-files.json';
import pending from '../../plugin/daemon/daemon/src/test/contract/preview-files.pending.json';
import { pearlFiles, pearlRecent } from './pearl';
import { Search } from './search';

const meta = { title: '파일/FileSearch' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
const box = (node: ReactNode) => <div className="story-search">{node}</div>;
export const Contract: Story = { render: () => box(<Search files={files.example.files} ready={files.example.ready} />) };
export const Pending: Story = { render: () => box(<Search files={pending.example.files} ready={pending.example.ready} />) };
export const ContractFunction: Story = { render: () => box(<Search files={files.example.files} ready={files.example.ready} query="card1" />) };
export const Pearl: Story = { render: () => box(<Search files={pearlFiles} ready />) };
export const PearlRecent: Story = { render: () => box(<Search files={pearlFiles} ready recent={pearlRecent} />) };
export const PearlResults: Story = { render: () => box(<Search files={pearlFiles} ready query="pearl" />) };
export const NoMatch: Story = { render: () => box(<Search files={pearlFiles} ready query="zzzz" />) };
