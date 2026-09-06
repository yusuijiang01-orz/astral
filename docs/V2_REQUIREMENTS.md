# ASTRAL RIFT V2 — Codex 全面视觉与战斗体验重构提示词

你现在接手的是一个已经存在的 Three.js + Vite 移动端横屏 Roguelike ARPG 项目：

- Repository: `yusuijiang01-orz/astral`
- 技术栈：Three.js、Vite、JavaScript ES Modules、HTML/CSS、Web Audio
- 当前已经具备：基础角色控制、普通攻击、4 技能、闪避、敌人 AI、精英怪、Boss、装备、随机词条、掉落、背包、Roguelike 路线、菜单、存档、GitHub Pages 自动部署
- 当前主要问题不是“缺功能”，而是**视觉品质、战斗密度、刷怪节奏和地图结构严重偏离目标**

这次任务不是继续扩充功能，而是进行一次严格受控的：

# V2 Vertical Slice / 视觉与战斗体验重构

目标是先把一个 3~5 分钟可玩的战斗区域做到“最终游戏方向”的品质。

---

# 0. 第一原则：不要再扩功能

本阶段禁止主动增加：

- 新职业
- 新主线任务
- 新世界地图
- 新经济系统
- 新社交系统
- 新宠物
- 新制造系统
- 新成就系统
- 大量新 Boss
- 大量新装备类别
- 大量新菜单页面

除非它们是完成本次 Vertical Slice 必不可少的内容。

本阶段唯一目标：

> **让游戏看起来像高品质日式二次元幻想 ARPG，并且玩起来像高密度刷怪、爆装、Build 驱动的动作 Roguelike ARPG。**

优先级：

```text
视觉方向正确
>
战斗密度与刷怪节奏
>
打击反馈
>
敌群组合与 Encounter Director
>
掉落与刷宝反馈
>
地图空间
>
移动端性能
>
原有系统兼容
>
新增内容数量
```

---

# 1. 禁止重新生成一个新 Demo

必须在现有仓库基础上重构。

开始前先检查：

```text
src/world/
src/game/
src/ai/
src/combat/
src/equipment/
src/ui/
src/data/
src/input/
src/audio/
src/save/
```

必须优先复用当前已经可工作的：

- Damage System
- Equipment / Affix
- Inventory
- Skill Data
- Save System
- Input System
- EventBus
- Enemy AI 框架
- Boss AI 框架
- GitHub Pages workflow

除非确认现有实现阻碍本次目标，否则不得无理由推翻。

---

# 2. 当前版本明确判定为 Prototype

当前画面中以下内容只允许继续作为调试或临时开发资源：

- BoxGeometry 人物
- Sphere / Icosahedron 头部
- ConeGeometry 树木
- CylinderGeometry 树干
- 简单方块地面
- 单色 MeshStandardMaterial
- 纯 CSS 渐变模拟最终游戏 UI
- 圆球 / 方块模拟最终怪物
- 单纯 Points 粒子模拟所有技能特效

这些内容可以保留在：

```text
DEBUG
PROTOTYPE
ASSET_MISSING
```

模式中。

**不得再把这些资源当成正式完成结果。**

正式 V2 模式必须与 Prototype 模式明确区分。

---

# 3. 不允许“完成度降级”

以下情况不能标记为完成：

```text
“因为没有正式模型，所以用方块代替”
“因为没有贴图，所以用纯色材质代替”
“因为没有技能图标，所以用文字代替”
“因为没有环境资源，所以用圆锥树代替”
“因为性能问题，所以删除大部分特效”
```

正确做法：

如果关键正式资产缺失：

1. 建立正式 Asset Loader；
2. 建立明确资产接口；
3. 使用临时资产继续开发逻辑；
4. 在 QA 中把对应项目标记为 `BLOCKED_BY_ASSET`；
5. 不得声称最终视觉完成。

---

# 4. 视觉方向

目标不是复制任何商业游戏。

禁止直接复制：

- 角色
- 怪物
- UI
- 地图
- Shader 代码
- Logo
- 音乐
- 具体技能
- 材质
- 纹理
- 受版权保护资产

但整体视觉应采用以下**抽象艺术方向**：

## 高品质日式二次元幻想 3D

核心特征：

