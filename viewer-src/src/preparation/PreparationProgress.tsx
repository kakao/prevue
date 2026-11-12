import { useMessages } from '../messages';

// 단계 · 지금 하는 일 · 경과 · 네 칸 막대(준비 · 환경 · 그리기 · 완료, D-102). 글과 칸의 --fill 은 장면 컨트롤러가 바꾼다 —
// 바뀐 제목만 전환하고 fit() 이 바로 뒤에 이 영역의 높이를 재므로 React 의 다시 그리기를 거치지 않는다.
// 실패 화면에는 다시 시도 버튼이 없다 — 다시 요청하라는 안내만 둔다.
export function PreparationProgress() {
  const { phrase } = useMessages();
  return <section className="loading-copy">
    <h1 id="headline" role="status" aria-live="polite">{phrase('prep.phase.project')}</h1>
    <p id="detail">{phrase('prep.detail')}</p>
    <p className="now"><span id="now"></span>{' · '}<span className="clock" id="clock"></span></p>
    <div className="prep-progress" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    <div className="failure-help" hidden>
      <span>{phrase('prep.help.lead')}</span>
      <p>{phrase('prep.help.ask')}</p>
    </div>
  </section>;
}
