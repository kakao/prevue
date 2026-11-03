import type { Message } from '../../src/state';

export function createMessages(dict: Record<string, string>): {
  phrase(key: string, args?: Record<string, unknown>): string;
  daemonText(value: Message | number | boolean | null): string;
};
