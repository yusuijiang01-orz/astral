import { slots, rarities, affixes, specials } from "../data/catalog.js";
export function createItem(rng, level = 1, forced) {
  const n = rng.next();
  const quality =
    forced ??
    (n > 0.997
      ? 5
      : n > 0.97
        ? 4
        : n > 0.87
          ? 3
          : n > 0.62
            ? 2
            : n > 0.3
              ? 1
              : 0);
  const slot = rng.pick(slots);
  const power = rarities[quality][2] * (1 + level * 0.16);
  const stats = {
    [slot === "weapon" ? "attack" : slot === "armor" ? "defense" : "hp"]:
      Math.round((slot === "weapon" ? 6 : slot === "armor" ? 4 : 12) * power),
  };
  const rolls = [];
  for (let i = 0; i < Math.min(5, quality + 1); i++) {
    const [key, name, value] = rng.pick(affixes);
    stats[key] = (stats[key] || 0) + value * power;
    rolls.push(name);
  }
  return {
    id: `${rng.seed.toString(16)}-${Math.floor(rng.next() * 1e9)}`,
    slot,
    quality,
    level,
    stats,
    prefix: rolls[0],
    suffix: rolls.at(-1),
    name: `${rolls[0]}·${["星铁刃", "棱冠", "月纹甲", "符文手套", "旅靴", "晶戒", "棱戒", "星坠"][slots.indexOf(slot)]}`,
    special: quality >= 3 ? rng.pick(specials) : null,
    legendary: quality >= 4 ? "星火：技能附加攻击力 20% 的火伤" : null,
    locked: false,
  };
}
export function computeStats(player) {
  const s = {
    attack: 23,
    defense: 4,
    hp: 180,
    mana: 100,
    crit: 0.08,
    critDamage: 1.6,
    attackSpeed: 1,
    speed: 4.6,
    cdr: 0,
    leech: 0,
    recovery: 22,
    resist: 0,
    luck: 0,
    fire: 0,
    ice: 0,
    lightning: 0,
    wind: 0,
    void: 0,
    holy: 0,
    nature: 0,
  };
  for (const item of Object.values(player.equipped || {}))
    if (item)
      for (const [k, v] of Object.entries(item.stats)) s[k] = (s[k] || 0) + v;
  for (const b of player.boons || [])
    if (b.stat) s[b.stat] = (s[b.stat] || 0) + b.value;
  s.hp += ((player.level || 1) - 1) * 12;
  s.attack += ((player.level || 1) - 1) * 2;
  s.cdr = Math.min(0.65, s.cdr);
  s.crit = Math.min(0.85, s.crit);
  s.resist = Math.min(0.7, s.resist);
  return s;
}
export const hasSpecial = (p, id) =>
  (p.boons || []).some((b) => b.special === id) ||
  Object.values(p.equipped || {}).some((i) => i?.special === id);
export function equip(p, id) {
  const i = p.inventory.find((i) => i.id === id);
  if (!i) return false;
  const old = p.equipped[i.slot];
  p.inventory = p.inventory.filter((x) => x.id !== id);
  if (old) p.inventory.push(old);
  p.equipped[i.slot] = i;
  return true;
}
export function unequip(p, slot) {
  if (!p.equipped[slot]) return false;
  p.inventory.push(p.equipped[slot]);
  delete p.equipped[slot];
  return true;
}