- 二次元角色比例
- 清晰而干净的人物轮廓
- 明亮幻想世界
- 风格化 PBR
- Toon / Cel Shading
- 柔和光照
- 有层次但不过度真实的材质
- 清晰的角色与背景分离
- 高品质元素魔法特效
- 适度电影感
- 移动端仍保持干净画面

不要做：

- PS2 风格低模
- Minecraft 风格
- 简单 Low Poly Demo
- Roblox 风格
- 单纯写实 PBR
- 纯卡通平涂
- 全场 Bloom
- 高饱和霓虹灯污染

---

# 5. 建立正式 Stylized Rendering Pipeline

必须重构渲染管线。

建议新增：

```text
src/render/
  RendererPipeline.js
  AnimeMaterial.js
  EnvironmentMaterial.js
  CharacterMaterial.js
  PostProcessing.js
  LightingRig.js
  QualityManager.js
```

---

# 6. 角色 Toon / Stylized PBR

角色不能继续只使用普通 MeshStandardMaterial。

实现一种 Three.js 可维护的风格化角色材质。

推荐：

- `ShaderMaterial`
- `MeshStandardMaterial.onBeforeCompile`
- NodeMaterial（如果当前 Three.js 版本适配良好）

要求至少实现：

## 6.1 分层阴影

角色光照不是完全连续渐变。

使用：

- Light Ramp
- 2~3 阶明暗层级
- 柔化边界

例如：

```text
Lit
Mid Shadow
Deep Shadow
```

不要完全硬切。

## 6.2 阴影颜色

暗部不能只是：

```text
RGB * 0.5
```

采用略带冷色的阴影。

亮部略暖。

形成：

```text
warm light
+
cool shadow
```

## 6.3 Rim Light

加入受控 Rim Lighting。

用于：

- 角色轮廓
- 魔法状态
- Boss
- 精英怪

Rim 强度必须受：

- Camera Direction
- Light Direction
- Material Type

控制。

不要始终发光。

## 6.4 Specular

不同材质必须区分：

```text
Skin
Cloth
Metal
Leather
Hair
Crystal
Magic
```

例如：

金属：高 Specular。

布料：低 Specular。

头发：具有方向性高光。

皮肤：柔和高光。

---

# 7. 角色模型资产

正式 V2 Vertical Slice 至少必须有：

- 1 个正式玩家角色模型
- 骨骼
- 基础动画
- 武器模型

优先支持：

```text
GLTF / GLB
```

Asset Loader 必须支持：

```text
GLTFLoader
DRACOLoader
KTX2Loader
```

如果实际项目没有合法正式 GLB：

Codex 可以继续开发系统，但必须：

- 建立完整加载接口
- 保留 Prototype 模型作为 fallback
- 在 UI / Debug 中明确显示 `ASSET FALLBACK`
- 不得将 Prototype 人物截图作为最终视觉验收结果

---

# 8. 正式动画要求

Vertical Slice 玩家至少：

```text
Idle
Run
Attack1
Attack2
Attack3
Attack4
Skill1
Skill2
Skill3
Skill4
Ultimate
Dodge
Hit
Death
```

必须使用：

```text
THREE.AnimationMixer
```

攻击动画必须与：

```text
windup
active frames
hit frame
recovery
combo window
cancel window
```

同步。

禁止继续只靠：

```text
arm.rotation
```

模拟完整最终动作。

---

# 9. 环境渲染

环境使用风格化 PBR。

至少支持：

- Base Color
- Normal
- Roughness
- AO
- Optional Emissive

地面不能继续是单色 BoxGeometry。

至少做一个正式环境 Theme：

# Ancient Astral Forest Ruins

包含：

- 草地
- 石板
- 遗迹
- 台阶
- 破损石墙
- 树木
- 岩石
- 灌木
- 魔法水晶
- 火盆
- 木箱
- 木桶
- 遗迹雕塑
- 远景山体
- 雾
- 光束

---

# 10. 地表必须有细节层次

至少实现：

- 主地表材质
- Detail Normal
- Macro Variation
- 地面颜色变化
- 路径 / 战斗区域区分
- Decal / 污迹
- 草丛
- 石块

禁止整个场景只有一种绿色。

---

# 11. Lighting Rig

重新设计：

```text
Key Light
Fill Light
Environment Light
Rim / Accent
Local Lights
```

主光：模拟方向性太阳光。

