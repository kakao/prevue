import type { Meta, StoryObj } from '@storybook/react-vite';
import '../legacy/style.css';
import { BuildNotice } from '../src/components/BuildNotice';
import { exampleArgs, examples } from './examples';

const meta = { title: '공통/BuildNotice', ...exampleArgs } satisfies Meta<{ example: number }>;
export default meta;
type Story = StoryObj<{ example: number }>;
// 계약 예제는 모두 buildPending false 라 안내가 숨는다. 외부 빌드를 기다리는 동안(true)만 작은 안내가 선다 — 그 상태는 예제에 없어 스토리도 없다.
export const Contract: Story = { render: ({ example }) => <div className="story-shell"><BuildNotice pending={examples[example].buildPending} /><pre>{JSON.stringify({ buildPending: examples[example].buildPending })}</pre></div> };
