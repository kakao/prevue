import type { Meta, StoryObj } from '@storybook/react-vite';
import '../legacy/style.css';
import { NotificationCapsule } from '../src/components/NotificationCapsule';
import { useMessages } from '../src/messages';

// 캡슐의 글은 데몬 상태가 아니라 뷰어가 사전에서 고른다 — 끊김 오류 · 공유 소스 세트의 처음 한 번 안내.
const meta = { title: '공통/NotificationCapsule' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
const Example = ({ kind }: { kind: 'error' | 'once' | 'both' }) => {
  const { phrase } = useMessages();
  const once = { key: 'prevue.sharedOnce', text: phrase('capsule.sharedOnce', { sourceSet: 'commonMain' }) };
  return <div className="story-shell"><NotificationCapsule content={{ error: kind === 'once' ? '' : phrase('status.lost'), log: '', once: kind === 'error' ? null : once }} /></div>;
};
export const Error: Story = { render: () => <Example kind="error" /> };
export const SharedOnce: Story = { render: () => <Example kind="once" /> };
export const Both: Story = { render: () => <Example kind="both" /> };
