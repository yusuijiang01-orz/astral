const LEVELS = ["low", "medium", "high", "ultra"];
export const QUALITY_PROFILES = Object.freeze({
  low: {
    dpr: 1,
    shadow: 512,
    bloomScale: 0.4,
    particleDensity: 0.4,
    grassDensity: 0.4,
    lodBias: 1.5,
  },
  medium: {
    dpr: 1.4,
    shadow: 1024,
    bloomScale: 0.5,
    particleDensity: 0.65,
    grassDensity: 0.7,
    lodBias: 1.2,
  },
  high: {
    dpr: 1.7,
    shadow: 1536,
    bloomScale: 0.65,
    particleDensity: 0.85,
    grassDensity: 0.85,
    lodBias: 1,
  },
  ultra: {
    dpr: 2,
    shadow: 2048,
    bloomScale: 0.75,
    particleDensity: 1,
    grassDensity: 1,
    lodBias: 0.85,
  },
});
/** Hysteresis adapts visual cost only; never mutates enemies, gameplay or saved preferences. */
export class QualityManager {
  constructor(onChange = () => {}) {
    this.onChange = onChange;
    this.settings = {
      quality: "medium",
      scale: 1,
      shadows: true,
      bloom: true,
      aa: true,
      particles: true,
    };
    this.tier = 1;
    this.step = 0;
    this.frames = 0;
    this.elapsed = 0;
    this.bad = 0;
    this.good = 0;
    this.metrics = {
      fps: 60,
      frameMs: 16.67,
      drawCalls: 0,
      triangles: 0,
      activeParticles: 0,
      activeEnemies: 0,
    };
  }
  configure(settings) {
    this.settings = { ...this.settings, ...settings };
    this.tier = Math.max(0, LEVELS.indexOf(this.settings.quality));
    this.step = 0;
    this.bad = 0;
    this.good = 0;
    this.elapsed = 0;
    this.frames = 0;
    this.publish();
  }
  profile() {
    const base = QUALITY_PROFILES[LEVELS[this.tier]];
    return {
      ...base,
      scale: Math.max(0.5, Number(this.settings.scale) || 1),
      shadow: this.step >= 2 ? 512 : base.shadow,
      grassDensity: Math.max(
        0.2,
        base.grassDensity * (this.step >= 1 ? 0.6 : 1),
      ),
      particleDensity:
        this.settings.particles === false
          ? 0
          : base.particleDensity * (this.step >= 3 ? 0.7 : 1),
      bloomScale: base.bloomScale * (this.step >= 4 ? 0.75 : 1),
      dpr: base.dpr * (this.step >= 5 ? 0.8 : 1),
      lodBias: base.lodBias * (this.step >= 1 ? 1.25 : 1),
      shadows: this.settings.shadows !== false,
      bloom: this.settings.bloom !== false,
      aa: this.settings.aa !== false,
    };
  }
  publish() {
    this.onChange(this.profile());
  }
  sample(seconds, telemetry = {}, active = true) {
    if (
      !active ||
      !Number.isFinite(seconds) ||
      seconds <= 0 ||
      seconds > 0.25
    ) {
      this.frames = 0;
      this.elapsed = 0;
      return false;
    }
    this.elapsed += seconds;
    this.frames++;
    Object.assign(this.metrics, telemetry);
    if (this.elapsed < 2) return false;
    this.metrics.fps = this.frames / this.elapsed;
    this.metrics.frameMs = (this.elapsed * 1000) / this.frames;
    this.frames = 0;
    this.elapsed = 0;
    this.bad = this.metrics.fps < 45 ? this.bad + 1 : 0;
    this.good = this.metrics.fps > 57 ? this.good + 1 : 0;
    if (this.bad >= 2 && this.step < 5) {
      this.step++;
      this.bad = 0;
      this.good = 0;
      this.publish();
      return true;
    }
    if (this.good >= 10 && this.step > 0) {
      this.step--;
      this.good = 0;
      this.publish();
      return true;
    }
    return false;
  }
}
