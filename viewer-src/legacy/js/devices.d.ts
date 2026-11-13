// 본체는 plugin/devices 스펙에서 만드는 devices.js 다(generate-devices.mjs) — 타입만 여기 둔다.
export type DeviceBody = { tone: string; bezel: number; radius: number; cam: { w: number; h: number; y: number; x?: number }; btn: { side: 1 | -1; at: number; len: number }[] };
export type DevicePanel = { w: number; h: number; hinge?: number };
export type DeviceEntry = {
  name: string; short: string; fold: boolean; bar: 'aosp' | 'oneui' | 'pixel' | 'ios';
  open: DevicePanel; cover?: DevicePanel;
  look: { open: DeviceBody; cover?: DeviceBody };
  status?: { top: number; right: number; s: number; time: { cx: number; base: number; size: number } };
};
export const DEVICES: Record<string, DeviceEntry>;
export const DEVICE_MENU: { group: string; ids: string[] }[];
