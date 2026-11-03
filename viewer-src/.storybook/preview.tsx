import type { Preview } from '@storybook/react-vite';
import '../../plugin/viewer/tokens.css';
import '../stories/stories.css';

const preview: Preview = {
  parameters: { layout: 'fullscreen' },
  globalTypes: {
    theme: { toolbar: { title: 'Theme', items: ['system', 'light', 'dark'] } },
    language: { toolbar: { title: 'Language', items: ['en', 'ko'] } },
  },
  initialGlobals: { theme: 'system', language: 'en' },
  decorators: [(Story, context) => <div className="story-surface" lang={context.globals.language} data-theme={context.globals.theme}><Story /></div>],
};
export default preview;