环境：柔和天空光。

魔法：允许动态局部光源。

要求：

玩家必须始终比背景更容易辨认。

---

# 12. 阴影

使用：

- Directional Shadow
- Contact Shadow
- AO / GTAO / SSAO（性能允许时）

移动端允许质量分级：

```text
Low
Medium
High
Ultra
```

不要关闭全部阴影作为默认方案。

---

# 13. 后处理

使用 Three.js EffectComposer 或等价管线。

至少：

```text
RenderPass
Selective Bloom
Color Grading
Vignette
FXAA / SMAA
Optional SSAO
```

Bloom 必须 Selective。

只允许：

- 魔法
- 高亮水晶
- 稀有掉落
- 部分环境光源

进入 Bloom。

禁止整个场景发白。

---

# 14. 色彩分级

整体色彩目标：

```text
自然绿
+
温暖阳光
+
冷色阴影
+
蓝 / 紫 / 金色魔法
```

保持：

- 中高明度
- 干净空气感
- 适度幻想感

不要：

- 全绿
- 全灰
- 全青
- 全棕

---

# 15. 摄像机方向

游戏仍然保持：

# 2.5D 横版 / 斜侧视战斗

不是传统 Diablo 高角度俯视。

场景是完整 3D。

玩家可以在 X/Z 平面移动。

摄像机：

- 默认斜侧视
- 自动跟随
- 有纵深
- 可有限旋转
- Yaw 有限制
- Pitch 有限制

禁止重新变成纯 2D 走廊。

---

# 16. 废除“左边出生 → 右边出口”的主结构

当前：

```text
Player Spawn X = -18
Exit X = +24
```

导致体验完全像：

```text
往右走
→ 打怪
→ 往右走
→ 结束
```

V2 必须废除这种主设计。

---

# 17. Vertical Slice 地图尺寸

创建一个真实战斗区域。

建议约：

```text
70m × 45m
```

不是极窄走廊。

包含：

```text
Entrance
Central Arena
Side Ruins
Upper Terrace
Destroyed Courtyard
Elite Zone
Reward Shrine
Exit Portal
```

不同区域之间不是一条直线。

至少形成：

- 弧形路径
- 左右侧翼
- 中央开阔区
- 高低差视觉
- 可绕行空间

---

# 18. 地图不是开放世界，但要有“区域感”

玩家应该能：

- 绕怪
- 拉怪
- 向侧面闪避
- 绕精英
- 在敌群中移动
- 利用场景柱子
- 进入不同小战斗区

而不是一直向右。

---

# 19. Encounter Director

必须新增：

```text
src/encounter/
  EncounterDirector.js
  ThreatBudget.js
  PackComposer.js
  SpawnDirector.js
  EncounterProfiles.js
```

不得继续在 `enterRoom()` 里用简单 `for (...) spawn(...)` 一次性生成所有怪物。

---

# 20. Threat Budget

每场战斗使用：

```text
Threat Budget
```

不同敌人消耗不同预算。

例如：

```text
Melee = 1
Ranged = 1.5
Shield = 2
Caster = 2
Assassin = 2
Support = 2.5
Elite = 6
```

Director 根据预算组成敌群。

---

# 21. 怪群 Pack

怪物必须以 Pack 形式出现。

例如：

## Pack A

```text
6 Melee
2 Ranged
1 Shield
```

## Pack B

```text
4 Melee
3 Ranged
1 Support
```

## Pack C

```text
3 Shield
2 Caster
4 Small Melee
```

## Elite Pack

```text
1 Elite
4 Melee
2 Ranged
1 Support
```

---

# 22. 战斗密度

普通 Combat Encounter：

累计：

```text
15~30 敌人
```

Challenge：

累计：

```text
25~45 敌人
```

不要求同时全部存在。

---

# 23. 同屏敌人数

移动端动态控制。

建议：

```text
Low:     8~12 active
Medium: 12~16 active
High:   16~22 active
Ultra:  20~28 active
```

Director 通过：

- 延迟增援
- 场外 Spawn
- Wave
- Pack

保持压力。

---

# 24. 战斗必须有 Wave

例如：

```text
Wave 1
8 enemies
↓
剩余 3 个时
Wave 2
10 enemies
+ 1 Shield
↓
剩余 4 个时
Elite Reinforcement
1 Elite
+ 6 minions
```

