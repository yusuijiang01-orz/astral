import "./ui/style.css";
import "./render/foundation.css";
import { Game } from "./game/game.js";
import { WorldView } from "./world/scene.js";
import { Controls } from "./input/controls.js";
import { Interface } from "./ui/interface.js";
import { AudioManager } from "./audio/sound.js";
import { RendererPipeline } from "./render/RendererPipeline.js";
import { AssetLoader } from "./assets/AssetLoader.js";
import { ASSET_MANIFEST, debugAssetsEnabled } from "./assets/manifest.js";

const canvas = document.querySelector("#world");
let pipeline,
  assets,
  game,
  frameId,
  disposed = false;
const instances = [];
function assetStatus(report, debug) {
  const badge = document.createElement("div");
  badge.id = "asset-status";
  badge.setAttribute("role", "status");
  badge.textContent = report.records.some((r) => r.status === "RUNTIME_BLOCKED")
    ? "V2-A · RUNTIME_BLOCKED · NOT COMPLETE"
    : debug
      ? "ASSET FALLBACK · PROTOTYPE · V2-A NOT COMPLETE"
      : report.ready
        ? "V2-A · ASSET REVIEW · NOT COMPLETE"
        : "V2-A · BLOCKED_BY_ASSET · NOT COMPLETE";
  document.body.append(badge);
}
function foundationPanel(report) {
  document.querySelector("#hud").hidden = true;
  const overlay = document.querySelector("#overlay");
  overlay.classList.add("active");
  overlay.replaceChildren();
  const panel = document.createElement("section");
  panel.className = "panel foundation-panel";
  const runtimeBlocked = report.records.some(
    (r) => r.status === "RUNTIME_BLOCKED",
  );
  const title = document.createElement("h2");
  title.textContent = runtimeBlocked
    ? "V2-A 图形环境不可用"
    : report.ready
      ? "V2-A 资产与渲染检查"
      : "V2-A 正式资产待接入";
  const text = document.createElement("p");
  text.textContent = runtimeBlocked
    ? "当前浏览器无法创建 WebGL 2 上下文。请在支持并启用硬件加速的浏览器检查游戏。正式资产也尚未接入，当前阶段不能通过视觉验收。"
    : report.ready
      ? "资产已通过结构检查。当前仅为视觉基础检查，尚未开放 V2 正式游戏，也未通过视觉验收。"
      : "正式角色、骨骼动画与环境材质尚未提供。按 V2 要求，默认模式不展示方块角色或圆锥树。";
  const list = document.createElement("ul");
  for (const r of report.records) {
    const li = document.createElement("li");
    li.textContent = `${r.key} · ${r.status}${r.reason ? " · " + r.reason : ""}`;
    list.append(li);
  }
  const debugLink = document.createElement("a");
  debugLink.className = "foundation-debug";
  debugLink.textContent = "进入调试原型（非正式 V2 画面）";
  const url = new URL(location.href);
  url.searchParams.set("debugAssets", "1");
  debugLink.href = url.href;
  panel.append(title, text, list, debugLink);
  if (report.ready) {
    const review = document.createElement("button");
    review.textContent = "检查已加载资产";
    review.onclick = () => {
      overlay.classList.remove("active");
      overlay.replaceChildren();
    };
    panel.append(review);
  }
  overlay.append(panel);
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
    const report = await assets.loadManifest(ASSET_MANIFEST);
    if (disposed) return;
    const debug = debugAssetsEnabled(location.search);
    assetStatus(report, debug);
    if (!debug) {
      if (report.ready) {
        for (const record of report.records) {
          const item = assets.instantiate(record, pipeline);
          instances.push(item);
          pipeline.scene.add(item.root);
          const idle = item.clips.get("Idle");
          if (idle) item.mixer.clipAction(idle).play();
        }
      }
      foundationPanel(report);
      let last = performance.now();
      const frame = (now) => {
        if (disposed) return;
        const dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        for (const item of instances) item.mixer.update(dt);
        pipeline.render(dt);
        frameId = requestAnimationFrame(frame);
      };
      frameId = requestAnimationFrame(frame);
      return;
    }
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
    const report = {
      ready: false,
      records: [
        { key: "renderer", status: "RUNTIME_BLOCKED", reason: error.message },
        ...Object.entries(ASSET_MANIFEST)
          .filter(([, c]) => !c.path)
          .map(([key]) => ({
            key,
            status: "BLOCKED_BY_ASSET",
            reason: "正式资产尚未提供",
          })),
      ],
    };
    if (!document.querySelector("#asset-status")) assetStatus(report, false);
    foundationPanel(report);
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
