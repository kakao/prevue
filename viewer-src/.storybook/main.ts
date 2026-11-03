import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../stories/**/*.stories.tsx'],
  core: { disableTelemetry: true },
  viteFinal: config => ({
    ...config,
    // light-dark()를 낮추면 루트에서 풀린 값이 자식 테마에도 남는다.
    build: { ...config.build, cssTarget: ['chrome123', 'safari17.5', 'firefox120'] },
  }),
};
export default config;