不要每次等全部杀完才继续。

---

# 25. 增援系统

Spawn 必须：

- 不直接出现在玩家面前 1 米
- 尽量在摄像机外
- 或通过 Portal
- 或从遗迹入口
- 或从地下 / 雾中
- 或使用明显 Spawn Telegraph

---

# 26. 普通小怪的角色

普通小怪目标：

# 让玩家爽快清群

不是每一个都变成小 Boss。

普通怪：

- 生命较低
- 攻击清晰
- 易被控制
- 易被击退
- 易被 AOE 清理

根据 Build：

玩家应能一次技能打中 4~10 个敌人。

---

# 27. 精英怪的角色

精英怪承担：

- 生存压力
- 位移压力
- 地面威胁
- 玩家技能选择
- Pack 核心

精英怪：

不能只是血更多。

至少：

- 2~4 特殊技能
- 1 位移
- 1 防御 / 反击
- Affix
- 独立 VFX

---

# 28. 精英词缀可视化

例如：

## Flame
- 火焰 Aura
- 地面火区
- 红橙粒子

## Frozen
- 冰霜 Aura
- 冰地
- 蓝白粒子

## Lightning
- 电弧
- Chain Attack
- 蓝紫高亮

## Teleport
- 位移残影
- Portal VFX

---

# 29. Boss 本阶段只保留 1 个

不要增加 Boss 数量。

只优化一个 Boss。

要求：

- Phase 1
- Phase 2
- Phase 3
- Dash
- Charge
- Leap
- Teleport / Reposition
- Combo
- AOE
- Summon
- Ultimate

关键是：

AI 和表现达到合格水平。

---

# 30. 高密度刷怪刷宝核心体验

Vertical Slice 必须形成：

```text
进入区域
↓
发现第一怪群
↓
AOE 清怪
↓
增援出现
↓
精英 Pack 出现
↓
大量战斗反馈
↓
金币 / 材料 / 装备掉落
↓
快速拾取
↓
继续向区域深处推进
↓
最终精英 / Mini Boss
↓
宝箱 / 高品质掉落
↓
Roguelike 三选一
```

---

# 31. 掉落节奏

普通怪主要掉：

- Gold
- Material
- Potion
- 少量装备

精英高概率：

- Rare
- Epic
- Legendary chance

Boss：

保证高品质掉落。

---

# 32. Loot Shower

大型 Pack / Elite 死亡时：

可以产生短暂 Loot Shower。

包括：

- Coin Burst
- Item Bounce
- Beam
- Spark
- Sound
- UI Notification

不要全屏塞满装备。

---

# 33. 掉落视觉

品质：

```text
Common
Magic
Rare
Epic
Legendary
Mythic
```

必须有不同：

- Ground Beam
- Spark
- Icon Frame
- Sound
- Pickup UI

Legendary：

```text
Golden Beam
+
Audio Stinger
+
Screen Notification
```

---

# 34. 打击反馈

每次有效命中至少考虑：

```text
Animation
HitStop
Screen Shake
Slash Trail
Hit Spark
Damage Number
Enemy Reaction
Audio
Element VFX
```

---

# 35. HitStop

普通：

```text
20~40 ms
```

重击：

```text
50~80 ms
```

Ultimate / Boss 可稍高。

不要夸张。

---

# 36. Screen Shake

轻攻击：非常小。

重攻击：明显。

Boss Slam：明显。

玩家必须能在 Settings 中调节：

```text
0%
25%
50%
75%
100%
```

---

# 37. Attack Trail

剑攻击必须有：

- Sword Trail
- Arc
- Fade
- Element Tint

Trail 必须跟随真实武器轨迹。

---

# 38. VFX

推荐新增：

```text
src/vfx/
  VFXManager.js
  ParticlePool.js
  TrailRenderer.js
  DecalManager.js
  Shockwave.js
  ElementVFX.js
```

使用对象池。

---

# 39. 元素特效

至少重新做：

## Fire
- flame
- ember
- heat tint

## Ice
- crystal shard
- frost
- cold mist

## Lightning
- arc
- flash
- spark

## Wind
- slash
- air arc
- leaf / air particle

## Holy
- gold
- star / rune
- soft bloom

## Void
- purple
- black core
- distortion impression

---

