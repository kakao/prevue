// 생성물이다. viewer.state.*.json을 고치고 sh tools/gen-viewer.sh로 만든다.
export type ContractState = {
"board": {
"file": string;
"focus": number;
"gen": number;
"groups": Array<{
"cards": Array<{
"args": string;
"dpGuess": boolean;
"failure": null;
"heightDp": number;
"imageUrl": string;
"index": number;
"isFocus": boolean;
"label": string;
"ok": boolean;
"previewId": string;
"rendered": boolean;
"specs": Array<{
"kind": string;
"text": string;
}>;
"stale": boolean;
"title": string;
"treeUrl": string;
"widthDp": number;
}>;
"failed": number;
"name": string;
}>;
};
"boardNote": {
"a": {
"file": string;
"n": number;
};
"t": string;
};
"buildPending": boolean;
"busy": boolean;
"choice": null | {
"candidates": Array<string>;
"fileName": string;
"line": number;
"repoRoot": string;
};
"error": null;
"focus": null | {
"deviceInsets": null | {
"basisPosture": string;
"evidence": {
"kind": string;
"source": string;
"sourceUrl": string;
};
"posture": string;
"values": {
"captionBar": {
"bottom": number;
"left": number;
"right": number;
"top": number;
};
"displayCutout": {
"bottom": number;
"left": number;
"right": number;
"top": number;
};
"navigationBars": {
"bottom": number;
"left": number;
"right": number;
"top": number;
};
"statusBars": {
"bottom": number;
"left": number;
"right": number;
"top": number;
};
"systemOverlays": {
"bottom": number;
"left": number;
"right": number;
"top": number;
};
};
};
"fn": string;
"imageUrl": string;
"interactive": boolean;
"name": null;
"postures": Array<{
"imageUrl": string;
"size": {
"device": string;
"dpi": number;
"folded": boolean;
"heightDp": number;
"heightPx": number;
"hingeDp": null | number;
"insetProfile": {
"evidence": {
"capturedAt": null | string;
"conditions": {
"android": string;
"buildId": string;
"checkedAt": string;
"densityDpi": string;
"displayZoom": string;
"fontScale": string;
"horizontalToolbar": string;
"innerCamera": string;
"ios": string;
"multiWindow": string;
"navigation": string;
"oneUi": string;
"orientation": string;
"pose": string;
"resolutionPx": string;
"rotation": string;
"scale": string;
"sdk": string;
"sourceSha256": string;
"splitView": string;
"unit": string;
};
"kind": string;
"source": string;
"sourceUrl": string;
};
"measured": null | {
"captionBar": {
"bottom": number;
"left": number;
"right": number;
"top": number;
};
"displayCutout": {
"bottom": number;
"left": number;
"right": number;
"top": number;
};
"navigationBars": {
"bottom": number;
"left": number;
"right": number;
"top": number;
};
"statusBars": {
"bottom": number;
"left": number;
"right": number;
"top": number;
};
};
"safeArea": {
"bottom": number;
"left": number;
"right": number;
"top": number;
};
};
"kind": string;
"landscape": boolean;
"name": string;
"orientation": string;
"preset": string;
"widthDp": number;
"widthPx": number;
};
}>;
"previewId": string;
"pxPerDp": number;
"size": null | {
"device": string;
"dpi": number;
"folded": boolean;
"heightDp": number;
"heightPx": number;
"hingeDp": null;
"insetProfile": {
"evidence": {
"capturedAt": null | string;
"conditions": {
"android"?: string;
"buildId"?: string;
"checkedAt"?: string;
"densityDpi"?: string;
"fontScale"?: string;
"horizontalToolbar"?: string;
"innerCamera"?: string;
"multiWindow"?: string;
"navigation"?: string;
"oneUi"?: string;
"orientation"?: string;
"pose"?: string;
"resolutionPx": string;
"rotation"?: string;
"scale"?: string;
"sdk"?: string;
"sourceSha256"?: string;
"splitView"?: string;
"unit"?: string;
};
"kind": string;
"source": string;
"sourceUrl": string;
};
"measured": null | {
"captionBar": {
"bottom": number;
"left": number;
"right": number;
"top": number;
};
"displayCutout": {
"bottom": number;
"left": number;
"right": number;
"top": number;
};
"navigationBars": {
"bottom": number;
"left": number;
"right": number;
"top": number;
};
"statusBars": {
"bottom": number;
"left": number;
"right": number;
"top": number;
};
};
"safeArea": {
"bottom": number;
"left": number;
"right": number;
"top": number;
};
};
"kind": string;
"landscape": boolean;
"name": string;
"orientation": string;
"widthDp": number;
"widthPx": number;
};
"streamUrl": string;
"systemUi": {
"annotated": boolean;
"bars": null | {
"insets": null | {
"kind": string;
"navDp": number;
"source": string;
"sourceUrl": string;
"statusDp": number;
};
"look": string;
};
"choice": string;
"shown": boolean;
};
"treeUrl": string;
};
"header": {
"branch": null;
"module": string;
"repo": string;
"repoLeaf": string;
"repoPrefix": string;
"sourceSet": null;
"tabTitle": string;
"title": string;
"variant": string;
};
"screen": string;
"selection": {
"at": string;
"bounds": null | {
"h": number;
"w": number;
"x": number;
"y": number;
};
"by": string;
"chain": Array<string>;
"file": string;
"image": string;
"interactive": boolean;
"line": number;
"node": null | string;
"ok": boolean;
"preview": {
"file": string;
"fqn": string;
"index": number;
"methodParams": Array<unknown>;
"params": Record<string, unknown>;
"previewId": string;
};
"ref": string;
"tree": string;
"userChain": Array<string>;
};
"settle": null | {
"a": {
"frames": number;
"tick": number;
};
"t": string;
};
"stale": Array<unknown>;
"tabs": Array<{
"active": boolean;
"dim": string;
"key": string;
"module": null;
"name": string;
"sourceSet": null;
"stale": boolean;
"title": string;
}>;
"timing": Array<{
"head": boolean;
"label": {
"a"?: {
"n": number;
};
"t": string;
};
"ms": number;
"over": boolean;
"text": string;
}>;
"vacant": null;
"version": number;
"who": {
"a": {
"by": string;
"time": string;
"what": string | {
"a": {
"n": number;
};
"t": string;
};
};
"t": string;
};
};
