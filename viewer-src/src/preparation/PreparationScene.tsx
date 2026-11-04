import { useMessages } from '../messages';

// 워드마크 줄은 인라인 SVG다 — 준비 서버는 헤더 마크업 · 그림 파일을 내주지 않는다.
export function PreparationBar() {
  return <div className="prep-bar" aria-hidden="true">
    <svg viewBox="0 0 240 240">
      <polygon points="120,40 189.3,80 120,120 50.7,80" fill="currentColor" />
      <polygon points="189.3,80 189.3,160 120,200 120,120" fill="currentColor" opacity=".62" />
      <polygon points="50.7,80 120,120 120,200 50.7,160" fill="currentColor" opacity=".34" />
      <path d="M14 44V14H44M14 196V226H44M226 44V14H196M226 196V226H196" fill="none" stroke="currentColor" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <span>Prevue</span>
  </div>;
}

// 준비 중에는 조각 모형이, 다 그리면 그 자리에 실제 PNG(.preview)가 선다. 움직임 값은 장면 컨트롤러가 요소에 직접 쓴다.
export function PreparationScene() {
  const { phrase } = useMessages();
  return <section className="scene" aria-label={phrase('prep.scene')}>
    <div className="floor" aria-hidden="true"></div>
    <div className="assembly">
      <div className="layer layer-front">
        <div className="drift"><div className="pane">
          <div className="screen-outline" aria-hidden="true"></div>
          <div className="blueprint" aria-hidden="true">
            <div className="piece piece-cover"><div className="solid"><div className="cover-art"><span className="art-wave"></span><span className="art-orbit"></span><span className="art-dot"></span><span className="art-pill"></span></div></div></div>
            <div className="piece piece-title"><div className="solid"><span className="title-lines"><i></i><i></i></span></div></div>
            <div className="piece piece-action"><div className="solid"><svg viewBox="0 0 24 24"><path d="M7 4h10v16l-5-3-5 3Z" /></svg></div></div>
            <div className="piece piece-meta"><div className="solid"></div></div>
            <div className="piece piece-copy"><div className="solid"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div></div>
            <div className="piece piece-tag"><div className="solid"></div></div>
          </div>
          <img className="preview" alt={phrase('prep.image')} draggable={false} />
        </div></div>
      </div>
    </div>
  </section>;
}
