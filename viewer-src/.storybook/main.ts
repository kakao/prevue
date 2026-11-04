import type { StorybookConfig } from '@storybook/react-vite';
import { fileURLToPath } from 'node:url';

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../stories/**/*.stories.tsx'],
  core: { disableTelemetry: true },
  viteFinal: config => ({
    ...config,
    // 장면 본체는 손으로 고치는 plugin/viewer/js/resize-scene.js 하나다 — 뷰어 번들처럼 타입만 legacy/js 에 두고 본체를 그 주소에서 부른다.
    resolve: { ...config.resolve, alias: [
      ...(Array.isArray(config.resolve?.alias) ? config.resolve.alias : Object.entries(config.resolve?.alias ?? {}).map(([find, replacement]) => ({ find, replacement }))),
      { find: /^(?:\.\.\/)+legacy\/js\/resize-scene\.js$/, replacement: fileURLToPath(new URL('../../plugin/viewer/js/resize-scene.js', import.meta.url)) },
    ] },
    // light-dark()를 낮추면 루트에서 풀린 값이 자식 테마에도 남는다.
    build: { ...config.build, cssTarget: ['chrome123', 'safari17.5', 'firefox120'] },
  }),
};
export default config;
