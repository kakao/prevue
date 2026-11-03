import type { Meta, StoryObj } from '@storybook/react-vite';
import { createMessages } from '../src/messages';
import en from '../../plugin/viewer/strings/en.json';
import ko from '../../plugin/viewer/strings/ko.json';
import board from '../../plugin/daemon/app/src/test/contract/viewer.state.board.json';

const meta = { title: '재료/Messages' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Dictionaries: Story = { render: () => <table><thead><tr><th>Key</th><th>en</th><th>ko</th></tr></thead><tbody>{Object.keys(en).sort().map(key => <tr key={key}><th><code>{key}</code></th><td>{en[key as keyof typeof en]}</td><td>{ko[key as keyof typeof ko]}</td></tr>)}</tbody></table> };
export const DaemonMessages: Story = { render: () => <table><thead><tr><th>JSON</th><th>en</th><th>ko</th></tr></thead><tbody>{[board.example.boardNote, board.example.who, ...board.example.timing.map(part => part.label)].map((message, index) => <tr key={index}><td><code>{JSON.stringify(message)}</code></td><td>{createMessages(en).daemonText(message)}</td><td>{createMessages(ko).daemonText(message)}</td></tr>)}</tbody></table> };
