import { phrase } from '../../legacy/js/strings.js';
import { createScene } from './entry-scene';
import type { Scene } from './scene';

// js/preparation-start.js — prepare.html 의 진입점. 데몬이 뜨기 전 준비 서버의 요청 상태를 읽다가, 데몬 뷰어 주소가 오면
// 지금 단계와 그 시작 시각을 실어 넘긴다 — 넘어간 뒤 막대 칸이 다시 차지 않는다.
type PreparationRequest = { id: string; phase: string; viewer?: string; error?: string; errorKey?: string; file?: string; started?: number };

const id = new URL(location.href).searchParams.get('id') ?? '';
let scene: Scene | undefined;
async function poll() {
  try {
    const response = await fetch(`/preparation/${encodeURIComponent(id)}`);
    if (!response.ok) throw Error(phrase('prep.poll.failed'));
    const state: PreparationRequest = await response.json();
    if (state.id !== id) throw Error(phrase('prep.poll.changed'));
    scene ||= createScene(state.phase === 'failure' ? { ...state, phase: undefined } : state);
    if (state.phase === 'failure') { scene.fail(state.errorKey ? phrase(state.errorKey) : state.error ?? ''); return; }
    scene.setPhase(state.phase);
    if (state.viewer) {
      const target = new URL(state.viewer);
      target.searchParams.set('phase', state.phase);
      target.searchParams.set('phaseStarted', String(scene.phaseStarted));
      location.replace(target.href);
      return;
    }
    setTimeout(poll, 200);
  } catch (error) {
    scene ||= createScene({});
    scene.fail((error as Error).message + ' ' + phrase('prep.retry'));
  }
}
poll();
