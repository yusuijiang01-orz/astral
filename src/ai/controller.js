import { distance, toward, clamp } from "../core/runtime.js";
import { bossMoves } from "../data/catalog.js";
/** Decision ticks are independent from animation and motion ticks. */
export class AIController {
  constructor(entity) {
    this.e = entity;
    this.next = 0;
    this.cooldowns = {};
    this.state = "Intro";
    this.timer = 0.8;
    this.phase = 1;
    this.last = "";
    this.scores = {};
    this.decisions = 0;
  }
  set(state, time = 0) {
    this.state = state;
    this.timer = time;
    this.e.aiState = state;
  }
  update(dt, g) {
    const e = this.e,
      p = g.player;
    if (e.hp <= 0) {
      this.set("Death");
      return;
    }
    for (const k in this.cooldowns)
      this.cooldowns[k] = Math.max(0, this.cooldowns[k] - dt);
    if (e.status.freeze > 0) {
      this.set("Stagger", 0.15);
      return;
    }
    this.timer -= dt;
    if (e.kind === "boss") {
      const phase = e.hp / e.maxHp <= 0.4 ? 3 : e.hp / e.maxHp <= 0.7 ? 2 : 1;
      if (phase > this.phase) {
        this.phase = phase;
        e.invulnerable = 1.5;
        this.set("PhaseChange", 1.5);
        g.fx("phase", e, 80);
        g.bus.emit("BOSS_PHASE_CHANGED", phase);
        g.cameraShake = 0.45;
        return;
      }
    }
    if (["Intro", "PhaseChange", "Stagger", "Recover"].includes(this.state)) {
      if (this.timer > 0) return;
      this.set("Observe");
    }
    if (this.state === "Windup") {
      if (this.timer <= 0) {
        g.enemyAttack(e, this.move, this.target);
        this.set("Recover", this.recovery || 1);
      }
      return;
    }
    if (e.dash) {
      e.x += e.dash.x * dt;
      e.z += e.dash.z * dt;
      e.dash.time -= dt;
      if (e.dash.time <= 0) e.dash = null;
      g.clampActor(e);
      return;
    }
    this.next -= dt;
    if (this.next <= 0) {
      const d = distance(e, p);
      this.next =
        d > 22
          ? 0.65
          : e.kind === "boss"
            ? 0.06
            : e.kind === "elite"
              ? 0.09
              : 0.16;
      this.decide(g, d);
      this.decisions++;
    }
    if (this.destination) {
      let v = toward(e, this.destination);
      for (const other of g.enemies) {
        if (other === e || other.hp <= 0) continue;
        const d = distance(e, other);
        if (d > 0 && d < 1.5) {
          v.x += ((e.x - other.x) / d) * (1.5 - d);
          v.z += ((e.z - other.z) / d) * (1.5 - d);
        }
      }
      for (const b of g.props) {
        if (b.hp > 0 && distance(e, b) < b.radius + 1) {
          v.z += (e.z >= b.z ? 1 : -1) * 1.5;
          v.x *= 0.4;
        }
      }
      const n = Math.hypot(v.x, v.z) || 1,
        s = e.speed * (e.status.slow > 0 ? 0.45 : 1);
      e.x += (v.x / n) * s * dt;
      e.z += (v.z / n) * s * dt;
      e.facing = toward(e, p);
      g.clampActor(e);
    }
  }
  wind(g, move, wind, recovery = 1) {
    const e = this.e;
    this.move = move;
    this.target = { x: g.player.x, z: g.player.z };
    this.destination = null;
    this.recovery = recovery;
    this.set("Windup", wind);
    g.telegraph(e, move, this.target, wind);
    g.bus.emit("ENEMY_STATE_CHANGED", { id: e.id, state: "Windup", move });
  }
  decide(g, d) {
    const e = this.e,
      p = g.player,
      v = toward(p, e);
    if (e.kind === "boss") {
      this.boss(g, d);
      return;
    }
    if (e.kind === "elite" && this.elite(g, d)) return;
    const ranged = ["ranged", "caster", "support"].includes(e.kind);
    const allies = g.enemies.filter((a) => a.hp > 0 && a !== e);
    const attacking = g.enemies.filter(
      (a) => a !== e && a.ai.state === "Windup" && a.role === "front",
    ).length;
    if (e.kind === "support" && !this.cooldowns.heal) {
      const ally = allies.find((a) => a.hp < a.maxHp * 0.7);
      if (ally) {
        ally.hp = Math.min(ally.maxHp, ally.hp + 22);
        ally.shield = 8;
        g.fx("heal", ally, 12);
        this.cooldowns.heal = 5;
        this.set("Cast");
        return;
      }
    }
    if (e.kind === "shield") e.block = d < 4 && !!p.attack && e.shield > 0;
    if (e.kind === "agile" && p.attack && !this.cooldowns.evade) {
      this.destination = { x: p.x + v.z * 3, z: p.z - v.x * 3 };
      this.cooldowns.evade = 3;
      this.set("Evade");
      return;
    }
    if (!this.cooldowns.attack && d < e.range && (ranged || attacking < 3)) {
      const choices =
        e.kind === "melee"
          ? ["slash", "double"]
          : e.kind === "ranged"
            ? ["shot", "triple"]
            : e.kind === "shield"
              ? ["bash", "slash"]
              : e.kind === "charger"
                ? ["charge"]
                : e.kind === "caster"
                  ? ["aoe", "orb"]
                  : e.kind === "agile"
                    ? ["backstab"]
                    : e.kind === "support"
                      ? ["orb"]
                      : ["slash"];
      const move = g.rng.pick(choices);
      this.cooldowns.attack = e.kind === "charger" ? 5 : g.rng.range(2, 3.4);
      this.wind(
        g,
        move,
        move === "charge" ? 1.05 : ranged ? 0.95 : 0.65,
        move === "charge" ? 1.4 : 0.8,
      );
      return;
    }
    const angle = e.slot * 2.399;
    const desired = ranged ? 6 : attacking >= 3 ? 4 : 1.6;
    let goal = {
      x: p.x + Math.cos(angle) * desired,
      z: p.z + Math.sin(angle) * desired * 0.7,
    };
    if (ranged && d < 4) {
      goal = { x: e.x + v.x * 4, z: e.z + v.z * 4 };
      this.set("Retreat");
    } else if (e.hp < e.maxHp * 0.25 && !this.cooldowns.retreat) {
      goal = { x: e.x + v.x * 3, z: e.z + v.z * 3 };
      this.cooldowns.retreat = 5;
      this.set("Retreat");
    } else this.set(d > desired + 1 ? "Approach" : "Strafe");
    this.destination = goal;
  }
  elite(g, d) {
    const e = this.e,
      p = g.player;
    if (
      e.affix === "Summoner" &&
      !this.cooldowns.summon &&
      g.enemies.filter((a) => a.hp > 0).length < 9
    ) {
      g.spawn("melee", e.x + 2, e.z);
      this.cooldowns.summon = 12;
    }
    if (e.affix === "Teleport" && d > 5 && !this.cooldowns.teleport) {
      this.cooldowns.teleport = 8;
      this.wind(g, "teleport", 1, 1);
      return true;
    }
    if (e.affix === "Shielded" && e.shield <= 0 && !this.cooldowns.shield) {
      e.shield = 40;
      this.cooldowns.shield = 15;
      this.set("Recover", 0.8);
      return true;
    }
    if (p.attack && d < 4 && !this.cooldowns.counter) {
      e.block = true;
      this.cooldowns.counter = 6;
      this.wind(g, "counter", 1, 1);
      return true;
    }
    if (d > 4 && !this.cooldowns.leap) {
      this.cooldowns.leap = 6;
      this.wind(g, "leap", 1.2, 1.2);
      return true;
    }
    if (d < 4 && !this.cooldowns.spin) {
      this.cooldowns.spin = 7;
      this.wind(g, "sweep", 1, 1.3);
      return true;
    }
    return false;
  }
  boss(g, d) {
    const e = this.e,
      p = g.player;
    this.scores = {};
    for (const [name, m] of Object.entries(bossMoves)) {
      if (this.cooldowns[name] > 0 || d < m.min || d > m.max) continue;
      if (
        this.phase === 1 &&
        ["teleport", "control", "ultimate"].includes(name)
      )
        continue;
      if (this.phase < 3 && name === "ultimate") continue;
      if (name === "summon" && g.enemies.filter((x) => x.hp > 0).length >= 5)
        continue;
      let score = m.weight + g.rng.next() * 2;
      if (name === this.last) score *= 0.3;
      if (d < 4 && ["sweep", "combo"].includes(name)) score += 2;
      if (g.history.far > 3 && name === "charge") score += 3;
      if (g.history.dodges > 2 && name === "aoe") score += 1;
      if (p.hp < p.stats.hp * 0.3 && name === "leap") score += 1;
      if (p.attack && name === "teleport") score += 1;
      this.scores[name] = score;
    }
    const selected = Object.entries(this.scores).sort((a, b) => b[1] - a[1])[0];
    if (selected) {
      const name = selected[0],
        m = bossMoves[name];
      this.cooldowns[name] = m.cd;
      this.last = name;
      this.wind(g, name, m.wind / (1 + (this.phase - 1) * 0.1), m.recover);
      return;
    }
    this.destination = {
      x: p.x + (d < 3 ? -4 : 2),
      z: p.z + (e.z > p.z ? 2 : -2),
    };
    this.set(d < 3 ? "Retreat" : "Reposition");
  }
}
