import type { Meta, StoryObj } from '@storybook/react-vite';
import '../legacy/style.css';
import { StatusPill } from '../src/components/StatusPill';
import { exampleArgs, examples } from './examples';

const meta = { title: '공통/StatusPill', ...exampleArgs } satisfies Meta<{ example: number }>;
export default meta;
type Story = StoryObj<{ example: number }>;
// 시간 내역 · 누가 · 언제는 호버 · 포커스에 뜬다.
export const Contract: Story = { render: ({ example }) => <div className="story-row"><StatusPill state={examples[example]} /></div> };
// 데몬 상태 밖의 사건 — 다시 시작(D-112)과 끊김. 상태보다 앞선다.
export const Restarting: Story = { render: ({ example }) => <StatusPill state={examples[example]} connection="restarting" /> };
export const Lost: Story = { render: ({ example }) => <StatusPill state={examples[example]} connection="lost" /> };
