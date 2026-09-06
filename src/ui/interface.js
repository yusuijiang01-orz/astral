import {
  skills,
  slots,
  slotNames,
  rarities,
  elements,
  enemyTypes,
  roomTypes,
  specialNames,
} from "../data/catalog.js";
import {
  equip,
  unequip,
  computeStats,
  createItem,
} from "../equipment/items.js";
import { distance } from "../core/runtime.js";
const $ = (s) => document.querySelector(s);
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const labels = {
  attack: "攻击",
  defense: "防御",
  hp: "生命",
  mana: "法力",
  crit: "暴击率",
  critDamage: "暴击伤害",
  attackSpeed: "攻速",
  speed: "移速",
  cdr: "冷却缩减",
  leech: "生命偷取",
  recovery: "闪避恢复",
  resist: "元素抗性",
  luck: "幸运 / 掉落",
  fire: "火伤",
  ice: "冰伤",
  lightning: "雷伤",
  wind: "风伤",
  void: "虚空伤",
  holy: "圣光伤",
  nature: "自然伤",
};
const fmt = (k, v) =>
  [
    "crit",
    "critDamage",
    "cdr",
    "leech",
    "resist",
    "luck",
    "fire",
    "ice",
    "lightning",
    "wind",
    "void",
    "holy",
    "nature",
  ].includes(k)
    ? `${Math.round(v * 100)}%`
    : Number(v).toFixed(v % 1 ? 1 : 0);
