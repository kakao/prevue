import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';
import '../legacy/style.css';
import files from '../../plugin/daemon/daemon/src/test/contract/preview-files.json';
import pending from '../../plugin/daemon/daemon/src/test/contract/preview-files.pending.json';
import { pearlFiles, pearlRecent } from './pearl';
import { Search } from './search';

// 검색 상자 — 팔레트와 시작 화면이 같은 한 벌을 쓴다. 목록은 계약 preview-files 와 fixtures/pearl 의 실제 목록이다.
// 계약 예제는 파일이 하나라 빈 상태의 "최근 바뀐"이 한 줄이고 "최근 연"은 서지 않는다 — 두 섹션은 Pearl 에서 본다.
const meta = { title: '파일/FileSearch' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
const box = (node: ReactNode) => <div className="story-search">{node}</div>;
export const Contract: Story = { render: () => box(<Search files={files.example.files} ready={files.example.ready} />) };
// 데몬이 아직 색인을 짓는 중(ready: false, 파일 없음).
export const Pending: Story = { render: () => box(<Search files={pending.example.files} ready={pending.example.ready} />) };
// 함수 이름으로 맞으면 그 함수가 줄에 붙는다(R1) — 고르면 그 묶음으로 간다.
export const ContractFunction: Story = { render: () => box(<Search files={files.example.files} ready={files.example.ready} query="card1" />) };
export const Pearl: Story = { render: () => box(<Search files={pearlFiles} ready />) };
// 최근 연 파일은 저장소별로 브라우저에만 남는다 — 최근 바뀐 5줄 뒤에 선다.
export const PearlRecent: Story = { render: () => box(<Search files={pearlFiles} ready recent={pearlRecent} />) };
export const PearlResults: Story = { render: () => box(<Search files={pearlFiles} ready query="pearl" />) };
export const NoMatch: Story = { render: () => box(<Search files={pearlFiles} ready query="zzzz" />) };
