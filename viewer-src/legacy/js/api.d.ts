import type { PreviewFile } from '../../src/match';

export function post(path: string, body?: unknown): Promise<Response>;
export function get(url: string): Promise<Response>;
export function fetchPreviewFiles(): Promise<{ ready: boolean; files: PreviewFile[] }>;
