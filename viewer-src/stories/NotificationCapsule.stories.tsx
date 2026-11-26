import type { Meta, StoryObj } from '@storybook/react-vite';
import '../static/style.css';
import { NotificationCapsule } from '../src/components/NotificationCapsule';
import { useMessages } from '../src/messages';

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