# 40. 技能视觉差异

4 个技能必须一眼看出不同。

禁止：

```text
所有技能 = 不同颜色 Points 粒子
```

---

# 41. 场景破坏

保留现有 Destructible。

正式场景中：

- 木箱
- 木桶
- 石柱
- 栅栏

必须：

- 破裂动画 / 碎片
- Dust
- Impact Sound
- Short physics-like impulse

移动端碎片数量有限。

---

# 42. UI 全面改造

当前 UI 可以保留逻辑。

但视觉必须重新设计。

禁止最终菜单继续像 Web Dashboard。

---

# 43. UI Art Direction

采用：

```text
Dark translucent fantasy glass
+
thin gold frame
+
ornamental corners
+
soft blue magic highlight
+
high readability
```

---

# 44. HUD

左上：

- 正式角色头像
- HP
- MP
- Dodge
- Lv
- Buff

头像点击：

打开角色装备页。

---

# 45. Combat HUD

右下：

```text
        S3

   S2        S4

       ATTACK

   S1       DODGE
```

Attack 最大。

Skill：

图标化。

不能只显示：

```text
文字
emoji
Unicode symbol
```

---

# 46. 技能 Icon

如果没有正式手绘图：

可以使用：

- SVG
- Canvas procedural icon

但必须：

- 有图形设计
- 统一风格
- 非文字按钮
- 非 Emoji

---

# 47. Pause Menu

暂停菜单：

不再是普通 3 列矩形网页按钮。

改为：

- 左侧导航
- 大型面板
- 图标
- 当前选择高亮
- 装饰纹理
- 面板层级

---

# 48. 装备 UI

必须突出：

- 品质颜色
- 装备图标
- Item Power
- Base Stat
- Affix
- Legendary Effect
- Compare

---

# 49. UI 动效

加入：

- Fade
- Scale
- Slide
- Selection Glow

时间：

```text
100~250ms
```

不要过慢。

---

# 50. 字体

不要依赖浏览器默认审美。

需要建立：

```text
UI Font
Display Font
Number Font
```

如果无法加入字体文件：

使用系统安全字体 fallback。

不要嵌入无授权字体。

---

# 51. 音频体验

当前 Audio 架构保留。

需要优化：

- Hit
- Slash
- Skill
- Elite Spawn
- Pack Clear
- Loot Drop
- Legendary
- UI
- Boss Phase

---

# 52. Battle Music

普通探索：较轻。

Encounter 激活：战斗层淡入。

Elite：增加强度。

Boss：Boss Theme。

如果没有正式音乐：

保留系统接口。

不得使用受版权音乐。

---

# 53. Mobile Performance

最终目标：

```text
60 FPS target
50 FPS acceptable
< 45 FPS triggers degradation
```

中端移动设备优先。

---

# 54. 动态质量

PerformanceManager：

监控：

- FPS
- Frame Time
- Draw Calls
- Triangle Count
- Active Particles
- Active Enemies

动态调整：

```text
Render Scale
Shadow Resolution
Particle Density
Post FX
Enemy Visual LOD
Grass Density
```

---

# 55. Instancing

环境重复对象：

- 草
- 石块
- 小型植物
- 部分碎片

使用：

```text
InstancedMesh
```

---

# 56. LOD

环境：

```text
Near
Mid
Far
```

角色 / Boss：

保持较高质量。

---

# 57. Texture Optimization

优先：

```text
KTX2
WebP
Atlas
```

避免大量独立 4K PNG。

---

# 58. Debug Visual Mode

保留 Prototype 几何体。

但必须通过：

```text
?debugAssets=1
```

或开发开关才能出现。

正式构建默认：

```text
debugAssets = false
```

---

# 59. Vertical Slice 具体内容

只要求一张正式地图：

# Astral Forest Ruins

约：

```text
3~5 分钟
```

---

# 60. Vertical Slice 敌人

只要求：

- 1 Melee
- 1 Ranged
- 1 Shield
- 1 Caster / Support
- 1 Elite

正式表现完成。

其余敌人等待下一阶段。

---

# 61. Vertical Slice Encounter

至少：

## Encounter 1

```text
6 Melee
2 Ranged
```

## Encounter 2

```text
4 Melee
2 Shield
2 Caster
```

## Encounter 3

