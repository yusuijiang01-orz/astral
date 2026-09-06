/** Deterministic simulation primitives, independent of rendering. */
export class EventBus {
  constructor() {
    this.listeners = new Map();
  }
  on(name, fn) {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    this.listeners.get(name).add(fn);
    return () => this.listeners.get(name)?.delete(fn);
  }
  emit(name, data) {
    this.listeners.get(name)?.forEach((fn) => fn(data));
  }
}
export class Random {
  constructor(seed = Date.now()) {
    this.seed = seed >>> 0;
  }
  next() {
    this.seed = (Math.imul(1664525, this.seed) + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
  pick(a) {
    return a[Math.floor(this.next() * a.length)];
  }
  range(a, b) {
    return a + (b - a) * this.next();
  }
}
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export const toward = (a, b) => {
  const d = distance(a, b) || 1;
  return { x: (b.x - a.x) / d, z: (b.z - a.z) / d };
};
export class Pool {
  constructor(size, factory) {
    this.items = Array.from({ length: size }, factory);
  }
  take() {
    return this.items.find((p) => !p.active);
  }
  clear() {
    for (const p of this.items) p.active = false;
  }
}
