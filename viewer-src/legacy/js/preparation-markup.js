import { phrase } from './strings.js';

export const markup = `    <div class="prep-bar" aria-hidden="true">
      <svg viewBox="0 0 240 240"><polygon points="120,40 189.3,80 120,120 50.7,80" fill="currentColor"/><polygon points="189.3,80 189.3,160 120,200 120,120" fill="currentColor" opacity=".62"/><polygon points="50.7,80 120,120 120,200 50.7,160" fill="currentColor" opacity=".34"/><path d="M14 44V14H44M14 196V226H44M226 44V14H196M226 196V226H196" fill="none" stroke="currentColor" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <span>Prevue</span>
    </div>
    <section class="scene" aria-label="${phrase('prep.scene')}">
      <div class="floor" aria-hidden="true"></div>
      <div class="assembly">
        <div class="layer layer-front">
          <div class="drift"><div class="pane">
            <div class="screen-outline" aria-hidden="true"></div>
            <div class="blueprint" aria-hidden="true">
              <div class="piece piece-cover"><div class="solid"><div class="cover-art"><span class="art-wave"></span><span class="art-orbit"></span><span class="art-dot"></span><span class="art-pill"></span></div></div></div>
              <div class="piece piece-title"><div class="solid"><span class="title-lines"><i></i><i></i></span></div></div>
              <div class="piece piece-action"><div class="solid"><svg viewBox="0 0 24 24"><path d="M7 4h10v16l-5-3-5 3Z"/></svg></div></div>
              <div class="piece piece-meta"><div class="solid"></div></div>
              <div class="piece piece-copy"><div class="solid"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div></div>
              <div class="piece piece-tag"><div class="solid"></div></div>
            </div>
            <img class="preview" alt="${phrase('prep.image')}" draggable="false">
          </div></div>
        </div>
      </div>
    </section>

    <section class="loading-copy">
      <h1 id="headline" role="status" aria-live="polite">${phrase('prep.phase.project')}</h1>
      <p id="detail">${phrase('prep.detail')}</p>
      <p class="now"><span id="now"></span> · <span class="clock" id="clock"></span></p>
      <div class="prep-progress" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      <div class="failure-help" hidden>
        <span>${phrase('prep.help.lead')}</span>
        <p>${phrase('prep.help.ask')}</p>
      </div>
    </section>

`;