```text
1 Elite
4 Melee
2 Ranged
1 Support
```

---

# 62. 游戏节奏

目标：

每：

```text
15~30 秒
```

产生一次：

- 敌群变化
- 增援
- 精英
- 掉落
- 交互
- 区域变化

避免长时间空跑。

---

# 63. 禁止空走

从一个 Encounter 到下一个：

建议不超过：

```text
5~10 秒
```

除非：

- 剧情
- 宝箱
- 商店
- 强化选择

---

# 64. Roguelike 强化

保留当前三选一。

但出现频率建议：

大型 Encounter 或 Elite 后。

不要每 4 只怪就弹一次。

---

# 65. 第一阶段不要重做完整 Roguelike 路线

现有 Route System 可保留。

Vertical Slice 先让：

```text
一个区域
```

足够好玩。

之后再映射回多房间 Roguelike。

---

# 66. 开发阶段

## V2-A — Visual Foundation

只做：

- Renderer Pipeline
- Lighting
- Post FX
- Stylized Material
- Asset Loader
- Quality Manager

验收后才能继续。

## V2-B — Formal Environment

只做：

- 一张正式区域
- 地面
- 遗迹
- 树
- 岩石
- 水晶
- 灯光
- 雾

## V2-C — Character & Animation

只做：

- 玩家正式表现
- 动画
- 武器
- Attack Trail

## V2-D — Enemy Presentation

只做：

- 4 类普通怪
- 1 Elite
- 动画
- VFX

## V2-E — Encounter Director

只做：

- Threat Budget
- Pack
- Wave
- Reinforcement
- Spawn logic

## V2-F — Loot & Combat Feel

只做：

- Hit Feedback
- Loot Shower
- Beam
- Audio
- Damage Number

## V2-G — UI Overhaul

只做：

- HUD
- Pause
- Skill Buttons
- Equipment Presentation

## V2-H — Performance & QA

只做：

- Mobile performance
- memory
- asset cleanup
- FPS
- regression

---

# 67. 每阶段必须实际运行

每完成阶段：

```text
npm test
npm run build
```

并实际启动游戏。

检查：

- Console Error
- Runtime Error
- Missing Asset
- Broken Shader
- Memory Leak
- Mobile Layout

---

# 68. 不允许只写代码不看结果

必须在每个主要视觉阶段：

生成或捕获实际运行截图。

进行视觉检查：

```text
Character silhouette
Lighting
Color
Material
UI
Enemy density
VFX readability
```

如果截图明显仍是 Prototype：

不得进入下一阶段。

---

# 69. V2 Visual Acceptance Gate

必须满足：

1. 正式画面中看不到方块人。
2. 正式画面中看不到 Cone Tree。
3. 地面不是单色 Plane / Box。
4. 角色具有清晰二次元风格化明暗层次。
5. 角色与背景明显分离。
6. 有环境阴影。
7. 有接触层次。
8. 有雾 / 空气透视。
9. 魔法有 Selective Bloom。
10. 场景有前中后景。
11. UI 不像普通网页。
12. 技能按钮使用图标。
13. 攻击有 Trail。
14. 命中有 Hit Spark。
15. Elite 一眼可识别。

---

# 70. Combat Acceptance Gate

必须满足：

1. 普通 Encounter 累计至少约 15 个敌人。
2. 至少出现 2 Wave。
3. 第二 Wave 不一定等第一 Wave 全死。
4. 至少有 3 种敌人同时出现。
5. 有近战前排。
6. 有远程后排。
7. 有 Elite Pack。
8. 玩家至少一次技能能命中多个敌人。
9. 普通怪击杀节奏快。
10. Elite 明显更危险。
11. 没有“4 个怪打完就散步”的体验。
12. Encounter 之间空走不超过合理范围。

---

# 71. Loot Acceptance Gate

必须满足：

1. 普通怪可掉金币。
2. Elite 必定有明显奖励。
3. Rare 以上可辨识。
4. Legendary 有特殊光柱。
5. Legendary 有 Audio Stinger。
6. 掉落实体有弹跳或落地表现。
7. 玩家靠近有 Pickup UI。
8. Pack Clear 有奖励感。

---

# 72. Mobile Acceptance Gate

必须：

- 横屏
- 多点触控
- 摇杆 + Attack
- 摇杆 + Skill
- 摇杆 + Dodge
- Camera + Movement
- UI 不重叠
- 安全区适配

