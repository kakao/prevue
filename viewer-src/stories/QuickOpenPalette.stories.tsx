import type { Meta, StoryObj } from '@storybook/react-vite';
import '../static/style.css';
import { QuickOpenPalette } from '../src/components/QuickOpen';
import { pearlFiles, pearlRecent } from './pearl';
import { Search } from './search';

const meta = { title: '파일/QuickOpenPalette' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Pearl: Story = { render: () => <QuickOpenPalette><Search files={pearlFiles} ready recent={pearlRecent} /></QuickOpenPalette> };
