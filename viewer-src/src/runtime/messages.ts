import type { Message } from '../state';

export function createMessages(dict: Record<string, string>) {
  function phrase(key: string, args: Record<string, unknown> = {}): string {
    const text = (args.n === 1 && dict[key + '.one']) || dict[key];
    if (text == null) { console.error('prevue: 사전에 없는 키', key); return key; }
    return text.replace(/\{(\w+)\}/g, (match, name) => name in args ? String(args[name]) : match);
  }
  function daemonText(value: Message | number | boolean | null | undefined): string {
    if (value == null) return '';
    if (typeof value !== 'object') return String(value);
    const args = Object.fromEntries(Object.entries(value.a || {}).map(([key, arg]) => [key, typeof arg === 'object' && arg !== null ? daemonText(arg) : arg]));
    return phrase(value.t, args);
  }
  return { phrase, daemonText };
}
