import "./ui/style.css";
import { Game } from "./game/game.js";
import { WorldView } from "./world/scene.js";
import { Controls } from "./input/controls.js";
import { Interface } from "./ui/interface.js";
import { AudioManager } from "./audio/sound.js";
const game = new Game();
const ui = new Interface(game);
try {
  game.world = new WorldView(document.querySelector("#world"));
  game.input = new Controls(document.querySelector("#world"), (a) =>
    game.action(a),
  );
  game.audio = new AudioManager();
  ui.applySettings();
  game.bus.on("PLAYER_DAMAGED", () => {
    if (game.settings.vibration) navigator.vibrate?.(25);
  });
  let last = performance.now(),
    acc = 0,
    perfTime = 0,
    frames = 0,
    bad = 0;
  function frame(now) {
    const raw = Math.min(0.1, (now - last) / 1000);
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
    frames++;
    perfTime += raw;
    if (perfTime > 2) {
      game.fps = frames / perfTime;
      frames = 0;
      perfTime = 0;
      if (game.fps < 40 && !paused) {
        bad++;
        if (bad >= 3 && game.settings.scale > 0.65) {
          game.settings.scale = Math.max(0.65, game.settings.scale - 0.1);
          game.world.settings(game.settings);
          bad = 0;
        }
      } else bad = 0;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  document.querySelector("#world").addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    game.action("blur");
    ui.toast("图形上下文中断，请刷新恢复存档");
  });
  window.addEventListener("beforeunload", () => {
    if (!["MAIN_MENU", "PLAYER_DEAD", "VICTORY"].includes(game.state))
      game.persist();
  });
} catch (e) {
  console.error(e);
  ui.panel("无法启动图形引擎", false);
  document
    .querySelector(".panel")
    .insertAdjacentHTML(
      "beforeend",
      "<p>当前浏览器无法创建 WebGL 2。请启用硬件加速或使用支持 WebGL 2 的浏览器。</p>",
    );
}
