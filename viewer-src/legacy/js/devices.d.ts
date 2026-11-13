// 본체는 plugin/devices 스펙에서 만드는 devices.js 다(generate-devices.mjs) — 타입만 여기 둔다.
export type DeviceBody = { tone: string; bezel: number; ends?: number; home?: true; radius: number; cam: { w: number; h: number; y: number; x?: number; notch?: number; edge?: 'right' }; btn: { side: 1 | -1; at: number; len: number }[] };
export type DevicePanel = { w: number; h: number; hinge?: number };
export type DeviceEntry = {
  name: string; short: string; fold: boolean;
  open: DevicePanel; cover?: DevicePanel;
  look: { open: DeviceBody; cover?: DeviceBody };
  plate?: { thickness: number; gap: number; axis: 'width'; blur?: true };
  status?: { top: number; right: number; left?: number; s: number; time: { cx: number; base: number; size: number } };
};
export const DEVICES: Record<string, DeviceEntry>;
export const DEVICE_MENU: { group: string; ids: string[] }[];
