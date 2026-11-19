import { createContext, useContext } from 'react';
import { createMessages } from './runtime/messages';

export { createMessages };
export type Messages = ReturnType<typeof createMessages>;

export const MessagesContext = createContext<Messages>(createMessages({}));
export const useMessages = () => useContext(MessagesContext);
