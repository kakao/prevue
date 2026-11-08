import type { Meta, StoryObj } from '@storybook/react-vite';
import { PointTag, tagTitle } from '../src/components/PointOverlay';
import type { TagSay } from '../src/workspace/view';
import { choiceExample, pearlCard, useShot } from './workspace';

// 가리킨 결과의 꼬리표(D-101 · D-105) — `파일명:라인`, 복사 결과, 막혔을 때 다시 복사, 다른 파일이면 탭으로 열기.
// 꼬리표의 멘션은 데몬의 가리키기 응답이다 — 계약 예제 choice 의 파일 · 후보 경로로 짓는다. 박스의 자리는 뷰어가 트리에서 잰다.
const meta = { title: '가리키기/PointOverlay' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
const choice = choiceExample.choice!, path = choice.candidates[0], ref = `@${path}#L${choice.line}`;
const node = { name: 'Text', fileName: choice.fileName, lineNumber: choice.line, bounds: [0, 0, 1, 1], uchain: ['PearlListPreview', 'Column', 'Text'] };
const says: Array<[string, TagSay]> = [
  ['가리키는 중', { msg: null, ref: `${choice.fileName}:${choice.line}` }],
  ['복사됨', { msg: null, ref, copied: true, file: path }],
  ['다시 복사', { msg: null, ref, copied: false, file: path, again: () => {} }],
  ['막힘', { msg: null, ref, copied: false, file: path }],
];
const Tag = ({ say, top }: { say: TagSay; top: number }) => <div className="box pick" style={{ left: '12%', top: `${top}%`, width: '70%', height: '6%' }}>
  <span className="tag" title={tagTitle(node, say)}><PointTag say={say} state={choiceExample} /></span>
</div>;
export const Tags: Story = { render: () => { useShot(pearlCard.imageUrl); return <div className="wrap"><div className="stage" id="stage"><img id="shot" alt="preview" />
  {says.map(([name, say], i) => <Tag key={name} say={say} top={12 + i * 20} />)}
</div></div>; } };
