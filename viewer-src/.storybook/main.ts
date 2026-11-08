import type { StorybookConfig } from '@storybook/react-vite';
import { fileURLToPath } from 'node:url';

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  // 뷰어에 잇지 않은 시안(prototypes/)도 같은 토큰 · 사전으로 본다.
  stories: ['../stories/**/*.stories.tsx', '../../prototypes/**/*.stories.tsx'],
  core: { disableTelemetry: true },
  viteFinal: config => ({
    ...config,
    // 장면 본체는 손으로 고치는 plugin/viewer/js/resize-scene.js 하나다 — 뷰어 번들처럼 타입만 legacy/js 에 두고 본체를 그 주소에서 부른다.
    // prototypes/ 에는 node_modules 가 없다 — React 는 viewer-src 의 한 벌로 푼다.
    resolve: { ...config.resolve, dedupe: ['react', 'react-dom'], alias: [
      ...(Array.isArray(config.resolve?.alias) ? config.resolve.alias : Object.entries(config.resolve?.alias ?? {}).map(([find, replacement]) => ({ find, replacement }))),
      { find: /^(?:\.\.\/)+legacy\/js\/resize-scene\.js$/, replacement: fileURLToPath(new URL('../../plugin/viewer/js/resize-scene.js', import.meta.url)) },
    ] },
    // light-dark()를 낮추면 루트에서 풀린 값이 자식 테마에도 남는다.
    build: { ...config.build, cssTarget: ['chrome123', 'safari17.5', 'firefox120'] },
  }),
};
export default config;
