import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect } from 'react';
import '../static/style.css';
import logo from '../../plugin/viewer/prevue.svg';
import { ShortcutHelp, toggleHelp } from '../src/components/ShortcutHelp';
import { useMessages } from '../src/messages';
import { shortcutTable, type ShortcutActions } from '../src/shortcuts';

const idle: ShortcutActions = {
  screen: () => 'board', tabCount: () => 0, helpOpen: () => true,
  moveCursor() {}, openCursor() {}, exitFocus() {}, openGallery() {}, zoomIn() {}, zoomOut() {}, zoomFit() {}, stepTab() {}, jumpTab() {}, openQuickOpen() {}, toggleHelp() {},
};
const meta = { title: '도움말/ShortcutHelp' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Open: Story = { render: () => {
  const { phrase } = useMessages();
  useEffect(() => { const timer = setTimeout(() => toggleHelp(true)); return () => { clearTimeout(timer); toggleHelp(false); }; }, []);
  return <ShortcutHelp table={shortcutTable(phrase, idle)} logo={logo} />;
} };
