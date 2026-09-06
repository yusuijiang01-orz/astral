# 星隙行者 / Astral Rift

> V2-A.1：QA/Production 资产分级与软件 WebGL 验收。当前分支 `v2-a-visual-foundation`，Draft PR #1，未合并 main。新门禁见 [V2_GATES.md](docs/V2_GATES.md)。

默认入口为明确标记的 QA 渲染检查场景；`?qa=1` 同样进入检查，`?debugAssets=1` 才进入旧游戏原型。QA GLB 和纹理为原创 CC0 测试夹具，不能作为正式美术结果。

**状态：开发检查点，不是完成验收的正式成品。**

按随附原始需求从零建立的独立 Three.js 移动横屏 Roguelike ARPG 工程。没有修改或依赖用户的其他游戏项目。

## 运行

Node.js 22 或满足 Vite 7 要求的较新 Node.js：

```bash
npm ci
npm run dev
```

浏览器访问终端输出的地址。手机与开发电脑应处于可互通网络，使用电脑的局域网地址。手机须旋转至横屏；不能锁定屏幕方向的浏览器会显示操作指引。

随包 `dist/` 是预构建静态文件，依赖已打包，运行时无外部 CDN 或字体请求。可将 `dist/` 内容放入静态 Web 服务器；不能通过双击 HTML 的 `file://` 方式运行 ES Modules。

```bash
python3 -m http.server 8080 --directory dist
```

## 旧原型功能（仅 debugAssets 模式）

- 3D 程序场景、透视跟随摄像机、有限 Yaw/Pitch、动态阴影、实例化草、固定容量粒子。
- 主菜单、双角色起始属性选择、横屏提示、摇杆、技能半环布局、键鼠和 Pointer Events 输入。
- 四段普通攻击、延迟命中、HitStop、闪避无敌、完美闪避、四个元素技能与充能终结技。
- 七类普通敌人、分频决策、分离和进攻数量限制、精英行为词缀、三阶段条件加权 Boss。
- 六种装备品质、八装备槽、随机词条、地面掉落、拾取、对比、装备、卸下、锁定与丢弃。
- 七区域随机分支、三选一强化、商人、祭坛、休息、宝藏、最终 Boss、死亡/胜利和重新开始。
- 本轮存档、设置、永久星核和生命升级；程序配乐与交互音效。

**上述为当前代码覆盖范围，不表示所有画面和操作已在浏览器验收。** 详细差距见 `docs/ACCEPTANCE.md`。

## 操作

| 操作 | 键盘 / 触摸 |
|---|---|
| 移动 | WASD / 方向键 / 左摇杆 |
| 普攻 | J / Space / 攻击按钮 |
| 闪避 | K / 左 Shift / 闪避按钮 |
| 四技能 | 1–4 / 技能按钮 |
| 星冠 | R / 星冠按钮（满充能） |
| 交互 | E / 附近交互按钮 |
| 背包 | I / 菜单 |
| 暂停 | Esc / 右上菜单 |
| 有限旋转 | 右侧空白区域拖动 |
| 调试 | 开发服务器按 P，正式构建隐藏 |

## 验证

```bash
npm test
npm run build
```

目前 32 项 Node / JSDOM 测试通过，生产构建成功。JSDOM 测试不执行真实 WebGL、不验证真实多点触控、画面或音频输出。

图形验收由 `Software WebGL Renderer QA` Actions 执行，运行 Chromium/Playwright + SwiftShader，上传 Bloom 开/关截图、Lighting 对照和 report.json。云端 Disabled GPU 是 ENVIRONMENT_LIMITATION，不是项目门禁失败。真机 GPU、多点触控、FPS、发热均为 REAL_DEVICE_NOT_VERIFIED。

本地具备 Chromium 环境时，可启动开发服务后执行 `npm run test:renderer`。软件光栅化结果不等于真机性能。

## 源码仓库

仓库：https://github.com/yusuijiang01-orz/astral

本仓库保存开发检查点，尚未完成最终游戏验收。已包含 GitHub Actions 配置，每次提交和 PR 执行测试与生产构建。

```bash
git clone https://github.com/yusuijiang01-orz/astral.git
cd astral
npm ci
npm test
npm run dev
```

`node_modules/`、ZIP 和 `dist/` 不加入源码仓库。需要静态部署文件时执行：

```bash
npm run build
```

此前下载包内的 `dist/` 是当时的预构建文件，仓库构建产物以当前源码为准。

## 模块

- `src/core`：事件、随机、数学与池工具。
- `src/data`：技能、装备、敌人、Boss 招式与强化数据。
- `src/game`：状态和循环编排。
- `src/ai`：独立于 Three.js 的敌人决策。
- `src/combat`、`equipment`：伤害、元素和装备。
- `src/world`：Three.js 场景、程序角色、粒子、GPU 资源管理。
- `src/input`、`ui`、`audio`、`save`：输入、界面、程序声音与存档。

## 资源

场景、角色和声音为程序生成。Three.js MIT 许可见 `docs/THREE-LICENSE.txt`。本工程未声明为任何现有商业游戏的复刻。
