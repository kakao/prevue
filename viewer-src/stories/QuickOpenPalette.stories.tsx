import type { Meta, StoryObj } from '@storybook/react-vite';
import '../legacy/style.css';
import { QuickOpenPalette } from '../src/components/QuickOpen';
import { pearlFiles, pearlRecent } from './pearl';
import { Search } from './search';

// 창 위 가운데 팔레트와 본문을 가리는 막(D-100). 여닫는 움직임은 뷰어에서만 걸린다 — 여기서는 펼친 모습이다.
const meta = { title: '파일/QuickOpenPalette' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Pearl: Story = { render: () => <QuickOpenPalette><Search files={pearlFiles} ready recent={pearlRecent} /></QuickOpenPalette> };
