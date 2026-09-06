import { clamp } from "../core/runtime.js";
export function damageRoll(
  {
    attack,
    mult = 1,
    crit = 0.08,
    critDamage = 1.6,
    elementBonus = 0,
    defense = 0,
    resist = 0,
    reduction = 0,
  },
  rng,
) {
  const critical = rng.next() < crit;
  const amount = Math.max(
    1,
    Math.round(
      attack *
        mult *
        (critical ? critDamage : 1) *
        (1 + elementBonus) *
        (100 / (100 + Math.max(0, defense))) *
        (1 - clamp(resist, 0, 0.85)) *
        (1 - clamp(reduction, 0, 0.9)) *
        rng.range(0.92, 1.08),
    ),
  );
  return { amount, critical };
}
export function applyElement(target, element, heavy = false) {
  target.status ||= {};
  let reaction = null;
  if (element === "fire") target.status.burn = 4;
  if (element === "ice") {
    target.status.chill = (target.status.chill || 0) + 1;
    target.status.slow = 3;
    if (target.status.chill >= 2) {
      target.status.freeze = 1.8;
      target.status.chill = 0;
    }
  }
  if (element === "lightning") {
    target.status.shock = 2;
    if (target.status.wet > 0) reaction = "chain";
  }
  if (element === "wind" && target.status.burn > 0) reaction = "spread";
  if (element === "nature") target.status.poison = 4;
  if (element === "void") target.status.curse = 4;
  if (heavy && target.status.freeze > 0) {
    reaction = "shatter";
    target.status.freeze = 0;
  }
  return reaction;
}
