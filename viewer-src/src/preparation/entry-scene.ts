import { daemonText, phrase } from '../../legacy/js/strings.js';
import { mountScene, type SceneRequest } from './scene';

// js/preparation-scene.js — 준비 페이지와 뷰어가 함께 쓰고, 브라우저 검사가 이 주소를 직접 import 한다(tests/viewer/preparation.mjs).
// 사전은 실행 때 받은 것(strings.js)이다. Storybook 은 mountScene 에 제 사전을 넘긴다.
export { handoffMs, sceneEasing, sceneMs } from './scene';
export const createScene = (initial: SceneRequest) => mountScene({ phrase, daemonText }, initial);
