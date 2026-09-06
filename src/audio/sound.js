/** Original synthesized motifs and effects; no third-party recordings. */
export class AudioManager {
  constructor() {
    this.settings = { master: 0.6, music: 0.3, sfx: 0.7, ui: 0.5 };
    this.mode = "menu";
    this.clock = 0;
    this.beat = 0;
    this.active = false;
  }
  unlock() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
    }
    this.ctx.resume().catch(() => {});
    this.master.gain.value = this.settings.master;
  }
  tone(freq, duration = 0.12, volume = 0.15, type = "sine", bus = "sfx") {
    if (!this.ctx || this.ctx.state !== "running") return;
    const t = this.ctx.currentTime,
      o = this.ctx.createOscillator(),
      a = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(
      Math.max(30, freq * 0.65),
      t + duration,
    );
    a.gain.setValueAtTime(0.001, t);
    a.gain.linearRampToValueAtTime(volume * this.settings[bus], t + 0.006);
    a.gain.exponentialRampToValueAtTime(0.001, t + duration);
    o.connect(a);
    a.connect(this.master);
    o.start(t);
    o.stop(t + duration + 0.02);
    o.onended = () => {
      o.disconnect();
      a.disconnect();
    };
  }
  play(name) {
    const map = {
      attack: [160, 0.13, 0.15, "sawtooth"],
      hit: [85, 0.1, 0.18, "triangle"],
      skill: [650, 0.4, 0.14, "sine"],
      dodge: [420, 0.16, 0.12, "triangle"],
      hurt: [70, 0.2, 0.2, "square"],
      death: [50, 1, 0.16, "triangle"],
      drop: [880, 0.3, 0.15, "sine"],
      pickup: [1200, 0.18, 0.12, "sine"],
      legendary: [1300, 0.8, 0.2, "sine"],
      wood: [110, 0.12, 0.16, "sawtooth"],
      stone: [65, 0.2, 0.16, "triangle"],
      metal: [720, 0.3, 0.12, "square"],
      ui: [560, 0.08, 0.08, "sine"],
      warning: [180, 0.2, 0.12, "sine"],
    };
    this.tone(...(map[name] || map.skill), name === "ui" ? "ui" : "sfx");
  }
  update(dt, mode, active) {
    this.mode = mode;
    this.active = active;
    if (this.master) this.master.gain.value = this.settings.master;
    if (!active) return;
    this.clock -= dt;
    if (this.clock <= 0) {
      this.clock = mode === "boss" ? 0.25 : mode === "combat" ? 0.4 : 0.7;
      const notes =
        mode === "boss"
          ? [110, 130.81, 164.81, 146.83, 110, 196, 164.81, 130.81]
          : [146.83, 220, 293.66, 329.63, 220, 196, 293.66, 220];
      this.tone(
        notes[this.beat++ % notes.length],
        this.clock * 1.8,
        0.07,
        "sine",
        "music",
      );
      if (this.beat % 4 === 0) this.tone(55, 0.7, 0.04, "triangle", "music");
    }
  }
}
