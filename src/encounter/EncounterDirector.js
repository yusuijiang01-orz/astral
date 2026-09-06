const PACKS = Object.freeze({
  combat: [
    ["melee", 4],
    ["ranged", 2],
    ["shield", 1],
  ],
  challenge: [
    ["melee", 6],
    ["ranged", 3],
    ["caster", 2],
    ["shield", 2],
  ],
  elite: [
    ["elite", 1],
    ["melee", 4],
    ["ranged", 2],
    ["support", 1],
  ],
});

const TARGETS = Object.freeze({ combat: 18, challenge: 28, elite: 20 });
const SPAWNS = Object.freeze([
  [-18, -10],
  [-12, 11],
  [-4, -13],
  [7, 12],
  [15, -11],
  [21, 8],
  [2, -16],
  [-21, 6],
]);

/**
 * Lightweight V2 encounter bridge for the playable preview.
 * It keeps the existing simulation authoritative while adding pack/wave pressure.
 */
export class EncounterDirector {
  constructor(game, { activeCap = 16 } = {}) {
    this.game = game;
    this.activeCap = activeCap;
    this.reset();
  }

  reset() {
    this.type = null;
    this.target = 0;
    this.spawned = 0;
    this.wave = 0;
    this.pending = [];
    this.nextSpawn = 0;
    this.completed = true;
  }

  onRoomEntered({ type }) {
    this.reset();
    if (!TARGETS[type]) return;
    this.type = type;
    this.target = TARGETS[type];
    this.completed = false;
    this.wave = 1;

    // Existing room spawn is retained as wave 1, but spread into the wider arena.
    const living = this.game.enemies.filter((e) => e.hp > 0);
    living.forEach((e, i) => this.place(e, i));
    this.spawned = living.length;

    // Queue enough enemies to reach the encounter target without breaking active cap.
    this.pending = this.compose(type, Math.max(0, this.target - this.spawned));
    this.game.bus.emit("TOAST", `遭遇战 · Wave ${this.wave}`);
  }

  compose(type, count) {
    const recipe = PACKS[type] || PACKS.combat;
    const list = [];
    let cursor = 0;
    while (list.length < count) {
      const [kind, amount] = recipe[cursor % recipe.length];
      for (let i = 0; i < amount && list.length < count; i++) list.push(kind);
      cursor++;
    }
    return list;
  }

  place(enemy, index) {
    const [x, z] = SPAWNS[index % SPAWNS.length];
    enemy.x = x + ((index * 7) % 5) - 2;
    enemy.z = z + ((index * 11) % 5) - 2;
    this.game.clampActor(enemy);
  }

  spawnOne() {
    if (!this.pending.length) return false;
    const kind = this.pending.shift();
    const slot = this.spawned + this.pending.length;
    const [x, z] = SPAWNS[slot % SPAWNS.length];
    const enemy = this.game.spawn(kind, x, z);
    if (!enemy) {
      this.pending.unshift(kind);
      return false;
    }
    this.spawned++;
    this.place(enemy, slot);
    return true;
  }

  update(dt) {
    if (this.completed || !this.type) return;
    const living = this.game.enemies.filter((e) => e.hp > 0).length;
    this.nextSpawn -= dt;

    // Reinforce before a wave fully collapses so Game's legacy clear check cannot fire early.
    if (this.pending.length && living <= 3 && this.nextSpawn <= 0) {
      this.wave++;
      let room = Math.max(0, this.activeCap - living);
      const batch = Math.min(room, this.type === "challenge" ? 9 : 7, this.pending.length);
      for (let i = 0; i < batch; i++) this.spawnOne();
      this.nextSpawn = 0.75;
      this.game.bus.emit("TOAST", `增援抵达 · Wave ${this.wave}`);
      return;
    }

    if (!this.pending.length && living === 0) this.completed = true;
  }
}
