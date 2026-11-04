import { renderToStaticMarkup } from 'react-dom/server';
import { MessagesContext } from './messages';
import { WorkspacePanel, WorkspaceStage } from './components/WorkspaceShell';

// 빌드가 부른다(build.mjs) — 한 장의 정적 껍데기를 index.html 의 자리 표시에 넣을 마크업으로. 언어는 페이지에서 정해지므로 글은 비우고
// data-t 만 남긴다(strings.js 가 채운다).
const blank = { phrase: () => '', daemonText: () => '' };
const html = (node: React.ReactNode) => renderToStaticMarkup(<MessagesContext.Provider value={blank}>{node}</MessagesContext.Provider>);

export const prerendered = () => ({ stage: html(<WorkspaceStage />), panel: html(<WorkspacePanel />) });
