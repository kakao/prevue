import type { Message } from '../../src/state';

export function phrase(key: string, args?: Record<string, unknown>): string;
export function daemonText(value: Message | number | boolean | null): string;
