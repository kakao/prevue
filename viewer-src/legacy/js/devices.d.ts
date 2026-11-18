// 본체는 plugin/devices 스펙에서 만드는 devices.js 다(generate-devices.mjs) — 타입만 여기 둔다.
// cuts 는 배제 상자(상태 줄 · 눈금자 칸이 피한다), cams 는 그릴 모양이다 — 구멍은 위 가장자리 기준 상자로 바뀌어 있다.
export type DeviceCam = { w: number; h: number; y: number; x?: number; notch?: number; edge?: 'right' | 'bottom'; lens?: true };
export type DeviceBody = { tone: string; bezel: number; ends?: number; home?: true; radius: [number, number, number, number]; cuts: DeviceCam[]; cams: DeviceCam[]; btn: { side: 1 | -1; at: number; len: number }[] };
export type DevicePanel = { w: number; h: number; hinge?: number; fixed?: true };
export type DeviceEntry = {
  name: string; short: string; fold: boolean;
  open: DevicePanel; cover?: DevicePanel;
  look: { open: DeviceBody; cover?: DeviceBody };
  plate?: { thickness: number; gap: number; axis: 'width' | 'height'; blur?: true };
};
export const DEVICES: Record<string, DeviceEntry>;
export const DEVICE_MENU: { group: string; ids: string[] }[];
