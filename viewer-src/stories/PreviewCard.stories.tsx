import type { Meta, StoryObj } from '@storybook/react-vite';
import '../static/style.css';
import { PreviewCard } from '../src/components/PreviewBoard';
import { examples } from './examples';
import { pearlBoard } from './pearl';

const cards = pearlBoard.groups.flatMap(g => g.cards.map(card => ({ card, fn: g.name })));
const meta = { title: '보드/PreviewCard', args: { card: 0, cursor: false }, argTypes: { card: { control: { type: 'range', min: 0, max: cards.length - 1 } } } } satisfies Meta<{ card: number; cursor: boolean }>;
export default meta;
type Story = StoryObj<{ card: number; cursor: boolean }>;
const Card = ({ card, cursor }: { card: number; cursor: boolean }) => <div className="board"><PreviewCard {...cards[card]} cursor={cursor} /></div>;
export const Pearl: Story = { render: Card };
const contract = examples[0].board!.groups[0];
export const Contract: Story = { render: ({ cursor }) => <div className="board"><PreviewCard card={contract.cards[0]} fn={contract.name} cursor={cursor} /></div> };
