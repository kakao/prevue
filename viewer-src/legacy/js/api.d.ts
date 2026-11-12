import type { PreviewFile } from '../../src/match';

export function post(path: string, body?: unknown): Promise<Response>;
export function get(url: string): Promise<Response>;
export function fetchPreviewFiles(): Promise<{ ready: boolean; files: PreviewFile[] }>;
export function viewerStream(url: string): string;
export function reportStreamWidth(width: number): Promise<Response>;
export function fetchProjectFiles(): Promise<{ files?: Record<string, string[]> }>;
export function connect(handlers: { open(): void; state(state: import('../../src/state').ViewerState): void; ui(event: { kind: string; text?: import('../../src/state').Message }): void; error(event: Event): void }): void;
