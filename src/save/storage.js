const KEY = "astral-rift-save-v1";
export const defaultSettings = {
  quality: "medium",
  scale: 1,
  shadows: true,
  particles: true,
  bloom: true,
  aa: true,
  master: 0.6,
  music: 0.3,
  sfx: 0.7,
  ui: 0.5,
  joystick: 1,
  buttons: 1,
  sensitivity: 1,
  vibration: true,
};
export class SaveManager {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    this.error = null;
  }
  read() {
    try {
      const data = JSON.parse(this.storage.getItem(KEY) || "null");
      if (!data || data.version !== 1) return null;
      if (!data.settings || !data.meta) return null;
      return data;
    } catch (e) {
      this.error = "存档损坏或不可读取";
      return null;
    }
  }
  write(data) {
    try {
      this.storage.setItem(KEY, JSON.stringify({ version: 1, ...data }));
      this.error = null;
      return true;
    } catch (e) {
      this.error = "存档空间不足或浏览器禁止保存";
      return false;
    }
  }
}