---

# 73. Performance Gate

目标设备：

移动端浏览器。

至少检查：

```text
60 FPS target
Draw Calls
Triangles
Particle Count
Enemy Count
Memory
```

如果性能不足：

优先降低：

```text
草密度
远景
Shadow Map
Particle Density
Post FX Resolution
```

不要首先删除：

- Enemy Density
- Combat Feedback
- Player VFX

因为它们是核心体验。

---

# 74. 代码架构

必须逐步把：

```text
WorldView
```

从单个大文件拆分。

推荐：

```text
WorldRenderer
EnvironmentRenderer
ActorRenderer
LootRenderer
VFXRenderer
LightingRig
PostProcessing
```

---

# 75. 不要一次重写所有文件

每次重构：

- 小范围
- 可运行
- 可回滚
- 可测试

避免一次提交几十个未验证文件。

---

# 76. 兼容 GitHub Pages

现有 GitHub Pages 部署必须保持。

不要破坏：

```text
npm run build
```

和：

```text
base=./
```

子路径资源加载必须正确。

所有资产 URL 使用：

```text
import.meta.env.BASE_URL
```

或 Vite 正确资源方式。

避免：

```text
/assets/xxx
```

这种根路径导致 Pages 404。

---

# 77. 存档兼容

除非必须：

不要破坏旧 Save。

如果 Save Schema 改变：

必须加入：

```text
version
migration
fallback
```

---

# 78. 不允许伪完成

以下行为禁止：

- 创建文件但不调用
- 添加类但不接入 runtime
- 写注释声称完成
- 加按钮但按钮没功能
- 创建 Shader 但正式模型不用
- 创建 EncounterDirector 但仍然由旧 `enterRoom()` 固定 spawn
- 创建 AssetLoader 但仍然只显示方块模型
- 写测试只验证字符串存在

---

# 79. QA 必须验证运行结果

测试不能只做：

```text
expect(file).toContain(...)
```

还需要实际行为测试。

例如：

- EncounterDirector 生成 Pack
- Wave 条件
- Enemy Count
- Loot
- Skill Hit
- Save
- Route
- Asset Fallback

---

# 80. 最终 Vertical Slice 游戏体验

玩家进入游戏后应该感受到：

```text
高品质幻想森林遗迹
↓
角色轮廓清晰
↓
进入第一怪群
↓
大量敌人围攻
↓
玩家使用普通攻击和技能快速清群
↓
远程与盾怪改变站位
↓
第二批增援加入
↓
大量打击反馈
↓
装备与金币掉落
↓
短距离进入下一战区
↓
精英 Pack 出现
↓
精英使用特殊技能和位移
↓
玩家完成 Build 强化
↓
最终清场
↓
高品质宝箱 / 掉落
```

而不是：

```text
左边出生
↓
走右边
↓
打 4 个怪
↓
继续走右边
↓
结束
```

---

# 81. 本次“完成”的定义

只有同时满足：

```text
Visual Gate PASS
Combat Gate PASS
Loot Gate PASS
Mobile Gate PASS
Performance Gate PASS
npm test PASS
npm run build PASS
GitHub Pages compatible
```

才可以声称：

# V2 Vertical Slice Complete

否则必须明确写：

```text
NOT COMPLETE
```

并说明：

- 哪些已完成
- 哪些未完成
- 哪些被资产阻塞
- 哪些存在性能风险

---

# 82. 开始执行方式

现在不要回复长篇计划。

先：

1. 检查现有仓库；
2. 列出本次 V2 Vertical Slice 会修改的文件；
3. 列出明确不修改的系统；
4. 从 `V2-A Visual Foundation` 开始实际实施；
5. 实际运行测试；
6. 实际构建；
7. 完成当前阶段后汇报可见变化；
8. 再进入下一阶段。

不要在未完成 V2 Visual Foundation 之前继续扩展玩法系统。

最终目标不是代码数量。

最终目标是：

> **把 ASTRAL RIFT 从“功能完整但像 Prototype 的网页游戏”，重构成一个视觉方向明确、打击反馈强、高密度刷怪、装备掉落有快感、能够代表最终品质方向的移动端 2.5D 二次元幻想 Roguelike ARPG Vertical Slice。**
