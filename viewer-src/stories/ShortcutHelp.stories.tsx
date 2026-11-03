import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect } from 'react';
import '../legacy/style.css';
import logo from '../../plugin/viewer/prevue.svg';
import { ShortcutHelp, toggleHelp } from '../src/components/ShortcutHelp';
import { useMessages } from '../src/messages';
import { shortcutTable, type ShortcutActions } from '../src/shortcuts';

// 디스패치와 같은 표를 그린다. 여기서는 키가 하는 일이 없다.
const idle: ShortcutActions = {
  screen: () => 'board', fromBoard: () => false, tabCount: () => 0, helpOpen: () => true,
  moveCursor() {}, openCursor() {}, exitFocus() {}, toggleInteractive() {}, zoomIn() {}, zoomOut() {}, zoomFit() {}, stepTab() {}, jumpTab() {}, openQuickOpen() {}, toggleHelp() {},
};
const meta = { title: '도움말/ShortcutHelp' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Open: Story = { render: () => {
  const { phrase } = useMessages();
  // 스스로 그린 바깥 요소가 붙은 뒤에 연다.
  useEffect(() => { const timer = setTimeout(() => toggleHelp(true)); return () => { clearTimeout(timer); toggleHelp(false); }; }, []);
  return <ShortcutHelp table={shortcutTable(phrase, idle)} logo={logo} />;
} };
