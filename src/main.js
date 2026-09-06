import "./ui/style.css";
import "./render/foundation.css";
import { Game } from "./game/game.js";
import { WorldView } from "./world/scene.js";
import { Controls } from "./input/controls.js";
import { Interface } from "./ui/interface.js";
import { AudioManager } from "./audio/sound.js";
import { RendererPipeline } from "./render/RendererPipeline.js";
import { AssetLoader } from "./assets/AssetLoader.js";
import { debugAssetsEnabled } from "./assets/manifest.js";

const canvas = document.querySelector("#world");
let pipeline;
let assets;
let game;
let playable;
let frameId = 0;
let disposed = false;
const instances = [];

function showFailure(error) {
  document.querySelector("#hud").hidden = true;
  const overlay = document.querySelector("#overlay");
  overlay.classList.add("active");
  overlay.replaceChildren();
  const panel = document.createElement("section");
  panel.className = "panel foundation-panel";
  const title = document.createElement("h2");
  title.textContent = pipeline ? "Runtime error" : "ENVIRONMENT_LIMITATION";
  const text = document.createElement("p");
  text.textContent = pipeline
    ? error.message
    : "当前执行环境无法创建 WebGL。此限制不阻止开发；渲染验收以 Actions SwiftShader 实测为准。";
  panel.append(title, text);
  overlay.append(panel);
}

function cleanup() {
  if (disposed) return;
  disposed = true;
  cancelAnimationFrame(frameId);
  if (playable) playable.dispose();
  else {
    for (const item of instances) item.dispose?.();
    if (game?.world) game.world.dispose();
    else pipeline?.dispose();
  }
  void assets?.dispose();
}

function runPrototype(ui) {
  let last = performance.now();
  let accumulator = 0;
  function frame(now) {
    if (disposed) return;
    const actual = (now - last) / 1000;
    const raw = Math.min(0.1, actual);
    last = now;
    accumulator += raw;
    let count = 0;
    while (accumulator >= 1 / 60 && count < 5) {
      game.update(1 / 60);
      accumulator -= 1 / 60;
      count++;
    }
    if (count === 5) accumulator = 0;
    const paused = ["PAUSED", "ROOM_CLEAR", "PLAYER_DEAD", "VICTORY"].includes(
      game.state,
    );
    game.world.update(game, paused ? 0 : raw);
    pipeline.sample(actual, {
      active: !paused && !document.hidden && game.state !== "MAIN_MENU",
      activeParticles: game.world.particleData.filter((p) => p.life > 0).length,
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
}

async function runReview() {
  document.querySelector("#hud").hidden = true;
  document.querySelector("#overlay").classList.remove("active");
  const { createForestReview } = await import("./world/forest/ForestReview.js");
  const review = await createForestReview(pipeline);
  instances.push(review);
  let last = performance.now();
  const frame = (now) => {
    if (disposed) return;
    review.update(Math.min(0.05, (now - last) / 1000));
    last = now;
    frameId = requestAnimationFrame(frame);
  };
  frameId = requestAnimationFrame(frame);
}

async function runQA() {
  document.querySelector("#hud").hidden = true;
  document.querySelector("#overlay").classList.remove("active");
  const badge = document.createElement("div");
  badge.id = "asset-status";
  badge.textContent = "QA_ASSET · NOT PRODUCTION ART · REAL_DEVICE_NOT_VERIFIED";
  document.body.append(badge);
  const { createRendererQA } = await import("./render/RendererQA.js");
  const qa = await createRendererQA(pipeline, assets);
  instances.push(...qa.instances, {
    dispose: () => {
      qa.dispose();
      badge.remove();
    },
  });
  let last = performance.now();
  const frame = (now) => {
    if (disposed) return;
    qa.update(Math.min(0.05, (now - last) / 1000));
    last = now;
    frameId = requestAnimationFrame(frame);
  };
  frameId = requestAnimationFrame(frame);
}

async function runDebugPrototype() {
  const badge = document.createElement("div");
  badge.id = "asset-status";
  badge.textContent = "PROTOTYPE · DEBUG ONLY · NOT PRODUCTION ART";
  document.body.append(badge);
  instances.push({ dispose: () => badge.remove() });
  game = new Game();
  const ui = new Interface(game);
  game.world = new WorldView(canvas, { pipeline, debugAssets: true });
  game.input = new Controls(canvas, (action) => game.action(action));
  game.audio = new AudioManager();
  ui.applySettings();
  game.bus.on("PLAYER_DAMAGED", () => {
    if (game.settings.vibration) navigator.vibrate?.(25);
  });
  runPrototype(ui);
}

async function boot() {
  try {
    pipeline = new RendererPipeline(canvas);
    assets = new AssetLoader(pipeline.renderer);
    const params = new URLSearchParams(location.search);

    // Explicit tools remain available, but /v2/index.html now opens the playable V2 preview.
    if (debugAssetsEnabled(location.search)) {
      await runDebugPrototype();
      return;
    }
    if (params.get("qa") === "1") {
      await runQA();
      return;
    }
    if (params.get("review") === "1") {
      await runReview();
      return;
    }

    const { createV2PlayablePreview } = await import("./v2/V2PlayablePreview.js");
    playable = await createV2PlayablePreview({ pipeline, canvas });
    game = playable.game;
  } catch (error) {
    console.error(error);
    cleanup();
    showFailure(error);
  }
}

window.addEventListener("beforeunload", () => {
  if (playable) playable.persist();
  else if (game && !["MAIN_MENU", "PLAYER_DEAD", "VICTORY"].includes(game.state))
    game.persist();
});
window.addEventListener("pagehide", cleanup);
if (import.meta.hot) import.meta.hot.dispose(cleanup);
void boot();
