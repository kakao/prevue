import type { Meta, StoryObj } from '@storybook/react-vite';
import '../legacy/style.css';
import { ChoicePopover } from '../src/components/PointOverlay';
import { choiceExample } from './workspace';

// 같은 파일명이 여러 곳에 있을 때 소스를 고르는 팝오버 — 계약 예제 choice. 가리킨 카드가 없으면(새로 연 페이지) 헤더 아래 가운데에 선다.
const meta = { title: '가리키기/ChoicePopover' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Contract: Story = { render: () => <ChoicePopover choice={choiceExample.choice} repo={choiceExample.header.repo} /> };
