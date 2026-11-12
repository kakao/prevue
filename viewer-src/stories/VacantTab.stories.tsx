import type { Meta, StoryObj } from '@storybook/react-vite';
import '../legacy/style.css';
import { VacantTab } from '../src/components/VacantTab';
import { exampleArgs, examples } from './examples';

// 빈 탭 — 탭의 파일이 지워졌거나 @Preview 를 잃었다. 계약 예제에는 빈 탭 상태(screen=vacant)가 없어 화면이 숨는다 — 문장은 데몬이 정한다.
const meta = { title: '파일/VacantTab', ...exampleArgs } satisfies Meta<{ example: number }>;
export default meta;
type Story = StoryObj<{ example: number }>;
export const Contract: Story = { render: ({ example }) => <div className="story-shell"><VacantTab screen={examples[example].screen} vacant={examples[example].vacant} /><pre>{JSON.stringify({ screen: examples[example].screen, vacant: examples[example].vacant })}</pre></div> };
