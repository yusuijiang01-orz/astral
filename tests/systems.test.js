import test from "node:test";
import assert from "node:assert/strict";
import { Random, EventBus } from "../src/core/runtime.js";
import {
  createItem,
  equip,
  unequip,
  computeStats,
} from "../src/equipment/items.js";
import { damageRoll, applyElement } from "../src/combat/damage.js";
import { Game } from "../src/game/game.js";
import { SaveManager } from "../src/save/storage.js";
function game() {
  const g = new Game();
  const map = new Map();
  g.save = new SaveManager({
    getItem: (k) => map.get(k) || null,
    setItem: (k, v) => map.set(k, v),
  });
  g.input = { vector: () => ({ x: 0, z: 0 }), reset() {} };
  g.start();
  return g;
}
test("Seeded loot has all rarities, slots and random affixes", () => {
  const rng = new Random(18),
    items = Array.from({ length: 5000 }, () => createItem(rng, 3));
  assert.equal(new Set(items.map((i) => i.quality)).size, 6);
  assert.equal(new Set(items.map((i) => i.slot)).size, 8);
  assert(items.every((i) => Object.keys(i.stats).length > 0));
  assert.equal(new Set(items.map((i) => i.id)).size, 5000);
});
test("Equip and unequip preserve item identity and restore stats", () => {
  const g = game(),
    p = g.player,
    base = computeStats(p),
    i = createItem(g.rng, 4, 5);
  p.inventory.push(i);
  assert(equip(p, i.id));
  assert.equal(p.equipped[i.slot].id, i.id);
  assert(unequip(p, i.slot));
  assert.deepEqual(computeStats(p), base);
  assert.equal(p.inventory.length, 1);
});
test("Defense and resistance reduce damage; elemental reactions work", () => {
  const a = damageRoll({ attack: 100 }, new Random(4)),
    b = damageRoll({ attack: 100, defense: 100, resist: 0.5 }, new Random(4));
  assert(b.amount < a.amount * 0.3);
  const e = { status: { wet: 3 } };
  assert.equal(applyElement(e, "lightning"), "chain");
  applyElement(e, "ice");
  applyElement(e, "ice");
  assert(e.status.freeze > 0);
  assert.equal(applyElement(e, "physical", true), "shatter");
});
test("Menu pause freezes mana, AI, cooldowns and player position", () => {
  const g = game();
  g.player.cooldowns[0] = 5;
  g.state = "PAUSED";
  const p = JSON.stringify(g.player),
    ai = g.enemies[0].ai.decisions;
  for (let i = 0; i < 120; i++) g.update(1 / 60);
  assert.equal(JSON.stringify(g.player), p);
  assert.equal(g.enemies[0].ai.decisions, ai);
});
test("Skills spend mana once and start cooldown on actual release", () => {
  const g = game();
  assert.deepEqual(g.player.cooldowns, [0, 0, 0, 0, 0]);
  const mp = g.player.mp;
  g.cast(0);
  assert.equal(g.player.mp, mp - 18);
  assert(g.player.cooldowns[0] > 0);
  g.cast(0);
  assert.equal(g.player.mp, mp - 18);
});
test("Dodge consumes stamina, grants i-frames and restores over time", () => {
  const g = game();
  g.enemies = [];
  g.cleared = true;
  g.dodge();
  assert.equal(g.player.stamina, 72);
  const hp = g.player.hp;
  g.hurt(100);
  assert.equal(g.player.hp, hp);
  for (let i = 0; i < 180; i++) g.update(1 / 60);
  assert.equal(g.player.stamina, 100);
  assert.equal(g.player.dash, null);
});
test("Four combo attacks have delayed hit windows and final finisher", () => {
  const g = game();
  g.enemies = [];
  g.cleared = true;
  for (let i = 1; i <= 4; i++) {
    g.attack();
    assert.equal(g.player.combo, i);
    assert.equal(g.player.attack.hit, false);
    const d = g.player.attack.duration;
    for (let t = 0; t < d + 0.02; t += 1 / 60) g.update(1 / 60);
  }
  assert.equal(g.metrics.combo, 4);
});
test("Boss decision differs with distance and respects cooldowns", () => {
  const g = game();
  g.enemies = [];
  const b = g.spawn("boss", 0, 0);
  b.ai.set("Observe");
  g.player.x = 1;
  b.ai.boss(g, 1);
  assert(["slash", "combo", "sweep", "aoe", "summon"].includes(b.ai.move));
  const first = b.ai.move;
  b.ai.set("Observe");
  b.ai.boss(g, 15);
  assert.notEqual(b.ai.move, first);
  assert(b.ai.cooldowns[first] > 0);
  assert.equal(b.ai.scores[first], undefined);
});
test("Boss phases change at 70 and 40 percent; dead AI stops", () => {
  const g = game();
  g.enemies = [];
  const b = g.spawn("boss", 0, 0);
  b.hp = b.maxHp * 0.69;
  b.ai.update(0.1, g);
  assert.equal(b.ai.phase, 2);
  b.hp = b.maxHp * 0.39;
  b.ai.update(0.1, g);
  assert.equal(b.ai.phase, 3);
  b.hp = 0;
  const n = b.ai.decisions;
  b.ai.update(1, g);
  assert.equal(b.ai.state, "Death");
  assert.equal(b.ai.decisions, n);
});
test("Combat clear produces a boon; route advances and resets entities", () => {
  const g = game();
  g.enemies.forEach((e) => g.rawDamage(e, 1e6));
  g.update(1 / 60);
  assert.equal(g.state, "ROOM_CLEAR");
  assert.equal(g.cleared, true);
  g.chooseBoon({ stat: "attack", value: 5 });
  assert.equal(g.state, "PLAYING");
  g.enterRoom(1, "rest");
  assert.equal(g.enemies.length, 0);
  assert.equal(g.room, 1);
});
test("Run save restores inventory, world edits, stats and settings", () => {
  const g = game();
  g.player.inventory.push(createItem(g.rng, 2, 4));
  g.props[0].hp = 0;
  g.player.gold = 99;
  g.settings.music = 0.1;
  g.persist();
  const data = g.save.read();
  assert.equal(data.settings.music, 0.1);
  const h = game();
  h.saved = data;
  assert(h.continue());
  assert.equal(h.player.gold, 99);
  assert.equal(h.player.inventory[0].id, g.player.inventory[0].id);
  assert.equal(h.props[0].hp, 0);
});
test("Death clears run, retains meta, retry resets temporary boons", () => {
  const g = game();
  g.player.boons.push({ stat: "attack", value: 100 });
  g.metrics.kills = 12;
  g.player.invulnerable = 0;
  g.hurt(1e6);
  assert.equal(g.state, "PLAYER_DEAD");
  assert.equal(g.saved.run, null);
  assert.equal(g.meta.shards, 5);
  g.start();
  assert(g.player.stats.attack < 100);
  assert.equal(g.meta.shards, 5);
});
test("Corrupt and blocked storage fail safely", () => {
  const s = new SaveManager({
    getItem: () => "{",
    setItem: () => {
      throw Error("blocked");
    },
  });
  assert.equal(s.read(), null);
  assert.equal(s.write({}), false);
});
test("Event unsubscribe prevents stale UI listeners", () => {
  const b = new EventBus();
  let n = 0;
  const off = b.on("x", () => n++);
  b.emit("x");
  off();
  b.emit("x");
  assert.equal(n, 1);
});
