import { clamp } from "../core/runtime.js";
export class Controls {
  constructor(canvas, action) {
    this.keys = new Set();
    this.axis = { x: 0, z: 0 };
    this.look = { yaw: 0, pitch: 0 };
    this.enabled = false;
    this.action = action;
    this.joy = document.querySelector("#joystick");
    this.knob = document.querySelector("#knob");
    this.points = new Map();
    window.addEventListener("keydown", (e) => {
      if (
        ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
          e.code,
        )
      )
        e.preventDefault();
      this.keys.add(e.code);
      if (!e.repeat) {
        const a = {
          Space: "attack",
          KeyJ: "attack",
          ShiftLeft: "dodge",
          KeyK: "dodge",
          Digit1: "s0",
          Digit2: "s1",
          Digit3: "s2",
          Digit4: "s3",
          KeyR: "s4",
          KeyE: "interact",
          Escape: "pause",
          KeyI: "inventory",
          KeyP: "debug",
        }[e.code];
        if (a) this.action(a);
      }
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    window.addEventListener("blur", () => {
      this.reset();
      this.action("blur");
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.reset();
        this.action("blur");
      }
    });
    this.joy.addEventListener("pointerdown", (e) => {
      if (!this.enabled) return;
      this.joy.setPointerCapture(e.pointerId);
      this.joyId = e.pointerId;
      this.move(e);
    });
    this.joy.addEventListener("pointermove", (e) => {
      if (e.pointerId === this.joyId) this.move(e);
    });
    for (const evt of ["pointerup", "pointercancel", "lostpointercapture"])
      this.joy.addEventListener(evt, (e) => {
        if (e.pointerId === this.joyId) {
          this.joyId = null;
          this.axis = { x: 0, z: 0 };
          this.knob.style.transform = "translate(-50%,-50%)";
        }
      });
    document.querySelectorAll("[data-action]").forEach((b) =>
      b.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        b.setPointerCapture(e.pointerId);
        this.action(b.dataset.action);
      }),
    );
    canvas.addEventListener("pointerdown", (e) => {
      if (this.enabled && e.clientX > innerWidth * 0.4) {
        this.points.set(e.pointerId, { x: e.clientX, y: e.clientY });
        canvas.setPointerCapture(e.pointerId);
      }
    });
    canvas.addEventListener("pointermove", (e) => {
      const p = this.points.get(e.pointerId);
      if (p) {
        this.look.yaw = clamp(
          this.look.yaw + (e.clientX - p.x) * 0.003 * (this.sensitivity || 1),
          -0.45,
          0.45,
        );
        this.look.pitch = clamp(
          this.look.pitch + (e.clientY - p.y) * 0.002,
          -0.15,
          0.2,
        );
        p.x = e.clientX;
        p.y = e.clientY;
      }
    });
    for (const evt of ["pointerup", "pointercancel"])
      canvas.addEventListener(evt, (e) => this.points.delete(e.pointerId));
  }
  move(e) {
    const r = this.joy.getBoundingClientRect(),
      max = r.width * 0.34;
    let x = e.clientX - r.left - r.width / 2,
      z = e.clientY - r.top - r.height / 2;
    const d = Math.hypot(x, z);
    if (d > max) {
      x *= max / d;
      z *= max / d;
    }
    this.axis = {
      x: d < max * 0.12 ? 0 : x / max,
      z: d < max * 0.12 ? 0 : z / max,
    };
    this.knob.style.transform = `translate(calc(-50% + ${x}px),calc(-50% + ${z}px))`;
  }
  vector() {
    if (!this.enabled) return { x: 0, z: 0 };
    let x =
        this.axis.x +
        (this.keys.has("KeyD") || this.keys.has("ArrowRight") ? 1 : 0) -
        (this.keys.has("KeyA") || this.keys.has("ArrowLeft") ? 1 : 0),
      z =
        this.axis.z +
        (this.keys.has("KeyS") || this.keys.has("ArrowDown") ? 1 : 0) -
        (this.keys.has("KeyW") || this.keys.has("ArrowUp") ? 1 : 0);
    const d = Math.hypot(x, z);
    return d > 1 ? { x: x / d, z: z / d } : { x, z };
  }
  reset() {
    this.keys.clear();
    this.points.clear();
    this.axis = { x: 0, z: 0 };
    this.joyId = null;
    if (this.knob) this.knob.style.transform = "translate(-50%,-50%)";
  }
}
