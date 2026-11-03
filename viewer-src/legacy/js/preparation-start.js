import { createScene } from './preparation-scene.js';
import { phrase } from './strings.js';

const id = new URL(location.href).searchParams.get('id');
let scene;
async function poll() {
  try {
    const response = await fetch(`/preparation/${encodeURIComponent(id)}`);
    if (!response.ok) throw Error(phrase('prep.poll.failed'));
    const state = await response.json();
    if (state.id !== id) throw Error(phrase('prep.poll.changed'));
    scene ||= createScene(state.phase === 'failure' ? { ...state, phase: undefined } : state);
    if (state.phase === 'failure') { scene.fail(state.errorKey ? phrase(state.errorKey) : state.error); return; }
    scene.setPhase(state.phase);
    if (state.viewer) {
      const target = new URL(state.viewer);
      target.searchParams.set('phase', state.phase);
      target.searchParams.set('phaseStarted', scene.phaseStarted);
      location.replace(target.href);
      return;
    }
    setTimeout(poll, 200);
  } catch (error) {
    scene ||= createScene({});
    scene.fail(error.message + ' ' + phrase('prep.retry'));
  }
}
poll();
