import type { Meta, StoryObj } from '@storybook/react-vite';
import '../legacy/style.css';
import { StartScreen } from '../src/components/QuickOpen';
import { pearlFiles, pearlRecent } from './pearl';
import { Search } from './search';

// 열린 탭이 없을 때(D-63) — 팔레트의 검색 상자가 막 없이 본문 가운데에 선다. 단축키 안내 대신 터미널 안내가 보인다.
const meta = { title: '파일/StartScreen' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Pearl: Story = { render: () => <StartScreen><Search files={pearlFiles} ready recent={pearlRecent} /></StartScreen> };
