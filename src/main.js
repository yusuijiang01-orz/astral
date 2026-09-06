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
let pipeline,
  assets,
  game,
  frameId,
  disposed = false;
const instances = [];
function showFailure(error) {
  document.querySelector('#hud').hidden = true;
  const overlay=document.querySelector('#overlay'); overlay.classList.add('active'); overlay.replaceChildren();
  const panel=document.createElement('section'); panel.className='panel foundation-panel';
  const title=document.createElement('h2'); title.textContent=pipeline ? 'Runtime error' : 'ENVIRONMENT_LIMITATION';
  const text=document.createElement('p'); text.textContent=pipeline ? error.message : '当前执行环境无法创建 WebGL。此限制不阻止开发；渲染验收以 Actions SwiftShader 实测为准。';
  panel.append(title,text);overlay.append(panel);
}
function cleanup() {
  if (disposed) return;
  disposed = true;
  cancelAnimationFrame(frameId);
  for (const item of instances) item.dispose();
  if (game?.world) game.world.dispose();
  else pipeline?.dispose();
  void assets?.dispose();
}
function runGame(ui) {
  let last = performance.now(),
    acc = 0;
  function frame(now) {
    if (disposed) return;
    const actual = (now - last) / 1000;
    const raw = Math.min(0.1, actual);
    last = now;
    acc += raw;
    let count = 0;
    while (acc >= 1 / 60 && count < 5) {
      game.update(1 / 60);
      acc -= 1 / 60;
      count++;
    }
    if (count === 5) acc = 0;
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
async function boot() {
  try {
    pipeline = new RendererPipeline(canvas);
    assets = new AssetLoader(pipeline.renderer);
    if (!debugAssetsEnabled(location.search)) {
      document.querySelector('#hud').hidden = true;
      document.querySelector('#overlay').classList.remove('active');
      const badge = document.createElement('div'); badge.id='asset-status';
      badge.textContent='QA_ASSET · NOT PRODUCTION ART · REAL_DEVICE_NOT_VERIFIED'; document.body.append(badge);
      const { createRendererQA } = await import('./render/RendererQA.js');
      const qa = await createRendererQA(pipeline, assets); instances.push(...qa.instances, {dispose:()=>qa.dispose()});
      let last=performance.now(); const frame=now=>{if(disposed)return;qa.update(Math.min(.05,(now-last)/1000));last=now;frameId=requestAnimationFrame(frame);};
      frameId=requestAnimationFrame(frame); return;
    }
    const badge=document.createElement('div'); badge.id='asset-status'; badge.textContent='PROTOTYPE · DEBUG ONLY · NOT PRODUCTION ART'; document.body.append(badge);
    game = new Game();
    const ui = new Interface(game);
    game.world = new WorldView(canvas, { pipeline, debugAssets: true });
    game.input = new Controls(canvas, (a) => game.action(a));
    game.audio = new AudioManager();
    ui.applySettings();
    game.bus.on("PLAYER_DAMAGED", () => {
      if (game.settings.vibration) navigator.vibrate?.(25);
    });
    canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      game.action("blur");
      ui.toast("图形上下文中断，请刷新恢复存档");
    });
    runGame(ui);
  } catch (error) {
    console.error(error);
    cleanup();
    showFailure(error);
  }
}
window.addEventListener("beforeunload", () => {
  if (game && !["MAIN_MENU", "PLAYER_DEAD", "VICTORY"].includes(game.state))
    game.persist();
});
window.addEventListener("pagehide", cleanup);
// HMR must tear down both render targets and decoder workers before reloading the module.
if (import.meta.hot) import.meta.hot.dispose(cleanup);
void boot();
