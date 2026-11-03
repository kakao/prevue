import type { Preview } from '@storybook/react-vite';
import '../../plugin/viewer/tokens.css';
import '../stories/stories.css';
import en from '../../plugin/viewer/strings/en.json';
import ko from '../../plugin/viewer/strings/ko.json';
import { createMessages, MessagesContext } from '../src/messages';

const messages = { en: createMessages(en), ko: createMessages(ko) };

const preview: Preview = {
  parameters: { layout: 'fullscreen' },
  globalTypes: {
    theme: { toolbar: { title: 'Theme', items: ['system', 'light', 'dark'] } },
    language: { toolbar: { title: 'Language', items: ['en', 'ko'] } },
  },
  initialGlobals: { theme: 'system', language: 'en' },
  decorators: [(Story, context) => <MessagesContext.Provider value={messages[context.globals.language as 'en' | 'ko'] ?? messages.en}>
    <div className="story-surface" lang={context.globals.language} data-theme={context.globals.theme}><Story /></div>
  </MessagesContext.Provider>],
};
export default preview;
