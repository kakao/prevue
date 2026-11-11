import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';
import { WorkspaceBody } from '../../viewer-src/stories/workspace';
import './dock-icons.css';

// 조작 독을 아이콘만 남길 때의 그림 후보 — 지금 모양(아이콘 + 글자)을 기준으로 독 실제 크기에서 라이트 · 다크를 나란히 본다.
// 고른 것(2026-11-11, 사용자): 돌리기 B 카메라 점 · 접기 B 모으기 · 벌리기 화살표 · 인셋 B 안쪽 점선.
// 돌리기 · 접기는 실제 독(viewer-src/src/components/WorkspaceShell.tsx)에 옮겼고, 인셋 그림은 인셋 오버레이 토글이 쓴다. 이 스토리는 고른 기록으로 남는다.
const meta = { title: '시안/조작 독 아이콘' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const icon = (d: ReactNode) => <svg className="tb-ic" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>;
const CHEVRON = <svg className="tb-chev" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m4.5 6.5 3.5 3.5 3.5-3.5" /></svg>;
const MINUS = <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="M4 8h8" /></svg>;
const PLUS = <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="M4 8h8M8 4v8" /></svg>;

// 지금 독의 그림.
const NOW = {
  rotate: icon(<><rect x="6.5" y="3" width="7" height="12" rx="1.5" /><path d="M16.5 9.5a6.5 6.5 0 0 1-3.2 5.6M15.4 17.2l-2.1-2.1 2.6-.9" /></>),
  fold: icon(<><path d="M10 4v12" strokeDasharray="1.6 1.6" /><path d="M3.5 5.5h13v9h-13z" /><path d="M10 5.5 14 3v9.5l-4 2" /></>),
  hinge: icon(<><rect x="3.5" y="4" width="13" height="12" rx="1.5" /><path d="M10 4v12" strokeDasharray="1.6 1.6" /></>),
  bars: icon(<><rect x="5.5" y="2.5" width="9" height="15" rx="1.8" /><path d="M5.5 5.5h9M8.5 15h3" /></>),
};

// 돌리기 — 폰 그림(.di-turn)이 지금 방향으로 눕는다.
const ROTATE: Record<string, { name: string; why: string; art: ReactNode }> = {
  A: { name: 'A 스피커 줄', why: '위쪽 짧은 줄로 위가 어디인지 보입니다. 가장 단순합니다.',
    art: icon(<g className="di-turn"><rect x="6.5" y="3" width="7" height="14" rx="1.6" /><path d="M9 5.5h2" /></g>) },
  B: { name: 'B 카메라 점', why: '위쪽 점 하나. 작은 크기에서 줄보다 또렷합니다.',
    art: icon(<g className="di-turn"><rect x="6.5" y="3" width="7" height="14" rx="1.6" /><circle cx="10" cy="5.8" r=".6" fill="currentColor" /></g>) },
  C: { name: 'C 폰 + 화살표', why: '폰은 눕고 화살표는 제자리. "돌리는 버튼"이라는 뜻이 남습니다.',
    art: icon(<><g className="di-turn"><rect x="7" y="5" width="6" height="11" rx="1.4" /><path d="M9.2 7.2h1.6" /></g><path d="M14 2.8a5.5 5.5 0 0 1 3.4 4.4M17.9 4.6l-.5 2.6-2.5-.8" /></>) },
};

// 접기 · 펼치기 — 그림 둘.
const FOLD: Record<string, { name: string; why: string; fold: ReactNode; unfold: ReactNode }> = {
  A: { name: 'A 넘기는 잎', why: '지금 접기 그림을 살리고 펼치기를 짝으로 그립니다. 20px 에서는 둘의 차이가 작습니다.',
    fold: NOW.fold,
    unfold: icon(<><path d="M10 4v12" strokeDasharray="1.6 1.6" /><path d="M10 5.5h6.5v9H10" /><path d="M10 5.5 6 3v9.5l4 2" /></>) },
  B: { name: 'B 모으기 · 벌리기 화살표', why: '가운데 선으로 모이면 접기, 벌어지면 펼치기. 동작이 가장 분명합니다.',
    fold: icon(<><path d="M10 3.5v13" /><path d="M3 10h4.5M5.5 7.8 7.7 10l-2.2 2.2M17 10h-4.5M14.5 7.8 12.3 10l2.2 2.2" /></>),
    unfold: icon(<><path d="M10 3.5v13" /><path d="M7.5 10H3M5.2 7.8 3 10l2.2 2.2M12.5 10H17M14.8 7.8 17 10l-2.2 2.2" /></>) },
  C: { name: 'C 지금 상태', why: '돌리기처럼 지금 모습을 보입니다(펼친 책 / 닫힌 책). 누르면 무엇이 되는지는 title 이 말합니다.',
    fold: icon(<><path d="M10 5.5v11" /><path d="M10 5.5 3.5 3.5v11l6.5 2 6.5-2v-11z" /></>),
    unfold: icon(<><rect x="6" y="3" width="8" height="14" rx="1.6" /><path d="M8.2 3v14" /></>) },
};

// 인셋 영역 보기(다음 Sub-Task 의 토글) — 그림만 여기서 고른다.
const INSET: Record<string, { name: string; why: string; art: ReactNode }> = {
  A: { name: 'A 채운 띠', why: '위 · 아래 위험 영역을 채워 보입니다. 오버레이의 색 띠와 닮았습니다.',
    art: icon(<><rect x="5.5" y="2.5" width="9" height="15" rx="1.8" /><path d="M5.5 5.8V4.3a1.8 1.8 0 0 1 1.8-1.8h5.4a1.8 1.8 0 0 1 1.8 1.8v1.5zM5.5 14.2v1.5a1.8 1.8 0 0 0 1.8 1.8h5.4a1.8 1.8 0 0 0 1.8-1.8v-1.5z" fill="currentColor" /></>) },
  B: { name: 'B 안쪽 점선', why: '기기 안의 SafeArea 사각형을 점선으로 보입니다. 힌지 선과 같은 점선 문법입니다.',
    art: icon(<><rect x="4.5" y="2.5" width="11" height="15" rx="1.8" /><rect x="7" y="5.5" width="6" height="9" strokeDasharray="1.6 1.6" /></>) },
  C: { name: 'C 모서리 표시', why: '기기 없이 안전 영역 틀만. 방향과 무관하게 읽히지만 뜻은 덜 직접적입니다.',
    art: icon(<><rect x="3" y="3" width="14" height="14" rx="2" /><path d="M6.5 9V6.5H9M11 6.5h2.5V9M13.5 11v2.5H11M9 13.5H6.5V11" /></>) },
};

const ORIENTATIONS = [['portrait', '세로'], ['landscape-left', '가로 왼쪽'], ['landscape-right', '가로 오른쪽']] as const;
const KEYS = ['A', 'B', 'C'] as const;
type Key = typeof KEYS[number];

const btn = (art: ReactNode, title: string, pressed?: boolean, extra: Record<string, string> = {}) =>
  <button className="tb-btn" type="button" title={title} aria-label={title} {...(pressed === undefined ? {} : { 'aria-pressed': pressed })} {...extra}>{art}</button>;

/** 독 한 줄 — [기기 메뉴 ▾] │ 돌리기 ▾ · 접기 · 힌지 │ 인셋 │ 확대. 메뉴와 확대는 모양만 세운 것이다. */
function Dock({ labels = false, rotate, orientation, fold, hingeOn = true, inset, insetOn = false }: { labels?: boolean; rotate: ReactNode; orientation: typeof ORIENTATIONS[number]; fold: [ReactNode, string]; hingeOn?: boolean; inset?: ReactNode; insetOn?: boolean }) {
  return <div className={labels ? 'panel story-dock' : 'panel story-dock di-icons'}>
    <div className="pn-fold"><button className="tb-btn pn-sum" type="button"><span className="nm">Fold8</span>{CHEVRON}</button></div>
    <div className="dock-seg">
      <div className="orientation-pick">
        <button className="tb-btn" type="button" data-orientation={orientation[0]} title={`${orientation[1]} — 방향 바꾸기`} aria-label={`${orientation[1]} — 방향 바꾸기`}>{rotate}{labels && <span>{orientation[1]}</span>}{CHEVRON}</button>
      </div>
      <button className="tb-btn" type="button" title={fold[1]} aria-label={fold[1]}>{fold[0]}{labels && <span>{fold[1]}</span>}</button>
      <button className="tb-btn" type="button" aria-pressed={hingeOn} title={hingeOn ? '힌지 선 숨기기' : '힌지 선 보이기'} aria-label="힌지 선">{NOW.hinge}{labels && <span>힌지 선</span>}</button>
    </div>
    {inset && <div className="sys-ui">{btn(inset, `인셋 영역 보기 — ${insetOn ? '켬' : '끔'}`, insetOn)}</div>}
    <div className="zoom"><button type="button">{MINUS}</button><button type="button" className="z-pct">100%</button><button type="button">{PLUS}</button></div>
  </div>;
}

function Sheet({ theme }: { theme: 'light' | 'dark' }) {
  const set = (k: Key, o: number, folded: boolean, on: boolean) =>
    <Dock rotate={ROTATE[k].art} orientation={ORIENTATIONS[o]} fold={folded ? [FOLD[k].unfold, '펼치기'] : [FOLD[k].fold, '접기']} hingeOn={on} inset={INSET[k].art} insetOn={on} />;
  return <section className="di-sheet" data-theme={theme}>
    <h2>{theme === 'light' ? '라이트' : '다크'}</h2>

    <div>
      <h3>독 한 줄 — 실제 크기</h3>
      <div className="di-docks">
        <div className="di-row"><span className="di-tag">지금</span><Dock labels rotate={NOW.rotate} orientation={ORIENTATIONS[1]} fold={[NOW.fold, '접기']} /></div>
        <div className="di-row"><span className="di-tag">A 묶음</span>{set('A', 1, false, true)}</div>
        <div className="di-row"><span className="di-tag">B 묶음 ✓</span>{set('B', 1, false, true)}</div>
        <div className="di-row"><span className="di-tag">C 묶음</span>{set('C', 1, false, true)}</div>
        <div className="di-row"><span className="di-tag">B · 접힘 · 끔</span>{set('B', 2, true, false)}</div>
      </div>
      <p className="di-note">묶음은 보기 좋게 세운 것입니다. 그림마다 따로 고를 수 있습니다(예: 돌리기 B · 접기 B · 인셋 A). 버튼에 손을 올리면 title 이 뜹니다.</p>
    </div>

    <div>
      <h3>돌리기 — 세로 · 가로 왼쪽 · 가로 오른쪽</h3>
      <div className="di-cands">{KEYS.map(k => <div className="di-cand" key={k}>
        <span className="di-tag">{ROTATE[k].name}</span>
        <span className="di-chip di-icons">{ORIENTATIONS.map(([o, name]) => <span className="orientation-pick" key={o}>{
          <button className="tb-btn" type="button" data-orientation={o} title={`${name} — 방향 바꾸기`} aria-label={`${name} — 방향 바꾸기`}>{ROTATE[k].art}{CHEVRON}</button>}</span>)}
        </span>
        <p>{ROTATE[k].why}</p>
      </div>)}</div>
    </div>

    <div>
      <h3>접기 · 펼치기</h3>
      <div className="di-cands">{KEYS.map(k => <div className="di-cand" key={k}>
        <span className="di-tag">{FOLD[k].name}</span>
        <span className="di-chip">{btn(FOLD[k].fold, '접기')}{btn(FOLD[k].unfold, '펼치기')}</span>
        <p>{FOLD[k].why}</p>
      </div>)}</div>
      <p className="di-note">왼쪽이 접기(펼친 기기에서 보임), 오른쪽이 펼치기(접힌 기기에서 보임).</p>
    </div>

    <div>
      <h3>인셋 영역 보기 — 끔 · 켬(눌린 모양)</h3>
      <div className="di-cands">{KEYS.map(k => <div className="di-cand" key={k}>
        <span className="di-tag">{INSET[k].name}</span>
        <span className="di-chip">{btn(INSET[k].art, '인셋 영역 보기 — 끔', false)}{btn(INSET[k].art, '인셋 영역 보기 — 켬', true)}</span>
        <p>{INSET[k].why}</p>
      </div>)}</div>
      <p className="di-note">이 토글은 다음 Sub-Task(인셋 오버레이 토글)가 붙입니다. 여기서는 그림만 고릅니다.</p>
    </div>

    <div>
      <h3>그대로 두는 그림 — 힌지 선 · 시스템 UI(끔 · 켬)</h3>
      <div className="di-row">
        <span className="di-chip">{btn(NOW.hinge, '힌지 선 보이기', false)}{btn(NOW.hinge, '힌지 선 숨기기', true)}</span>
        <span className="di-chip">{btn(NOW.bars, '시스템 UI — 끔', false)}{btn(NOW.bars, '시스템 UI — 켬', true)}</span>
      </div>
      <p className="di-note">글자만 빼고 그림은 지금 것을 씁니다. 시스템 UI 토글은 기기가 아닌 크기(@Preview · 프리셋 · 커스텀)에서만 뜹니다.</p>
    </div>

    <div>
      <h3>크게 보기(2배)</h3>
      <div className="di-row">
        {KEYS.map(k => <span className="di-big" key={k}>{ROTATE[k].art}{FOLD[k].fold}{FOLD[k].unfold}{INSET[k].art}</span>)}
      </div>
    </div>
  </section>;
}

export const Candidates: Story = { name: '후보', render: () => <WorkspaceBody><div className="di-sheets"><Sheet theme="light" /><Sheet theme="dark" /></div></WorkspaceBody> };
