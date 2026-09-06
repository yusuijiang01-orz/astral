import { Game } from "../game/game.js";
import { WorldView } from "../world/scene.js";
import { Controls } from "../input/controls.js";
import { Interface } from "../ui/interface.js";
import { AudioManager } from "../audio/sound.js";
import { createAstralForest } from "../world/forest/AstralForestRuins.js";
import { EncounterDirector } from "../encounter/EncounterDirector.js";

function addPreviewBadge() {
  const badge = document.createElement("div");
  badge.id = "asset-status";
  badge.textContent =
    "V2 PLAYABLE PREVIEW · FOREST IN PROGRESS · PROTOTYPE ACTORS · REAL_DEVICE_NOT_VERIFIED";
  document.body.append(badge);
  return badge;
}

/**
 * Connects the authored V2 forest to the existing proven gameplay simulation.
 * Character/enemy visuals remain explicitly prototype until V2-C/D production assets land.
 */
export async function createV2PlayablePreview({ pipeline, canvas }) {
  const forest = await createAstralForest(pipeline);
  const game = new Game();
  const ui = new Interface(game);
  const world = new WorldView(canvas, { pipeline, debugAssets: true });
  const director = new EncounterDirector(game, { activeCap: 16 });
  const badge = addPreviewBadge();

  // Keep gameplay actors/VFX from the old renderer, but never show its corridor environment.
  world.env.visible = false;
  world.build = () => {
    world.env.visible = false;
  };

  // V2-B arena width: remove the old narrow z=-5.3..5.3 corridor constraint.
  game.clampActor = (entity) => {
    entity.x = Math.max(-31, Math.min(31, entity.x));
    entity.z = Math.max(-18, Math.min(18, entity.z));
  };

  game.world = world;
  game.input = new Controls(canvas, (action) => game.action(action));
  game.audio = new AudioManager();
  ui.applySettings();

  game.bus.on("ROOM_ENTERED", (payload) => {
    // Prototype destructibles were authored for the old hidden corridor. Keep simulation honest
    // by removing their invisible collision bodies until V2-B production props are integrated.
    game.props = [];
    director.onRoomEntered(payload);
  });
  game.bus.on("PLAYER_DAMAGED", () => {
    if (game.settings.vibration) navigator.vibrate?.(25);
  });

  canvas.addEventListener("webglcontextlost", onContextLost);
  function onContextLost(event) {
    event.preventDefault();
    game.action("blur");
    ui.toast("图形上下文中断，请刷新恢复存档");
  }

  let disposed = false;
  let frameId = 0;
  let last = performance.now();
  let accumulator = 0;

  function frame(now) {
    if (disposed) return;
    const actual = Math.max(0, (now - last) / 1000);
    const raw = Math.min(0.1, actual);
    last = now;
    accumulator += raw;

    let steps = 0;
    while (accumulator >= 1 / 60 && steps < 5) {
      // Director runs before Game so pending reinforcements arrive before legacy clear detection.
      director.update(1 / 60);
      game.update(1 / 60);
      accumulator -= 1 / 60;
      steps++;
    }
    if (steps === 5) accumulator = 0;

    const paused = ["PAUSED", "ROOM_CLEAR", "PLAYER_DEAD", "VICTORY"].includes(
      game.state,
    );
    world.update(game, paused ? 0 : raw);
    pipeline.sample(actual, {
      active: !paused && !document.hidden && game.state !== "MAIN_MENU",
      activeParticles: world.particleData.filter((p) => p.life > 0).length,
      activeEnemies: game.enemies.filter((e) => e.hp > 0).length,
    });
    game.fps = pipeline.quality.metrics.fps;
    game.audio.update(
      raw,
      game.state === "MAIN_MENU"
        ? "menu"
        : game.roomType === "boss"
          ? "boss"
          : "combat",
      !paused && !document.hidden,
    );
    ui.update(raw);
    frameId = requestAnimationFrame(frame);
  }

  frameId = requestAnimationFrame(frame);

  return {
    game,
    persist() {
      if (!["MAIN_MENU", "PLAYER_DEAD", "VICTORY"].includes(game.state)) game.persist();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(frameId);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      badge.remove();
      forest.dispose();
      world.dispose();
    },
  };
}
