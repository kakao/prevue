import type { Preparation } from '../../src/preparation/PreparationScreen';
import type { ViewerState } from '../../src/state';

export type Connection = 'restarting' | 'lost';
export function drawLegacy(state: ViewerState): void;
export function startViewer(render: (state: ViewerState, holdStatus: boolean) => void, onConnection: (connection: Connection) => void, onPreviewFiles: () => void, prepared?: Preparation | null): void;
