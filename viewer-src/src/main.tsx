import { drawLegacy, startViewer } from '../legacy/js/main.js';
import { createViewerRoot } from './ViewerRoot';

const viewer = createViewerRoot(drawLegacy);
startViewer(viewer.apply);