export class Interface {
  constructor(g) {
    this.g = g;
    this.overlay = $("#overlay");
    this.tab = null;
    this.filter = "all";
    this.uiTimer = 0;
    this.toastTimer = 0;
    this.damageNodes = new Set();
    $("#portrait").onclick = () => this.open("character");
    $("#pause").onclick = () => this.toggle();
    $("#fullscreen").onclick = () => this.fullscreen();
    g.bus.on("TOGGLE_PAUSE", () => this.toggle());
    g.bus.on("OPEN_PANEL", (tab) => this.open(tab));
    g.bus.on("CHOOSE_BOON", (b) => this.boons(b));
    g.bus.on("OPEN_ROUTE", () => this.route());
    g.bus.on("FINISH", (win) => this.finish(win));
    g.bus.on("TOAST", (t) => this.toast(t));
    g.bus.on("ITEM_PICKED", (i) => this.toast(`拾取 ${i.name}`));
    g.bus.on("ROOM_ENTERED", () =>
      this.toast(`${roomTypes[g.roomType]} · 第 ${g.room + 1} 区`),
    );
    g.bus.on("BOSS_PHASE_CHANGED", (n) =>
      this.toast(`星骸苏醒 · 第 ${n} 阶段`),
    );
    g.bus.on("DAMAGE", (e) => this.damage(e));
    this.main();
  }
  button(label, fn, cls = "") {
    const b = document.createElement("button");
    b.textContent = label;
    b.className = cls;
    b.onclick = () => {
      this.g.audio?.unlock();
      this.g.audio?.play("ui");
      fn();
    };
    return b;
  }
  clear() {
    this.overlay.innerHTML = "";
    this.overlay.classList.remove("active");
    this.tab = null;
  }
  main() {
    const g = this.g;
    this.clear();
    g.state = "MAIN_MENU";
    g.input?.reset();
    $("#hud").hidden = true;
    this.overlay.classList.add("active");
    this.overlay.innerHTML =
      '<div class="title-screen"><div class="eyebrow">THE SHATTERED SANCTUM</div><h1>星隙行者</h1><div class="english">ASTRAL RIFT</div><p>穿过破碎的星庭。<br>拾起失落的辉光，重铸你的命运。</p><div class="title-actions"></div><div class="title-foot">原创动作 Roguelike · v0.1.0 · 建议佩戴耳机</div></div>';
    const a = $(".title-actions");
    a.append(this.button("开始旅程   →", () => this.characters(), "primary"));
    const c = this.button("继续旅程", () => {
      this.clear();
      if (g.continue()) $("#hud").hidden = false;
      else this.main();
    });
    c.disabled = !g.saved?.run;
    a.append(
      c,
      this.button("角色", () => this.characters()),
      this.button("设置", () => this.open("settings")),
      this.button("制作名单", () => this.open("credits")),
    );
  }
  characters() {
    this.panel("选择行者", false);
    const cards = document.createElement("div");
    cards.className = "cards";
    for (const [c, name, text, icon] of [
      ["warden", "棱光卫士", "防御 +3。持星铁刃的遗迹守护者。", "♜"],
      ["seer", "星潮术士", "法力 +30。以元素重塑星隙的远行者。", "✦"],
    ]) {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `<div class="symbol">${icon}</div><h3>${name}</h3><p>${text}</p>`;
      card.append(
        this.button(
          "以此角色开始",
          () => {
            this.fullscreen();
            this.clear();
            this.g.start(c);
            $("#hud").hidden = false;
          },
          "primary",
        ),
      );
      cards.append(card);
    }
    $(".panel").append(cards);
  }
  async fullscreen() {
    try {
      await document.documentElement.requestFullscreen?.();
      await screen.orientation?.lock?.("landscape");
    } catch {
      if (innerHeight > innerWidth) this.toast("请关闭竖屏锁定并旋转手机");
    }
  }
  panel(title, pause = true) {
    if (pause && ["PLAYING", "BOSS"].includes(this.g.state))
      this.g.state = "PAUSED";
    this.g.input?.reset();
    this.clear();
    this.overlay.classList.add("active");
    this.overlay.innerHTML = `<section class="panel"><div class="panel-head"><h2>${title}</h2><button class="close" aria-label="关闭面板">×</button></div></section>`;
    $(".close").onclick = () => this.close();
  }
  close() {
    if (this.g.state === "MAIN_MENU") {
      this.main();
      return;
    }
    if (["ROOM_CLEAR", "VICTORY", "PLAYER_DEAD"].includes(this.g.state)) return;
    this.clear();
    this.g.state = this.g.roomType === "boss" ? "BOSS" : "PLAYING";
    this.g.input?.reset();
    this.g.persist();
  }
  toggle() {
    if (this.g.state === "PAUSED") this.close();
    else if (["PLAYING", "BOSS"].includes(this.g.state)) this.open("pause");
  }
  open(tab) {
    const title =
      {
        pause: "旅程暂停",
        character: "行者 · 装备",
        inventory: "行囊",
        skills: "星术",
        boons: "本轮强化",
        codex: "异兽图鉴",
        map: "星隙路线",
        settings: "设置",
        credits: "制作名单",
        shop: "星庭商人",
        event: "残响祭坛",
      }[tab] || tab;
    this.panel(title);
    this.tab = tab;
    const body = $(".panel");
    if (tab === "pause") {
      const grid = document.createElement("div");
      grid.className = "menu-grid";
      for (const [t, label] of [
        ["resume", "继续游戏"],
        ["character", "角色"],
        ["character", "装备"],
        ["inventory", "背包"],
        ["skills", "技能"],
        ["boons", "Roguelike 强化"],
        ["codex", "图鉴"],
        ["map", "地图"],
        ["settings", "设置"],
        ["settings", "音效设置"],
        ["settings", "画面设置"],
        ["settings", "操作设置"],
        ["main", "返回主菜单"],
        ["quit", "退出游戏"],
      ])
        grid.append(
          this.button(label, () => {
            if (t === "resume") this.close();
            else if (t === "main" || t === "quit") {
              this.g.persist();
              this.main();
              if (t === "quit") this.toast("进度已保存，可以关闭浏览器标签页");
            } else this.open(t);
          }),
        );
      body.append(grid);
    }
    if (tab === "character") this.character(body);
    if (tab === "inventory") this.inventory(body);
    if (tab === "skills") this.skills(body);
    if (tab === "settings") this.settings(body);
    if (tab === "map") this.map(body);
    if (tab === "boons") {
      body.innerHTML +=
        '<div class="cards">' +
        (this.g.player.boons
          .filter((b) => b.name)
          .map(
            (b) => `<div class="card"><h3>${b.name}</h3><p>${b.text}</p></div>`,
          )
          .join("") || "<p>清空战斗房间后选择强化。</p>") +
        "</div>";
    }
    if (tab === "codex")
      body.innerHTML +=
        '<div class="cards">' +
        Object.entries(enemyTypes)
          .map(
            ([k, e]) =>
              `<div class="card"><h3>${e.name}</h3><p>生命 ${e.hp} · 攻击 ${e.damage}<br>${{ melee: "斩击、二连击；攻击后退让", ranged: "保持距离，射击与散射", shield: "正面格挡；绕后与重击破盾", charger: "红圈预警后冲锋，冲锋后长硬直", caster: "魔弹与地面领域", agile: "侧闪、背刺与游走", support: "治疗、护盾与远程支援", elite: "反击、旋斩、跃击和行为词缀", boss: "三个阶段；距离与行为驱动的招式选择" }[k]}</p></div>`,
          )
          .join("") +
        "</div>";
    if (tab === "credits")
      body.innerHTML +=
        "<p>世界、角色、场景与程序配乐：Astral Rift 原创实现。<br>渲染：Three.js（MIT）。构建：Vite（MIT）。<br>角色与场景使用程序几何体；音乐由 Web Audio 实时合成。</p>";
    if (tab === "shop") this.shop(body);
    if (tab === "event") this.event(body);
  }
  character(body) {
    const p = this.g.player;
    body.innerHTML +=
      '<div class="two-col"><div><div class="portrait-large">✦</div><div class="slots"></div></div><div><h3>Lv.' +
      p.level +
      " · 战力 " +
      Math.round(p.stats.attack * 5 + p.stats.defense * 3 + p.stats.hp * 0.4) +
      '</h3><div class="stat-list">' +
      Object.entries(p.stats)
        .map(
          ([k, v]) =>
            `<div><span>${labels[k] || k}</span><strong>${fmt(k, v)}</strong></div>`,
        )
        .join("") +
      "</div></div></div>";
    slots.forEach((s, i) => {
      const item = p.equipped[s],
        b = this.button(`${slotNames[i]} · ${item?.name || "空"}`, () =>
          item ? this.itemDetail(item, true) : this.open("inventory"),
        );
      if (item) b.style.color = rarities[item.quality][1];
      $(".slots").append(b);
    });
  }
  inventory(body) {
    const p = this.g.player;
    body.innerHTML += `<p>金币 ${p.gold} · 星屑 ${p.materials} · 药剂 ${p.potions} · 星骸碎片 ${p.quest} · ${p.inventory.length}/80</p><div class="toolbar"><select aria-label="背包筛选"><option value="all">全部装备</option>${slots.map((s, i) => `<option value="${s}">${slotNames[i]}</option>`).join("")}</select></div><div class="inventory-grid"></div>`;
    const select = $("select");
    select.value = this.filter;
    select.onchange = () => {
      this.filter = select.value;
      this.open("inventory");
    };
    $(".toolbar").append(
      this.button("品质排序", () => {
        p.inventory.sort((a, b) => b.quality - a.quality);
        this.open("inventory");
      }),
      this.button("使用药剂", () => {
        if (p.potions > 0 && p.hp < p.stats.hp) {
          p.potions--;
          p.hp = Math.min(p.stats.hp, p.hp + p.stats.hp * 0.45);
          this.g.persist();
          this.open("inventory");
        }
      }),
    );
    const list = p.inventory.filter(
      (i) => this.filter === "all" || i.slot === this.filter,
    );
    if (!list.length)
      $(".inventory-grid").innerHTML =
        "<p>暂无装备。击败敌人后靠近光柱拾取。</p>";
    for (const item of list) {
      const b = this.button("", () => this.itemDetail(item, false), "item");
      b.style.setProperty("--rarity", rarities[item.quality][1]);
      b.innerHTML = `${rarities[item.quality][0]} ${item.locked ? "◆" : ""}<strong>${esc(item.name)}</strong><small>Lv.${item.level}</small>`;
      $(".inventory-grid").append(b);
    }
  }
  itemDetail(item, equipped) {
    const p = this.g.player;
    this.panel(item.name);
    const body = $(".panel"),
      old = p.equipped[item.slot];
    const copy = structuredClone(p);
    copy.equipped[item.slot] = item;
    const after = computeStats(copy);
    body.innerHTML += `<p style="color:${rarities[item.quality][1]}">${rarities[item.quality][0]} · ${slotNames[slots.indexOf(item.slot)]} · Lv.${item.level}</p><div class="stat-list">${Object.entries(
      item.stats,
    )
      .map(
        ([k, v]) =>
          `<div><span>${labels[k]}</span><strong>+${fmt(k, v)}</strong></div>`,
      )
      .join(
        "",
      )}</div><p>${item.special ? specialNames[item.special] : ""}<br>${item.legendary || ""}</p>`;
    if (!equipped)
      body.innerHTML +=
        '<h3>与当前装备比较</h3><div class="stat-list">' +
        Object.keys(after)
          .filter((k) => Math.abs(after[k] - p.stats[k]) > 0.001)
          .map((k) => {
            const d = after[k] - p.stats[k];
            return `<div><span>${labels[k]}</span><span class="${d > 0 ? "positive" : "negative"}">${d > 0 ? "↑" : "↓"} ${fmt(k, Math.abs(d))}</span></div>`;
          })
          .join("") +
        "</div>";
    const actions = document.createElement("div");
    actions.className = "toolbar";
    actions.style.marginTop = "20px";
    actions.append(
      this.button(
        equipped ? "卸下" : "装备",
        () => {
          equipped ? unequip(p, item.slot) : equip(p, item.id);
          this.g.recalculate();
          this.g.persist();
          this.open(equipped ? "character" : "inventory");
        },
        "primary",
      ),
      this.button(item.locked ? "解除锁定" : "锁定", () => {
        item.locked = !item.locked;
        this.g.persist();
        this.itemDetail(item, equipped);
      }),
    );
    const drop = this.button("丢到地面", () => {
      if (equipped) delete p.equipped[item.slot];
      else p.inventory = p.inventory.filter((i) => i.id !== item.id);
      this.g.drop(item, p);
      this.g.recalculate();
      this.g.persist();
      this.open("inventory");
    });
    drop.disabled = item.locked;
    actions.append(drop);
    body.append(actions);
  }
  skills(body) {
    const p = this.g.player;
    body.innerHTML += `<p>星术点数：${p.skillPoints} · 升级和强化各消耗 1 点</p><div class="cards"></div>`;
    skills.forEach((s, i) => {
      const c = document.createElement("div");
      c.className = "card";
      c.innerHTML = `<div class="symbol" style="color:${elements[s.element]}">${s.icon}</div><h3>${s.name} · Lv.${p.skillLevels[i]}</h3><p>${s.description}<br>伤害 ${Math.round(p.stats.attack * s.mult * (1 + (p.skillLevels[i] - 1) * 0.2))} · 法力 ${s.cost}<br>冷却 ${(s.cd * (1 - p.stats.cdr)).toFixed(1)} 秒 · 范围 ${s.range}m · ${s.element}</p>`;
      const up = this.button("升级", () => {
        p.skillPoints--;
        p.skillLevels[i]++;
        this.g.persist();
        this.open("skills");
      });
      up.disabled = p.skillPoints <= 0 || p.skillLevels[i] >= 5;
      c.append(up);
      s.nodes.forEach((name, n) => {
        const b = this.button(
          `${p.nodes[i].includes(n) ? "✓ " : ""}${name}`,
          () => {
            p.skillPoints--;
            p.nodes[i].push(n);
            this.g.persist();
            this.open("skills");
          },
          "node",
        );
        b.disabled = p.nodes[i].includes(n) || p.skillPoints <= 0;
        c.append(b);
      });
      $(".cards").append(c);
    });
  }
  settings(body) {
    const g = this.g;
    body.innerHTML +=
      '<div class="three-col"><div id="graphics"><h3>画面</h3></div><div id="audio"><h3>声音</h3></div><div id="control"><h3>操作</h3></div></div>';
    const row = (parent, label, key, type, min = 0, max = 1, step = 0.1) => {
      const l = document.createElement("label");
      l.className = "settings-row";
      const span = document.createElement("span");
      span.textContent = label;
      l.append(span);
      const input = document.createElement(
        type === "select" ? "select" : "input",
      );
      if (type === "select") {
        input.innerHTML = ["low", "medium", "high", "ultra"]
          .map(
            (v, i) =>
              `<option value="${v}">${["低", "中", "高", "极高"][i]}</option>`,
          )
          .join("");
        input.value = g.settings[key];
      } else {
        input.type = type;
        input.min = min;
        input.max = max;
        input.step = step;
        if (type === "checkbox") input.checked = g.settings[key];
        else input.value = g.settings[key];
      }
      input.oninput = () => {
        g.settings[key] =
          type === "checkbox"
            ? input.checked
            : type === "select"
              ? input.value
              : Number(input.value);
        this.applySettings();
        g.persist(g.state !== "MAIN_MENU");
      };
      l.append(input);
      $(parent).append(l);
    };
    row("#graphics", "画质", "quality", "select");
    row("#graphics", "动态阴影", "shadows", "checkbox");
    row("#graphics", "粒子特效", "particles", "checkbox");
    row("#graphics", "辉光亮度", "bloom", "checkbox");
    row("#graphics", "分辨率", "scale", "range", 0.5, 1.25, 0.05);
    for (const [key, label] of [
      ["master", "主音量"],
      ["music", "音乐"],
      ["sfx", "音效"],
      ["ui", "界面"],
    ])
      row("#audio", label, key, "range");
    row("#control", "摇杆尺寸", "joystick", "range", 0.8, 1.15, 0.05);
    row("#control", "按键尺寸", "buttons", "range", 0.8, 1.1, 0.05);
    row("#control", "镜头灵敏度", "sensitivity", "range", 0.3, 2, 0.1);
    row("#control", "振动", "vibration", "checkbox");
    $("#control").append(this.button("全屏 / 横屏", () => this.fullscreen()));
    body.insertAdjacentHTML(
      "beforeend",
      '<p style="margin-top:20px">画质与操作偏好自动保存。浏览器不允许横屏锁定时，请旋转设备。</p>',
    );
  }
  applySettings() {
    const g = this.g;
    g.world?.settings(g.settings);
    if (g.audio) g.audio.settings = g.settings;
    if (g.input) g.input.sensitivity = g.settings.sensitivity;
    document.documentElement.style.setProperty("--buttons", g.settings.buttons);
    document.documentElement.style.setProperty("--joy", g.settings.joystick);
  }
  map(body) {
    if (!this.g.route.length) {
      body.innerHTML += "<p>开始旅程后生成随机路线。</p>";
      return;
    }
    for (let i = 0; i < this.g.route.length; i++) {
      const r = this.g.route[i];
      body.innerHTML += `<div class="map-row"><strong>第 ${i + 1} 区</strong>${r.options.map((t) => `<span class="map-node ${i === this.g.room && t === r.chosen ? "current" : ""}">${roomTypes[t]} ${r.chosen === t ? "◆" : ""}</span>`).join("")}</div>`;
    }
  }
  boons(list) {
    this.panel("星隙的馈赠", false);
    $(".close").hidden = true;
    $(".panel").innerHTML +=
      '<p>选择一项强化，效果持续至本轮结束。</p><div class="cards"></div>';
    for (const b of list) {
      const c = document.createElement("div");
      c.className = "card";
      c.innerHTML = `<div class="symbol">✧</div><h3>${b.name}</h3><p>${b.text}</p>`;
      c.append(
        this.button(
          "接受馈赠",
          () => {
            this.g.chooseBoon(b);
            this.clear();
          },
          "primary",
        ),
      );
      $(".cards").append(c);
    }
  }
  route() {
    const g = this.g;
    if (g.room >= 6) {
      this.finish(true);
      return;
    }
    this.panel("前路分岔");
    $(".panel").innerHTML +=
      '<p>本区域地上的物品将留在这里，出发前请完成拾取。</p><div class="cards"></div>';
    for (const type of g.route[g.room + 1].options) {
      const c = document.createElement("div");
      c.className = "card";
      c.innerHTML = `<div class="symbol">${type === "boss" ? "♜" : "◇"}</div><h3>${roomTypes[type]}</h3>`;
      c.append(
        this.button(
          "进入区域",
          () => {
            this.clear();
            g.enterRoom(g.room + 1, type);
          },
          "primary",
        ),
      );
      $(".cards").append(c);
    }
  }
  shop(body) {
    const g = this.g,
      p = g.player;
    body.innerHTML += `<p>金币：${p.gold}</p><div class="cards"></div>`;
    for (const [label, cost, fn] of [
      ["稀有装备", 45, () => g.drop(createItem(g.rng, p.level, 2), p)],
      ["史诗装备", 95, () => g.drop(createItem(g.rng, p.level, 3), p)],
      ["治疗药剂", 15, () => p.potions++],
    ]) {
      const c = document.createElement("div");
      c.className = "card";
      c.innerHTML = `<h3>${label}</h3><p>${cost} 金币</p>`;
      const b = this.button("购买", () => {
        if (p.gold < cost) return;
        p.gold -= cost;
        fn();
        g.persist();
        this.open("shop");
      });
      b.disabled = p.gold < cost;
      c.append(b);
      $(".cards").append(c);
    }
  }
  event(body) {
    const g = this.g,
      p = g.player;
    body.innerHTML +=
      '<p>残响祭坛向你索取一缕生命，换取星术的知识。</p><div class="toolbar"></div>';
    const accept = this.button("献出 25% 生命 · 获得 2 星术点", () => {
      p.hp = Math.max(1, p.hp - p.stats.hp * 0.25);
      p.skillPoints += 2;
      g.serviceUsed = true;
      g.persist();
      this.close();
    });
    accept.disabled = p.hp <= p.stats.hp * 0.25;
    $(".toolbar").append(
      accept,
      this.button("领取 20 金币并离开", () => {
        p.gold += 20;
        g.serviceUsed = true;
        g.persist();
        this.close();
      }),
    );
  }
  finish(win) {
    const g = this.g;
    this.panel(win ? "VICTORY · 星庭重明" : "RUN FAILED · 星光未熄", false);
    $(".close").hidden = true;
    $(".panel").innerHTML +=
      `<p>本局 ${Math.floor(g.time / 60)} 分 ${Math.floor(g.time % 60)} 秒 · 击杀 ${g.metrics.kills} · Boss ${g.metrics.boss}<br>总伤害 ${Math.round(g.metrics.damage)} · 装备 ${g.metrics.loot} · 传说 ${g.metrics.legendary} · 最高连击 ${g.metrics.combo}<br>金币 ${g.player.gold} · 永久星核 ${g.meta.shards}<br>本轮构筑：${
        g.player.boons
          .filter((b) => b.name)
          .map((b) => b.name)
          .join(" / ") || "基础构筑"
      }</p><div class="toolbar"></div>`;
    $(".toolbar").append(
      this.button(
        "再次出发",
        () => {
          this.clear();
          g.start(g.player.character);
          $("#hud").hidden = false;
        },
        "primary",
      ),
      this.button("返回主菜单", () => this.main()),
    );
    const up = this.button(
      `永久生命 +8（${10 + g.meta.upgrade * 5} 星核）`,
      () => {
        g.meta.shards -= 10 + g.meta.upgrade * 5;
        g.meta.upgrade++;
        g.persist(false);
        this.finish(win);
      },
    );
    up.disabled = g.meta.shards < 10 + g.meta.upgrade * 5;
    $(".toolbar").append(up);
  }
  toast(t) {
    $("#toast").textContent = t;
    $("#toast").classList.add("show");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(
      () => $("#toast").classList.remove("show"),
      2300,
    );
  }
  damage(e) {
    if (this.damageNodes.size >= 45) return;
    const pos = this.g.world?.project(e);
    if (!pos) return;
    const n = document.createElement("span");
    n.className = `damage ${e.critical ? "crit" : ""}`;
    n.textContent = e.critical ? `${e.amount}!` : e.amount;
    n.style.color = e.critical ? "#ffe397" : elements[e.element];
    n.style.left = pos.x + "px";
    n.style.top = pos.y + "px";
    $("#numbers").append(n);
    this.damageNodes.add(n);
    setTimeout(() => {
      n.remove();
      this.damageNodes.delete(n);
    }, 800);
  }
  update(dt) {
    this.uiTimer += dt;
    if (this.uiTimer < 0.09) return;
    this.uiTimer = 0;
    const g = this.g,
      p = g.player;
    $("#level").textContent = `Lv.${p.level}`;
    for (const [key, max, cls, name] of [
      ["hp", p.stats.hp, "hp", "生命"],
      ["mp", p.stats.mana, "mp", "法力"],
      ["stamina", 100, "stamina", "闪避"],
    ]) {
      $(`.bar.${cls} i`).style.width = `${Math.max(0, (p[key] / max) * 100)}%`;
      $(`.bar.${cls} span`).textContent =
        `${name} ${Math.ceil(p[key])} / ${Math.ceil(max)}`;
    }
    $("#room-name").textContent =
      `${roomTypes[g.roomType] || "碎星遗迹"} · ${g.room + 1}`;
    $("#objective").textContent = g.cleared
      ? "沿石径向右 · 前往星门"
      : `清除异兽 · 剩余 ${g.enemies.filter((e) => e.hp > 0).length}`;
    $("#buffs").textContent = [
      p.perfect > 0 ? "✧ 完美闪避" : "",
      p.status.slow > 0 ? "❄ 迟缓" : "",
      p.dodgePower ? "➤ 反击强化" : "",
    ]
      .filter(Boolean)
      .join(" ");
    skills.forEach((s, i) => {
      const b = $(`[data-action=s${i}]`),
        cd = p.cooldowns[i];
      b.querySelector("em").style.setProperty(
        "--cooldown",
        `${(cd / s.cd) * 100}%`,
      );
      b.querySelector("em").textContent =
        cd > 0
          ? Math.ceil(cd)
          : i === 4 && p.charge < 100
            ? `${Math.floor(p.charge)}%`
            : "";
      b.disabled = cd > 0 || p.mp < s.cost || (i === 4 && p.charge < 100);
      b.classList.toggle("ready", i === 4 && p.charge >= 100);
    });
    const boss = g.enemies.find((e) => e.kind === "boss" && e.hp > 0);
    $("#bossbar").hidden = !boss;
    if (boss) {
      $("#bossbar strong").textContent = `${boss.name} · ${boss.ai.phase} / 3`;
      $("#bossbar i").style.width = `${(boss.hp / boss.maxHp) * 100}%`;
    }
    const near = g.loot.find((l) => distance(l, p) < 3),
      service =
        g.cleared &&
        !g.serviceUsed &&
        ["treasure", "rest", "event", "shop"].includes(g.roomType) &&
        distance(p, { x: 0, z: 0 }) < 4,
      gate = g.cleared && distance(p, { x: 24, z: 0 }) < 4;
    $("#interact").hidden = !(near || service || gate);
    $("#interact").textContent = near
      ? "拾取 · E"
      : gate
        ? "前往下一房间 · E"
        : `${{ treasure: "开启宝箱", rest: "休憩", event: "祭坛", shop: "商店" }[g.roomType]} · E`;
    $("#pickup-label").textContent =
      near?.item.name ||
      (g.cleared &&
      !g.serviceUsed &&
      ["treasure", "rest", "event", "shop"].includes(g.roomType)
        ? "中央石台可交互"
        : "");
    $("#pickup-label").style.color = near
      ? rarities[near.item.quality][1]
      : "#e3d6ab";
    $("#debug").hidden = !g.debug;
    if (g.debug) this.debugPanel();
  }
  debugPanel() {
    const g = this.g,
      b = g.enemies.find((e) => e.kind === "boss" && e.hp > 0),
      d = $("#debug");
    if (!d.querySelector("pre")) {
      d.innerHTML = "<pre></pre><div></div>";
      for (const [name, fn] of [
        ["无敌", () => (g.god = !g.god)],
        ["生成小怪", () => g.spawn("melee", g.player.x + 3, 0)],
        ["生成精英", () => g.spawn("elite", g.player.x + 5, 0)],
        ["生成 Boss", () => g.spawn("boss", g.player.x + 8, 0)],
        ["传说掉落", () => g.drop(createItem(g.rng, pLevel(g), 4), g.player)],
        [
          "清场",
          () =>
            g.enemies.forEach((e) => {
              if (e.hp > 0) g.rawDamage(e, 1e6);
            }),
        ],
        [
          "阶段 2",
          () => {
            const e = g.enemies.find((e) => e.kind === "boss");
            if (e) e.hp = e.maxHp * 0.69;
          },
        ],
        [
          "阶段 3",
          () => {
            const e = g.enemies.find((e) => e.kind === "boss");
            if (e) e.hp = e.maxHp * 0.39;
          },
        ],
        ["重开", () => g.start()],
        ["AI 范围", () => (g.aiDebug = !g.aiDebug)],
      ])
        d.querySelector("div").append(this.button(name, fn));
    }
    d.querySelector("pre").textContent =
      `FPS ${g.fps.toFixed(0)} · Draw ${g.world?.renderer.info.render.calls}\nTriangles ${g.world?.renderer.info.render.triangles}\nHP ${g.player.hp.toFixed(0)} · Enemies ${g.enemies.filter((e) => e.hp > 0).length}\nParticles ${g.world?.particleData.filter((p) => p.life > 0).length}\nAI ${g.aiMs.toFixed(2)}ms · God ${g.god}\nBoss ${b?.ai.state || "—"}\n${b ? JSON.stringify(b.ai.scores) : ""}`;
    if (g.aiDebug)
      for (const e of g.enemies)
        if (e.hp > 0) g.world?.ring(e, e.range, "#88dabb", 0.11);
  }
}
const pLevel = (g) => g.player.level;
