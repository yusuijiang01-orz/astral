import { EventBus, Random, clamp, distance, toward } from "../core/runtime.js";
import {
  skills,
  enemyTypes,
  eliteAffixes,
  boons,
  bossMoves,
} from "../data/catalog.js";
import { createItem, computeStats, hasSpecial } from "../equipment/items.js";
import { damageRoll, applyElement } from "../combat/damage.js";
import { AIController } from "../ai/controller.js";
import { SaveManager, defaultSettings } from "../save/storage.js";
export class Game {
  constructor() {
    this.bus = new EventBus();
    this.save = new SaveManager();
    this.saved = this.save.read();
    this.settings = { ...defaultSettings, ...this.saved?.settings };
    this.meta = this.saved?.meta || { shards: 0, best: 0, runs: 0, upgrade: 0 };
    this.state = "MAIN_MENU";
    this.rng = new Random();
    this.player = this.makePlayer();
    this.enemies = [];
    this.props = [];
    this.loot = [];
    this.effects = [];
    this.projectiles = [];
    this.hazards = [];
    this.timers = [];
    this.room = 0;
    this.route = [];
    this.cleared = false;
    this.id = 0;
    this.time = 0;
    this.hitstop = 0;
    this.slow = 0;
    this.cameraShake = 0;
    this.history = { far: 0, dodges: 0 };
    this.metrics = {
      kills: 0,
      damage: 0,
      loot: 0,
      legendary: 0,
      combo: 0,
      boss: 0,
    };
    this.debug = false;
    this.god = false;
    this.fps = 60;
    this.aiMs = 0;
    this.autoSave = 0;
  }
  makePlayer() {
    const p = {
      id: "player",
      x: -18,
      z: 0,
      facing: { x: 1, z: 0 },
      color: "#d9dfc3",
      level: 1,
      xp: 0,
      hp: 180,
      mp: 100,
      stamina: 100,
      charge: 0,
      inventory: [],
      equipped: {},
      boons: [],
      gold: 0,
      materials: 0,
      potions: 2,
      quest: 0,
      skillPoints: 3,
      skillLevels: [1, 1, 1, 1, 1],
      nodes: [[], [], [], [], []],
      cooldowns: [0, 0, 0, 0, 0],
      status: {},
      invulnerable: 0,
      combo: 0,
      comboTimer: 0,
    };
    p.stats = computeStats(p);
    return p;
  }
  start(character = "warden") {
    this.player = this.makePlayer();
    this.player.character = character;
    if (character === "seer")
      this.player.boons.push({ stat: "mana", value: 30 });
    else this.player.boons.push({ stat: "defense", value: 3 });
    this.player.boons.push({ stat: "hp", value: this.meta.upgrade * 8 });
    this.player.stats = computeStats(this.player);
    this.player.hp = this.player.stats.hp;
    this.player.mp = this.player.stats.mana;
    this.time = 0;
    this.metrics = {
      kills: 0,
      damage: 0,
      loot: 0,
      legendary: 0,
      combo: 0,
      boss: 0,
    };
    this.route = Array.from({ length: 7 }, (_, i) => ({
      options:
        i === 0
          ? ["combat"]
          : i === 6
            ? ["boss"]
            : i === 2
              ? ["elite", "event"]
              : i === 4
                ? ["rest", "shop"]
                : [
                    this.rng.pick(["combat", "challenge", "treasure"]),
                    this.rng.pick(["event", "combat", "treasure"]),
                  ],
      chosen: null,
    }));
    this.meta.runs++;
    this.enterRoom(0, "combat");
    this.persist();
  }
  enterRoom(index, type) {
    this.state = "LOADING";
    this.input?.reset();
    this.room = index;
    this.roomType = type;
    this.route[index].chosen = type;
    this.cleared = false;
    this.rewardTaken = false;
    this.enemies = [];
    this.loot = [];
    this.projectiles = [];
    this.hazards = [];
    this.timers = [];
    this.player.x = -18;
    this.player.z = 0;
    this.player.attack = null;
    this.player.dash = null;
    this.props = Array.from({ length: 9 }, (_, i) => ({
      id: `p${index}-${i}`,
      x: -12 + i * 4,
      z: (i % 2 ? 1 : -1) * (3 + this.rng.next()),
      hp: i % 4 === 0 ? 65 : 30,
      radius: 0.65,
      material: i % 4 === 0 ? "stone" : "wood",
      type:
        i % 4 === 0
          ? "pillar"
          : i % 3 === 0
            ? "crystal"
            : i % 2
              ? "barrel"
              : "crate",
    }));
    this.world?.build(this.rng.seed);
    if (type === "boss") {
      this.spawn("boss", 9, 0);
      this.bus.emit("BOSS_STARTED");
    } else if (["combat", "elite", "challenge"].includes(type)) {
      const count = type === "challenge" ? 8 : 4 + Math.floor(index / 2);
      for (let i = 0; i < count; i++)
        this.spawn(
          this.rng.pick(
            Object.keys(enemyTypes).filter(
              (k) => !["boss", "elite"].includes(k),
            ),
          ),
          -2 + i * 3,
          ((i % 3) - 1) * 2,
        );
      if (type === "elite") this.spawn("elite", 12, 1);
    } else {
      this.cleared = true;
      this.rewardTaken = true;
      this.serviceUsed = false;
    }
    this.state = type === "boss" ? "BOSS" : "PLAYING";
    this.bus.emit("ROOM_ENTERED", { index, type });
    this.persist();
  }
  spawn(kind, x, z) {
    if (this.enemies.filter((e) => e.hp > 0).length >= 20) return null;
    const d = enemyTypes[kind],
      scale = 1 + this.room * 0.14,
      e = {
        ...d,
        id: `e${this.id++}`,
        kind,
        x,
        z,
        hp: d.hp * scale,
        maxHp: d.hp * scale,
        status: {},
        facing: { x: -1, z: 0 },
        slot: this.id,
        shield: kind === "shield" ? 40 : kind === "elite" ? 30 : 0,
        invulnerable: 0,
        block: false,
      };
    if (kind === "elite") e.affix = this.rng.pick(eliteAffixes);
    e.ai = new AIController(e);
    this.enemies.push(e);
    return e;
  }
  clampActor(e) {
    e.x = clamp(e.x, -26, 26);
    e.z = clamp(e.z, -5.3, 5.3);
  }
  recalculate() {
    const p = this.player;
    p.stats = computeStats(p);
    p.hp = Math.min(p.hp, p.stats.hp);
    p.mp = Math.min(p.mp, p.stats.mana);
  }
  action(a) {
    if (a === "blur") {
      if (["PLAYING", "BOSS"].includes(this.state))
        this.bus.emit("OPEN_PANEL", "pause");
      return;
    }
    if (a === "pause") {
      this.bus.emit("TOGGLE_PAUSE");
      return;
    }
    if (a === "inventory") {
      if (["PLAYING", "BOSS", "PAUSED"].includes(this.state))
        this.bus.emit("OPEN_PANEL", "inventory");
      return;
    }
    if (a === "debug") {
      if (import.meta.env?.DEV) this.debug = !this.debug;
      return;
    }
    if (!["PLAYING", "BOSS"].includes(this.state)) return;
    this.audio?.unlock();
    if (a === "attack") this.attack();
    else if (a === "dodge") this.dodge();
    else if (a === "interact") this.interact();
    else if (a.startsWith("s")) this.cast(Number(a.slice(1)));
  }
  attack() {
    const p = this.player;
    if (p.dash) return;
    if (p.attack) {
      if (p.attack.elapsed > p.attack.duration * 0.3) p.attack.queued = true;
      return;
    }
    p.combo = p.comboTimer > 0 ? (p.combo % 4) + 1 : 1;
    p.comboTimer = 1.05;
    const haste = hasSpecial(p, "comboHaste") ? p.combo * 0.05 : 0;
    const duration =
      (p.combo === 4 ? 0.72 : 0.42) / (p.stats.attackSpeed + haste);
    p.attack = { elapsed: 0, duration, hit: false, queued: false };
    this.audio?.play("attack");
    this.metrics.combo = Math.max(this.metrics.combo, p.combo);
  }
  dodge() {
    const p = this.player;
    if (p.stamina < 28 || p.dash || p.dodgeCooldown > 0) return;
    if (p.attack && p.attack.elapsed < p.attack.duration * 0.2) return;
    const v = this.input?.vector() || { x: 0, z: 0 },
      dir = Math.hypot(v.x, v.z) > 0.1 ? v : p.facing;
    p.stamina -= 28;
    p.invulnerable = 0.32;
    p.dodgeCooldown = 0.5;
    p.dash = { x: dir.x * 18, z: dir.z * 18, time: 0.22 };
    p.attack = null;
    p.dodgePower = hasSpecial(p, "dodgePower");
    this.history.dodges++;
    const danger = this.enemies.some(
      (e) =>
        e.hp > 0 &&
        e.ai.state === "Windup" &&
        e.ai.timer < 0.32 &&
        distance(p, e.ai.target || e) < 5,
    );
    if (danger) {
      this.slow = 0.38;
      p.perfect = 3;
      this.bus.emit("TOAST", "完美闪避 · 会心提升");
    }
    this.fx("dodge", p, 20);
    this.audio?.play("dodge");
  }
  cast(i) {
    const p = this.player,
      s = skills[i];
    if (
      !s ||
      p.cooldowns[i] > 0 ||
      p.mp < s.cost ||
      p.dash ||
      (i === 4 && p.charge < 100)
    )
      return;
    p.mp -= s.cost;
    p.cooldowns[i] =
      s.cd * (1 - p.stats.cdr) * (i === 2 && p.nodes[i].includes(2) ? 0.8 : 1);
    if (i === 4) p.charge = 0;
    p.attack = null;
    const mult = s.mult * (1 + (p.skillLevels[i] - 1) * 0.2);
    const nodes = p.nodes[i];
    this.bus.emit("SKILL_CAST", s);
    this.audio?.play("skill");
    if (i === 0) {
      const old = { x: p.x, z: p.z };
      const range = s.range * (nodes.includes(0) ? 1.2 : 1);
      p.x += p.facing.x * range;
      p.z += p.facing.z * range;
      this.clampActor(p);
      p.invulnerable = 0.25;
      for (const e of this.enemies) {
        const vx = p.x - old.x,
          vz = p.z - old.z,
          t = clamp(
            ((e.x - old.x) * vx + (e.z - old.z) * vz) /
              (vx * vx + vz * vz || 1),
            0,
            1,
          );
        if (distance(e, { x: old.x + vx * t, z: old.z + vz * t }) < 2)
          this.hit(e, mult, "fire");
      }
      if (nodes.includes(1))
        this.hazards.push({
          x: old.x,
          z: old.z,
          radius: 3,
          life: 3,
          tick: 0,
          element: "fire",
          friendly: true,
          mult: 0.5,
        });
      if (nodes.includes(2)) p.stamina = Math.min(100, p.stamina + 18);
    }
    if (i === 1)
      this.hazards.push({
        x: p.x,
        z: p.z,
        radius: nodes.includes(0) ? 5 : 4,
        life: nodes.includes(1) ? 6 : 4,
        tick: 0,
        element: "ice",
        friendly: true,
        mult,
      });
    if (i === 2) {
      const count = nodes.includes(0) || hasSpecial(p, "double") ? 2 : 1;
      for (let j = 0; j < count; j++)
        this.projectiles.push({
          x: p.x,
          z: p.z + (j ? -0.5 : 0),
          vx: p.facing.x * 12,
          vz: p.facing.z * 12,
          life: p.nodes[2].includes(1) ? 1.3 : 0.9,
          element: "wind",
          friendly: true,
          mult: mult * (p.nodes[2].includes(1) ? 1.2 : 1),
          hits: [],
        });
    }
    if (i === 3) {
      const target = this.enemies
        .filter(
          (e) => e.hp > 0 && distance(e, p) < (nodes.includes(0) ? 10 : 7),
        )
        .sort((a, b) => distance(a, p) - distance(b, p))[0];
      if (target) {
        p.x = target.x - p.facing.x;
        p.z = target.z - p.facing.z;
        this.clampActor(p);
        this.hit(target, mult, "lightning");
        if (nodes.includes(1))
          for (const e of this.enemies)
            if (e !== target && distance(e, target) < 4)
              this.hit(e, mult * 0.5, "lightning");
      }
      p.invulnerable = 0.3;
      if (nodes.includes(2)) p.charge = Math.min(100, p.charge + 12);
    }
    if (i === 4) {
      const r = nodes.includes(0) ? 10 : 8;
      for (const e of this.enemies)
        if (distance(e, p) < r)
          this.hit(e, mult * (nodes.includes(1) ? 1.2 : 1), "holy", true);
      this.world?.ring(p, r, "#fff0a0", 1);
      this.cameraShake = 0.5;
      if (nodes.includes(2)) p.hp = Math.min(p.stats.hp, p.hp + 30);
    }
    this.fx(s.element, p, i === 4 ? 80 : 35);
    this.breakNearby(p, 3, 35);
  }
  hit(e, mult, element = "physical", heavy = false) {
    if (e.hp <= 0 || e.invulnerable > 0) return;
    const p = this.player;
    let factor = mult;
    if (p.dodgePower) {
      factor *= 1.5;
      p.dodgePower = false;
    }
    if (e.status.curse > 0) factor *= 1.15;
    const blocked =
      e.block &&
      e.shield > 0 &&
      (p.x - e.x) * e.facing.x + (p.z - e.z) * e.facing.z > 0;
    let critDamage = p.stats.critDamage;
    if (e.status.freeze > 0 && hasSpecial(p, "frozenCrit")) critDamage += 0.5;
    const roll = damageRoll(
      {
        attack: p.stats.attack,
        mult: factor,
        crit: p.stats.crit + (p.perfect > 0 ? 0.15 : 0),
        critDamage,
        elementBonus: p.stats[element] || 0,
        defense: e.kind === "shield" ? 14 : 4,
        resist: e.resist || 0,
        reduction: blocked ? 0.65 : 0,
      },
      this.rng,
    );
    if (blocked) {
      e.shield = Math.max(0, e.shield - roll.amount);
      if (!e.shield) e.ai.set("Stagger", 1.2);
    }
    if (heavy && element === "physical") e.status.bleed = 3;
    const reaction = applyElement(e, element, heavy);
    if (reaction === "shatter")
      roll.amount = Math.round(
        roll.amount * (p.nodes[1].includes(2) ? 2.2 : 1.6),
      );
    if (reaction === "spread")
      for (const n of this.enemies)
        if (n !== e && distance(e, n) < 4) n.status.burn = 4;
    if (reaction === "chain")
      for (const n of this.enemies)
        if (n !== e && n.hp > 0 && distance(e, n) < 4)
          this.rawDamage(n, roll.amount * 0.3, "lightning");
    this.rawDamage(e, roll.amount, element, roll.critical);
    const v = toward(p, e);
    e.x += v.x * (heavy ? 0.8 : 0.2);
    e.z += v.z * (heavy ? 0.8 : 0.2);
    this.clampActor(e);
    p.hp = Math.min(p.stats.hp, p.hp + roll.amount * p.stats.leech);
    p.charge = Math.min(
      100,
      p.charge +
        (hasSpecial(p, "skillCharge") && element !== "physical" ? 8 : 4),
    );
    if (roll.critical && hasSpecial(p, "stormCrit") && this.rng.next() < 0.15)
      this.rawDamage(e, p.stats.attack, "lightning");
    if (
      element !== "physical" &&
      Object.values(p.equipped).some((x) => x?.legendary)
    )
      this.rawDamage(e, p.stats.attack * 0.2, "fire");
    this.hitstop = 0.035;
    this.cameraShake = heavy ? 0.28 : 0.1;
    this.audio?.play("hit");
  }
  rawDamage(e, amount, element = "physical", critical = false) {
    if (e.hp <= 0) return;
    e.hp -= amount;
    this.metrics.damage += amount;
    this.bus.emit("DAMAGE", {
      ...e,
      amount: Math.ceil(amount),
      element,
      critical,
    });
    this.fx(element, e, 10);
    if (e.hp <= 0) this.kill(e);
  }
  kill(e) {
    e.hp = 0;
    e.ai.set("Death");
    this.metrics.kills++;
    const p = this.player;
    p.xp += e.kind === "boss" ? 150 : e.kind === "elite" ? 65 : 20;
    p.gold += e.kind === "boss" ? 100 : 8 + this.room * 2;
    p.materials++;
    if (hasSpecial(p, "killHeal"))
      p.hp = Math.min(p.stats.hp, p.hp + p.stats.hp * 0.02);
    if (p.xp >= p.level * 60) {
      p.xp -= p.level * 60;
      p.level++;
      p.skillPoints += 2;
      this.recalculate();
      p.hp = Math.min(p.stats.hp, p.hp + 40);
      this.bus.emit("TOAST", `等级提升 · Lv.${p.level}`);
    }
    if (
      this.rng.next() < 0.65 + p.stats.luck ||
      ["elite", "boss"].includes(e.kind)
    )
      this.drop(
        createItem(
          this.rng,
          p.level,
          e.kind === "boss" ? 4 : e.kind === "elite" ? 3 : undefined,
        ),
        e,
      );
    if (e.kind === "boss") {
      this.metrics.boss++;
      p.quest++;
      this.meta.best = Math.max(this.meta.best, this.room + 1);
      this.finish(true);
    }
    if (e.affix === "Explosive")
      this.hazards.push({
        x: e.x,
        z: e.z,
        radius: 3,
        life: 1.5,
        tick: 1,
        element: "fire",
        friendly: false,
        mult: 14,
      });
    this.bus.emit("ENEMY_KILLED", e);
  }
  hurt(amount, element = "physical") {
    const p = this.player;
    if (p.hp <= 0 || p.invulnerable > 0 || this.god) return;
    const actual = Math.max(
      1,
      Math.round(
        amount * (100 / (100 + p.stats.defense)) * (1 - p.stats.resist),
      ),
    );
    p.hp -= actual;
    applyElement(p, element);
    p.invulnerable = 0.35;
    this.cameraShake = 0.2;
    this.bus.emit("DAMAGE", { ...p, amount: actual, element: "fire" });
    this.bus.emit("PLAYER_DAMAGED", actual);
    this.audio?.play("hurt");
    if (p.hp <= 0) {
      p.hp = 0;
      this.finish(false);
    }
  }
  finish(win) {
    this.state = win ? "VICTORY" : "PLAYER_DEAD";
    this.player.attack = null;
    this.player.dash = null;
    this.input?.reset();
    this.projectiles = [];
    this.hazards = [];
    this.timers = [];
    this.meta.shards += Math.floor(this.metrics.kills / 3) + (win ? 12 : 1);
    this.bus.emit("FINISH", win);
    this.audio?.play(win ? "legendary" : "death");
    this.persist(false);
  }
  drop(item, pos) {
    const l = { id: `loot${this.id++}`, x: pos.x, z: pos.z, item, age: 0 };
    this.loot.push(l);
    this.audio?.play(item.quality >= 4 ? "legendary" : "drop");
    this.fx("holy", pos, 12);
    if (item.quality === 5) this.bus.emit("TOAST", `神话降临 · ${item.name}`);
    this.bus.emit("ITEM_DROPPED", l);
  }
  breakNearby(pos, radius, damage) {
    for (const prop of this.props)
      if (prop.hp > 0 && distance(prop, pos) < radius) {
        prop.hp -= damage;
        this.fx(prop.material, prop, prop.hp <= 0 ? 28 : 8);
        this.audio?.play(prop.material);
        if (prop.hp <= 0) {
          this.player.gold += 3;
          if (this.rng.next() < 0.15)
            this.drop(createItem(this.rng, this.player.level), prop);
          if (this.rng.next() < 0.15) this.player.potions++;
        }
      }
  }
  telegraph(e, move, target, wind) {
    const radius =
      bossMoves[move]?.radius ||
      (["shot", "triple", "orb"].includes(move)
        ? 0.7
        : move === "aoe"
          ? 3
          : 2.5);
    const center = [
      "aoe",
      "leap",
      "teleport",
      "control",
      "ultimate",
      "charge",
    ].includes(move)
      ? target
      : e;
    this.world?.ring(center, radius, "#ff755c", wind);
    this.audio?.play("warning");
  }
  enemyAttack(e, move, target) {
    if (e.hp <= 0) return;
    const p = this.player;
    const dmg =
      e.damage * (e.kind === "boss" ? 1 + (e.ai.phase - 1) * 0.15 : 1);
    let radius = bossMoves[move]?.radius || 2.5;
    if (move === "summon") {
      for (let i = 0; i < 3; i++)
        this.spawn(i === 0 ? "ranged" : "melee", e.x + (i - 1) * 2, e.z + 2);
      return;
    }
    if (["charge", "leap", "teleport", "backstab"].includes(move)) {
      const v = toward(e, target);
      if (move === "charge") {
        e.dash = {
          x: v.x * 19,
          z: v.z * 19,
          time: Math.min(0.7, distance(e, target) / 19),
        };
        this.hazards.push({
          x: target.x,
          z: target.z,
          radius: 2.5,
          life: 0.6,
          tick: 0.3,
          element: "fire",
          friendly: false,
          mult: dmg,
        });
      } else {
        e.x = target.x;
        e.z = target.z;
        this.clampActor(e);
      }
      this.fx("void", e, 25);
    }
    if (["shot", "triple", "orb"].includes(move)) {
      const v = toward(e, target);
      for (let i = 0; i < (move === "triple" ? 3 : 1); i++) {
        const angle = (i - 1) * 0.17 * (move === "triple" ? 1 : 0),
          x = v.x * Math.cos(angle) - v.z * Math.sin(angle),
          z = v.x * Math.sin(angle) + v.z * Math.cos(angle);
        this.projectiles.push({
          x: e.x,
          z: e.z,
          vx: x * 6,
          vz: z * 6,
          life: 4,
          element: move === "orb" ? "void" : "nature",
          friendly: false,
          damage: dmg,
          hits: [],
        });
      }
      return;
    }
    const center = ["aoe", "control", "ultimate"].includes(move) ? target : e;
    if (move === "aoe") radius = 3;
    if (distance(p, center) < radius) {
      this.hurt(
        dmg * (move === "ultimate" ? 1.7 : 1),
        move === "control" ? "ice" : "physical",
      );
      if (move === "control" && p.invulnerable <= 0.35) p.status.slow = 2;
      if (e.affix === "Vampiric") e.hp = Math.min(e.maxHp, e.hp + dmg * 0.5);
    }
    this.world?.ring(center, radius, "#ffc276", 0.3);
    this.fx(e.affix === "Frozen" ? "ice" : "fire", center, 30);
    if (["combo", "double", "counter"].includes(move)) {
      for (let i = 1; i <= (move === "combo" ? 2 : 1); i++)
        this.timers.push({
          time: i * 0.5,
          owner: e.id,
          kind: "followup",
          x: center.x,
          z: center.z,
          radius: 3,
          damage: dmg,
        });
    }
    if (["Flame", "Frozen", "Lightning"].includes(e.affix))
      this.hazards.push({
        x: e.x,
        z: e.z,
        radius: 3,
        life: 3,
        tick: 0.8,
        element:
          e.affix === "Frozen"
            ? "ice"
            : e.affix === "Lightning"
              ? "lightning"
              : "fire",
        friendly: false,
        mult: dmg * 0.6,
      });
  }
  interact() {
    const p = this.player;
    const l = this.loot
      .filter((l) => distance(l, p) < 3)
      .sort((a, b) => distance(a, p) - distance(b, p))[0];
    if (l) {
      if (p.inventory.length >= 80) {
        this.bus.emit("TOAST", "背包已满，请整理");
        return;
      }
      p.inventory.push(l.item);
      this.loot = this.loot.filter((x) => x !== l);
      this.metrics.loot++;
      if (l.item.quality >= 4) this.metrics.legendary++;
      this.audio?.play("pickup");
      this.bus.emit("ITEM_PICKED", l.item);
      this.persist();
      return;
    }
    if (
      this.cleared &&
      !this.serviceUsed &&
      ["treasure", "event", "rest", "shop"].includes(this.roomType) &&
      distance(p, { x: 0, z: 0 }) < 4
    ) {
      if (this.roomType === "shop") {
        this.bus.emit("OPEN_PANEL", "shop");
        return;
      }
      if (this.roomType === "treasure") {
        for (let i = 0; i < 3; i++)
          this.drop(createItem(this.rng, p.level, i === 2 ? 3 : undefined), {
            x: i - 1,
            z: 0,
          });
        this.fx("holy", p, 50);
      }
      if (this.roomType === "rest") {
        p.hp = p.stats.hp;
        p.mp = p.stats.mana;
        p.potions++;
        this.bus.emit("TOAST", "星泉恢复了生命与法力");
      }
      if (this.roomType === "event") {
        this.bus.emit("OPEN_PANEL", "event");
        return;
      }
      this.serviceUsed = true;
      this.persist();
      return;
    }
    if (this.cleared && distance(p, { x: 24, z: 0 }) < 4)
      this.bus.emit("OPEN_ROUTE");
  }
  update(dt) {
    this.cameraShake = Math.max(0, this.cameraShake - dt);
    const active = ["PLAYING", "BOSS"].includes(this.state);
    this.input && (this.input.enabled = active);
    if (!active) return;
    if (this.hitstop > 0) {
      this.hitstop -= dt;
      return;
    }
    if (this.slow > 0) {
      this.slow -= dt;
      dt *= 0.3;
    }
    this.time += dt;
    const p = this.player;
    p.invulnerable = Math.max(0, p.invulnerable - dt);
    p.perfect = Math.max(0, (p.perfect || 0) - dt);
    p.dodgeCooldown = Math.max(0, (p.dodgeCooldown || 0) - dt);
    p.comboTimer -= dt;
    p.mp = Math.min(p.stats.mana, p.mp + 6 * dt);
    p.stamina = Math.min(100, p.stamina + p.stats.recovery * dt);
    p.cooldowns = p.cooldowns.map((cd) => Math.max(0, cd - dt));
    for (const k in p.status) p.status[k] = Math.max(0, p.status[k] - dt);
    if (p.status.burn > 0 || p.status.poison > 0) {
      p.dot = (p.dot || 0) + dt;
      if (p.dot > 1) {
        p.dot = 0;
        this.hurt(3);
      }
    }
    const v = this.input?.vector() || { x: 0, z: 0 };
    p.moving = Math.hypot(v.x, v.z) > 0.05;
    if (p.dash) {
      p.x += p.dash.x * dt;
      p.z += p.dash.z * dt;
      p.dash.time -= dt;
      if (p.dash.time <= 0) p.dash = null;
      this.fx("dodge", p, 2);
    } else if (!p.attack) {
      p.x += v.x * p.stats.speed * dt * (p.status.slow > 0 ? 0.5 : 1);
      p.z += v.z * p.stats.speed * dt * (p.status.slow > 0 ? 0.5 : 1);
      if (p.moving) p.facing = v;
    }
    this.clampActor(p);
    for (const prop of this.props)
      if (prop.hp > 0) {
        const d = distance(p, prop);
        if (d < prop.radius + 0.35 && d > 0.001) {
          const dir = toward(prop, p);
          p.x = prop.x + dir.x * (prop.radius + 0.35);
          p.z = prop.z + dir.z * (prop.radius + 0.35);
        }
      }
    if (p.attack) {
      const a = p.attack;
      a.elapsed += dt;
      if (!a.hit && a.elapsed >= a.duration * 0.35) {
        a.hit = true;
        for (const e of this.enemies) {
          const dir = toward(p, e);
          if (
            e.hp > 0 &&
            distance(e, p) < (p.combo === 4 ? 3.5 : 2.7) &&
            dir.x * p.facing.x + dir.z * p.facing.z > -0.2
          )
            this.hit(
              e,
              [1, 1.1, 1.25, 2.1][p.combo - 1],
              "physical",
              p.combo === 4,
            );
        }
        this.breakNearby(
          { x: p.x + p.facing.x, z: p.z + p.facing.z },
          2,
          18 + (p.combo === 4 ? 35 : 0),
        );
        this.fx("wind", { x: p.x + p.facing.x, z: p.z + p.facing.z }, 14);
        this.world?.ring(
          { x: p.x + p.facing.x, z: p.z + p.facing.z },
          1.3,
          "#b2fff1",
          0.13,
        );
      }
      if (a.elapsed >= a.duration) {
        p.attack = null;
        if (a.queued) this.attack();
      }
    }
    let aiStart = performance.now();
    for (const e of [...this.enemies]) {
      if (e.hp <= 0) continue;
      e.invulnerable = Math.max(0, e.invulnerable - dt);
      for (const k in e.status)
        if (!["chill"].includes(k)) e.status[k] = Math.max(0, e.status[k] - dt);
      if (e.status.burn > 0 || e.status.poison > 0 || e.status.bleed > 0) {
        e.dot = (e.dot || 0) + dt;
        if (e.dot >= 0.7) {
          e.dot = 0;
          this.rawDamage(
            e,
            4 + this.room,
            e.status.burn > 0 ? "fire" : "nature",
          );
        }
      }
      e.ai.update(dt, this);
    }
    this.aiMs = performance.now() - aiStart;
    for (const t of this.timers) {
      t.time -= dt;
      if (t.time <= 0) {
        const owner = this.enemies.find((e) => e.id === t.owner);
        if (owner?.hp > 0 && distance(p, t) < t.radius) this.hurt(t.damage);
        t.done = true;
      }
    }
    this.timers = this.timers.filter((t) => !t.done);
    for (const q of this.projectiles) {
      q.life -= dt;
      q.x += q.vx * dt;
      q.z += q.vz * dt;
      this.fx(q.element, q, 1);
      if (q.friendly) {
        for (const e of this.enemies)
          if (e.hp > 0 && !q.hits.includes(e.id) && distance(q, e) < 1.2) {
            q.hits.push(e.id);
            this.hit(e, q.mult, q.element);
          }
      } else if (distance(q, p) < 0.7) {
        this.hurt(q.damage, q.element);
        q.life = 0;
      }
    }
    this.projectiles = this.projectiles.filter((q) => q.life > 0);
    for (const h of this.hazards) {
      h.life -= dt;
      h.tick -= dt;
      if (h.tick <= 0) {
        h.tick = 0.65;
        this.world?.ring(h, h.radius, h.friendly ? "#81e6fa" : "#f17864", 0.6);
        this.fx(h.element, h, 10);
        if (h.friendly) {
          for (const e of this.enemies)
            if (e.hp > 0 && distance(e, h) < h.radius)
              this.hit(e, h.mult, h.element);
        } else if (distance(p, h) < h.radius) this.hurt(h.mult, h.element);
      }
    }
    this.hazards = this.hazards.filter((h) => h.life > 0);
    for (const l of this.loot) l.age += dt;
    if (
      !this.cleared &&
      !this.enemies.some((e) => e.hp > 0) &&
      this.state !== "VICTORY"
    ) {
      this.cleared = true;
      this.state = "ROOM_CLEAR";
      this.bus.emit("ROOM_CLEARED");
      this.bus.emit("CHOOSE_BOON", this.rngChoices(boons, 3));
      this.persist();
    }
    const boss = this.enemies.find((e) => e.kind === "boss" && e.hp > 0);
    if (boss)
      this.history.far = distance(p, boss) > 8 ? this.history.far + dt : 0;
    this.history.dodges = Math.max(0, this.history.dodges - dt * 0.12);
    this.autoSave += dt;
    if (this.autoSave > 8) {
      this.autoSave = 0;
      this.persist();
    }
  }
  rngChoices(list, n) {
    const copy = [...list],
      result = [];
    while (result.length < n && copy.length)
      result.push(copy.splice(Math.floor(this.rng.next() * copy.length), 1)[0]);
    return result;
  }
  chooseBoon(b) {
    this.player.boons.push({ ...b });
    this.recalculate();
    this.rewardTaken = true;
    this.state = "PLAYING";
    this.persist();
  }
  fx(kind, pos, count) {
    this.world?.burst(kind, pos, count);
  }
  persist(run = true) {
    const snapshot =
      run && !["MAIN_MENU", "VICTORY", "PLAYER_DEAD"].includes(this.state)
        ? {
            player: JSON.parse(JSON.stringify(this.player)),
            room: this.room,
            roomType: this.roomType,
            route: this.route,
            cleared: this.cleared,
            rewardTaken: this.rewardTaken,
            serviceUsed: this.serviceUsed,
            props: this.props,
            loot: this.loot,
            enemies: this.enemies.map(({ ai, ...e }) => ({
              ...e,
              aiData: { phase: ai.phase, cooldowns: ai.cooldowns },
            })),
            time: this.time,
            metrics: this.metrics,
            seed: this.rng.seed,
            id: this.id,
          }
        : null;
    const data = {
      settings: this.settings,
      meta: this.meta,
      run: this.state === "MAIN_MENU" ? this.saved?.run || null : snapshot,
    };
    if (this.save.write(data)) this.saved = { version: 1, ...data };
    else this.bus.emit("TOAST", this.save.error);
  }
  continue() {
    const r = this.saved?.run;
    if (!r) return false;
    try {
      if (
        !Array.isArray(r.player.inventory) ||
        !r.route?.length ||
        !Array.isArray(r.enemies)
      )
        throw Error("bad run");
      this.player = structuredClone(r.player);
      Object.assign(this, {
        room: r.room,
        roomType: r.roomType,
        route: r.route,
        cleared: r.cleared,
        rewardTaken: r.rewardTaken,
        serviceUsed: r.serviceUsed,
        props: r.props,
        loot: r.loot,
        time: r.time,
        metrics: r.metrics,
        id: r.id,
      });
      this.rng = new Random(r.seed);
      this.enemies = r.enemies.map((e) => {
        const n = { ...e, ai: new AIController(e) };
        n.ai.e = n;
        n.ai.phase = e.aiData?.phase || 1;
        n.ai.cooldowns = e.aiData?.cooldowns || {};
        n.ai.set("Observe");
        return n;
      });
      this.player.attack = null;
      this.player.dash = null;
      this.player.invulnerable = 1;
      this.timers = [];
      this.hazards = [];
      this.projectiles = [];
      this.recalculate();
      this.world?.build(r.seed);
      this.state = this.roomType === "boss" ? "BOSS" : "PLAYING";
      if (this.cleared && !this.rewardTaken) {
        this.state = "ROOM_CLEAR";
        this.bus.emit("CHOOSE_BOON", this.rngChoices(boons, 3));
      }
      return true;
    } catch {
      this.bus.emit("TOAST", "本轮存档无法恢复，可开始新的旅程");
      return false;
    }
  }
}
