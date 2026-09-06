# Codex 完整开发提示词：Three.js 横版移动 Roguelike ARPG

你现在是一名资深游戏技术总监、Three.js / WebGL 游戏开发工程师、战斗系统设计师、AI 系统设计师、UI/UX 设计师、技术美术、动画系统工程师和音频系统工程师。

请从零开始，使用 **Three.js** 完整开发一款可以直接在手机浏览器运行的 **横屏 3D / 2.5D 动作 Roguelike ARPG 游戏**。

游戏整体体验融合以下抽象设计方向：

- 明亮幻想世界、元素魔法、角色技能、层次丰富的幻想场景表现；
- 暗黑系 ARPG 的装备掉落、随机词条、Build 构筑、精英怪、Boss、刷宝循环；
- 横版动作游戏的即时闪避、连击、技能释放、位移、场景破坏和高反馈战斗；
- Roguelike 的随机房间、随机事件、随机强化、随机掉落和死亡重开机制。

禁止直接复制任何现有商业游戏中的角色、怪物、地图、Logo、UI、美术资源、名称、音乐、技能图标、具体技能设计或受版权保护的视觉资产。

必须设计原创世界观、原创角色、原创装备、原创敌人、原创 Boss、原创 UI、原创技能和原创场景。

---

## 一、项目目标

最终交付的不是技术 Demo，而是一款：

**真正可以进入游戏、移动、攻击、释放技能、打怪、掉装备、捡装备、查看属性、更换装备、进入下一房间、挑战 Boss、死亡结算、重新开始的完整可玩游戏。**

要求：

- PC 浏览器可运行；
- 手机浏览器重点适配；
- 手机强制横屏体验；
- 支持触摸操作；
- 支持鼠标键盘作为开发调试输入；
- UI 完整；
- 音效完整；
- 战斗完整；
- 装备系统完整；
- 技能系统完整；
- Roguelike 循环完整；
- 怪物 AI 完整；
- 精英怪 AI 完整；
- Boss AI 完整；
- 场景破坏完整；
- 粒子特效完整；
- 游戏菜单完整；
- 开始菜单完整；
- 存档系统完整；
- 设置菜单完整。

不要只创建静态 UI，不要只创建空壳系统，不允许出现大量 `TODO`、`Placeholder`、伪实现或“以后实现”。

所有核心功能必须实际运行。

---

## 二、技术栈

核心技术：

- Three.js
- JavaScript ES Modules
- HTML5
- CSS3
- Web Audio API
- Pointer Events / Touch Events
- LocalStorage 或 IndexedDB
- WebGL 2 优先

推荐工程结构：

```text
/src
  /core
  /game
  /player
  /combat
  /skills
  /enemies
  /ai
  /bosses
  /equipment
  /items
  /roguelike
  /world
  /destruction
  /effects
  /audio
  /camera
  /input
  /ui
  /save
  /data
  /utils

/assets
  /models
  /textures
  /icons
  /audio
  /particles
```

不要把所有代码写进一个 HTML 文件。

必须模块化开发。

---

## 三、游戏视觉类型

游戏采用：

**横屏 + 2.5D / 3D 场景 + 横版动作移动 + 可有限旋转视角**

角色主要沿横向场景移动，但世界必须是真正 Three.js 3D 场景。

必须包含：

- 透视摄像机；
- 3D 地面；
- 前景；
- 中景；
- 背景；
- 建筑残骸；
- 树木；
- 岩石；
- 草；
- 箱子；
- 木桶；
- 火盆；
- 魔法装置；
- 可破坏物；
- 动态灯光；
- 雾效；
- 阴影；
- 粒子；
- 环境特效。

视觉风格：

幻想世界 + 略带暗黑气质。

色彩不能全部灰暗，应通过：

- 青蓝魔法；
- 金色神圣；
- 紫色虚空；
- 红橙火焰；
- 翡翠自然元素；

形成高辨识度元素战斗。

---

## 四、移动端屏幕布局

必须按照真正手机横版动作游戏设计。

不要简单把 PC UI 缩小。

---

## 五、左上角：玩家状态 HUD

显示：

- 角色头像
- 角色等级
- HP
- MP / Mana
- 闪避值 / Stamina

同时显示：

- HP 数字
- MP 数字
- 等级
- 当前状态 Buff / Debuff 图标

示例：

```text
[头像] Lv.12

HP      ██████████  850/1000
MP      ███████░░░  120/180
DODGE   ██████░░░░   62/100
```

点击角色头像：

打开：

# Character / Equipment Panel

包含：

- 角色 3D / 2D 展示
- 角色等级
- 战力
- 攻击力
- 防御力
- 生命
- 暴击率
- 暴击伤害
- 元素伤害
- 元素抗性
- 攻击速度
- 移动速度
- 闪避恢复
- 生命偷取
- 冷却缩减
- 幸运
- 装备掉落加成

---

## 六、右上角菜单

右上角设计一个清晰的：

`☰`

菜单按钮。

点击后打开完整暂停菜单。

必须包含：

- 继续游戏
- 角色
- 装备
- 背包
- 技能
- Roguelike 强化
- 图鉴
- 地图
- 设置
- 音效设置
- 画面设置
- 操作设置
- 返回主菜单
- 退出游戏

暂停菜单打开时：

游戏逻辑暂停。

背景进行：

- 模糊
- 暗化

---

## 七、顶部地图名称

屏幕正上方居中显示当前地图名称，例如：

`遗忘森林 · 第一层`

进入区域时：

地图名称：

淡入 → 保持 → 淡出。

Boss 房：

例如：

`腐化圣殿`

使用特殊红色 / 金色视觉提示。

---

## 八、左下角移动摇杆

左下角：

虚拟摇杆。

必须支持：

- 上下左右
- 斜向移动
- 摇杆死区
- 摇杆最大范围
- 触摸拖动
- 多点触控
- 摇杆自动回中
- 人物移动速度根据摇杆偏移程度变化

必须保证：

玩家左手控制摇杆时，右手仍然可以同时：

- 攻击
- 释放技能
- 闪避
- 转视角

---

## 九、右下角战斗按键布局

必须严格按照常见移动 ARPG 操作布局。

中心偏右下：

一个最大的：

`ATTACK`

普通攻击按钮。

围绕攻击按钮分布：

- Skill 1
- Skill 2
- Skill 3
- Skill 4

形成半环形技能布局。

不要横向简单排成一排。

参考人体工学排列：

```text
                Skill 3

        Skill 2          Skill 4

              ATTACK

        Skill 1
```

Attack 按钮最大。

四个技能按钮尺寸略小。

另外必须加入：

- DODGE / 闪避按钮
- INTERACT / 交互按钮
- CAMERA / 视角拖动区域
- ULTIMATE / 终极技能在满足条件后出现特殊强化效果

技能按钮必须支持：

- 冷却遮罩
- 冷却数字
- 按下反馈
- 禁用状态
- Mana 不足状态
- 技能可释放高亮
- 终极技能充能完成效果

---

## 十、普通攻击

角色必须拥有完整攻击动作链。

至少：

- Attack 1
- Attack 2
- Attack 3
- Attack 4

第四击为重攻击结束技。

攻击要求：

- 前摇
- 攻击帧
- 命中帧
- HitStop
- 击退
- 受击动画
- 攻击后摇
- 连击窗口
- 动作取消窗口

攻击不能只是：

点击 → 敌人掉血。

必须存在：

- 动作反馈
- 刀光
- 粒子
- 声音
- 镜头震动
- 命中火花
- 敌人受击反馈

---

## 十一、闪避系统

右下：

`DODGE`

闪避消耗：

Dodge / Stamina。

必须支持：

- 方向闪避
- 短暂无敌帧
- 闪避残影
- 闪避音效
- 冷却 / Stamina 恢复

完美闪避：

如果玩家在敌人攻击即将命中的短时间窗口闪避：

进入约 `0.25 ~ 0.5 秒` 时间减速。

同时给予：

`Perfect Dodge Buff`

---

## 十二、技能系统

角色必须至少拥有：

- Skill 1
- Skill 2
- Skill 3
- Skill 4
- Ultimate

技能必须具有：

- 冷却时间
- Mana 消耗
- 技能等级
- 技能伤害倍率
- 元素属性
- 状态效果
- 技能图标
- 技能描述

示例原创技能：

### Skill 1：烈焰突袭

向前高速冲刺并造成火元素伤害。

### Skill 2：冰晶领域

创建持续冰元素领域。

### Skill 3：风刃回旋

释放旋转风刃。

### Skill 4：雷影瞬闪

瞬移并攻击目标。

### Ultimate：星陨裁决

召唤大型元素陨星。

这些只是结构示例，可以重新设计，但必须保持技能差异。

---

## 十三、完整技能面板

菜单中加入：

`SKILLS`

技能界面。

必须可以查看：

- 技能名称
- 技能图标
- 技能等级
- 伤害
- Mana
- Cooldown
- 元素
- 技能范围
- 技能描述

提供：

- 技能升级
- 技能强化节点

例如：

```text
烈焰突袭
Lv1
 ↓
强化 A：冲刺距离 +20%
强化 B：留下火焰路径
强化 C：命中敌人刷新部分闪避值
```

形成简化技能树。

---

## 十四、元素系统

设计原创元素体系。

至少：

- Fire
- Ice
- Lightning
- Wind
- Void
- Holy
- Nature

敌人与玩家具有：

- 元素伤害
- 元素抗性
- 元素异常状态

例如：

- Burn
- Freeze
- Shock
- Poison
- Bleed
- Curse

支持有限元素联动。

例如：

- Wet + Lightning → Chain Shock
- Frozen + Heavy Attack → Shatter
- Burn + Wind → Flame Spread

---

## 十五、装备系统

装备必须是游戏核心。

装备栏至少：

- Weapon
- Helmet
- Armor
- Gloves
- Boots
- Ring 1
- Ring 2
- Amulet

装备品质：

- Common
- Magic
- Rare
- Epic
- Legendary
- Mythic

颜色明显区分。

---

## 十六、装备词条系统

装备随机生成词条。

基础词条例如：

- +Attack
- +Defense
- +HP
- +Mana
- +Crit Chance
- +Crit Damage
- +Attack Speed
- +Movement Speed
- +Fire Damage
- +Ice Damage
- +Lightning Damage
- +Cooldown Reduction
- +Life Steal
- +Dodge Recovery
- +Element Resistance
- +Lucky Drop

高级词条例如：

- 暴击时 15% 概率释放雷击
- 闪避后下一次攻击 +50% 伤害
- 击杀敌人恢复 2% HP
- 连续攻击提高攻击速度
- 冻结敌人受到额外暴击伤害
- 技能命中降低终极技能冷却

词条必须随机生成。

装备属性由：

- Base Stats
- Prefix
- Suffix
- Special Affix
- Legendary Effect

组成。

---

## 十七、装备掉落

敌人死亡时：

装备必须真实从敌人位置掉到地上。

物品具有：

- 掉落弹跳
- 旋转
- 光柱
- 品质颜色
- 粒子
- 声音

Legendary：

橙色光柱。

Mythic：

特殊动态光柱 + 屏幕提示。

玩家靠近：

出现物品名称。

点击：

拾取。

也可以设置：

自动拾取普通材料。

---

## 十八、装备面板

点击头像或者菜单 → Equipment。

左侧：

角色展示。

周围：

装备槽。

右侧：

角色属性。

点击装备：

显示装备详情。

必须支持：

- Equip
- Unequip
- Compare
- Drop
- Lock

装备对比必须：

- 绿色 ↑
- 红色 ↓

显示属性变化。

---

## 十九、背包系统

Inventory 使用 Grid。

支持：

- 装备
- 材料
- 消耗品
- 任务物品
- Roguelike 道具

支持：

- 品质排序
- 类型筛选
- 锁定
- 丢弃
- 装备

---

# 二十、敌人 AI 总体要求

怪物不能只是“看到玩家后一直直线追过去”。

所有敌人必须使用真正可维护的 AI 架构。

推荐：

- Finite State Machine
- Hierarchical State Machine
- Utility AI
- Behavior Tree

至少采用其中一种，并且代码结构独立于 Enemy 渲染逻辑。

建议目录：

```text
/src/ai
  AIController.js
  StateMachine.js
  PerceptionSystem.js
  ThreatSystem.js
  NavigationSystem.js
  CombatDecision.js
  CooldownPlanner.js
  GroupCoordinator.js
```

怪物 AI 必须考虑：

- 玩家距离
- 玩家方向
- 视野
- 障碍物
- 当前生命值
- 自己技能冷却
- 玩家技能状态
- 玩家是否正在攻击
- 玩家是否刚闪避
- 玩家是否被控制
- 是否存在其他怪物
- 当前房间地形
- 与玩家的高度差
- 与队友的位置关系
- 自己是否被包围
- 自己是否处于异常状态
- 是否应该撤退
- 是否应该拉开距离
- 是否应该绕到玩家侧面
- 是否应该使用位移技能
- 是否应该打断当前动作

AI 必须有明确决策间隔，避免每帧做完整高成本决策。

---

# 二十一、小怪 AI

普通怪物也必须有明显行为差异。

至少设计：

- 近战怪
- 远程怪
- 盾牌怪
- 冲锋怪
- 施法怪
- 高机动怪
- 支援怪

每类小怪必须拥有独立技能和战术逻辑。

例如：

## 近战怪

技能：

- 普通斩击
- 二连击
- 短距离突进

AI：

- 接近玩家
- 不持续贴脸
- 攻击后允许短暂后撤
- 玩家连续攻击时可能侧移
- 玩家蓄力时可能后退

## 远程怪

技能：

- 普通射击
- 三连射
- 抛射物

AI：

- 主动保持安全距离
- 玩家接近时后撤
- 被逼入墙角时优先侧向移动
- 与其他远程怪错开站位
- 避免所有远程怪重叠

## 盾牌怪

技能：

- 举盾
- 盾击
- 推进
- 防御反击

AI：

- 玩家正面攻击时提高防御倾向
- 玩家绕背后时尝试转身
- 盾牌被打破后切换攻击模式

## 冲锋怪

技能：

- 短冲锋
- 长距离冲锋
- 冲锋撞击

AI：

- 中远距离优先寻找冲锋窗口
- 冲锋失败后存在硬直
- 避免频繁连续冲锋

## 施法怪

技能：

- 地面 AOE
- 追踪魔法弹
- 召唤符文

AI：

- 主动远离玩家
- 优先寻找视野良好位置
- 玩家高速接近时改变技能选择

## 高机动怪

技能：

- 侧闪
- 后跳
- 瞬步
- 背刺

AI：

- 尝试侧移
- 尝试绕到玩家攻击范围边缘
- 玩家攻击结束时反击

## 支援怪

技能：

- 治疗
- 护盾
- 增益
- 控制

AI：

- 与近战怪保持距离
- 优先支援低生命队友
- 被玩家锁定后尝试逃离

---

# 二十二、怪物群体协同 AI

多个怪物同时存在时必须避免：

所有怪物堆叠到玩家身上。

必须加入：

- Separation
- Local Avoidance
- Slot System
- Attack Token
- Group Coordination

推荐设计：

玩家周围存在有限攻击槽位。

例如：

最多允许 2~3 个近战敌人同时主动进攻。

其他敌人：

- 游走
- 压迫
- 寻找侧翼
- 等待攻击 Token
- 使用远程技能

这样形成更自然的战斗节奏。

不同敌人之间可以形成：

- 前排
- 后排
- 侧翼
- 支援

战术。

---

# 二十三、精英怪 AI

精英怪不能只是：

普通怪物 + 更多生命值。

精英怪必须拥有：

- 独立技能
- 独立 AI 行为
- 更高决策复杂度
- 更强位移
- 更强反应
- 词缀能力
- 阶段性行为变化

精英怪至少拥有：

- 2~4 个普通怪没有的专属技能
- 1 个防御技能
- 1 个位移技能
- 1 个特殊攻击
- 随机精英词缀

例如：

### 精英剑士

技能：

- 三段冲刺斩
- 旋风斩
- 后撤反击
- 格挡
- 跃斩

AI：

玩家远距离：

使用冲刺或跃斩。

玩家近距离持续攻击：

可能格挡 → 后撤 → 反击。

玩家低生命：

提高追击倾向。

自己低生命：

提高防御与位移概率。

---

# 二十四、Elite 词缀系统

精英敌人随机获得词缀。

例如：

- Flame
- Frozen
- Teleport
- Shielded
- Vampiric
- Explosive
- Lightning Chain
- Summoner

精英敌人名字：

例如：

`炽焰 · 深渊守卫`

并显示特殊血条。

词缀不仅改变数值，也必须改变行为。

例如：

Teleport：

AI 会主动使用瞬移改变站位。

Vampiric：

AI 在低生命时提高攻击倾向以吸血。

Summoner：

AI 在周围召唤物数量不足时优先召唤。

Shielded：

护盾存在时主动压迫，护盾破裂后短暂撤退。

---

# 二十五、Boss AI 总体要求

Boss 必须是完整 AI 驱动角色。

禁止使用：

固定时间循环播放 Skill 1 → Skill 2 → Skill 3。

Boss 必须根据：

- 玩家位置
- 玩家距离
- 玩家生命值
- 玩家最近行为
- 玩家闪避状态
- Boss 当前生命
- Boss 当前阶段
- Boss 技能冷却
- 场景状态
- Boss 与玩家朝向
- 是否存在召唤物
- 玩家是否在危险区域
- 玩家是否持续近身
- 玩家是否持续远离

动态选择行为。

Boss AI 推荐使用：

Behavior Tree + Utility Score

或者：

Hierarchical State Machine + Weighted Decision System。

---

# 二十六、Boss AI 状态

至少支持：

```text
Idle
Intro
Observe
Approach
Retreat
Strafe
Reposition
Attack
Combo
Cast
Dash
Teleport
Leap
Charge
Evade
Counter
Summon
PhaseChange
Stagger
Enraged
Ultimate
Death
```

Boss 每个行为必须有：

- 进入条件
- 执行逻辑
- 退出条件
- 冷却
- 权重
- 最小距离
- 最大距离
- 前摇
- 攻击窗口
- 后摇
- 是否可被打断

---

# 二十七、Boss 位移技能

Boss 必须拥有丰富的移动和位移技能。

至少实现其中多个：

- 短距离 Dash
- 长距离 Charge
- Side Step
- Back Step
- Teleport
- Leap
- Air Dive
- Player Side Reposition
- Behind Player Reposition
- Arena Center Reposition

Boss 不允许一直站在同一个位置。

Boss 应根据玩家行为改变位置。

例如：

玩家持续贴脸：

Boss：

后跳 → 地面 AOE。

玩家长期保持远距离：

Boss：

冲锋 → 瞬移 → 近身攻击。

玩家持续绕背：

Boss：

横移 → 转身反击。

玩家使用高伤技能：

Boss：

侧闪 / 瞬移。

---

# 二十八、Boss 技能

至少完整实现一个 Boss。

Boss 至少：

3 个阶段。

Boss 基础技能至少：

- 普通攻击
- 连击
- 范围攻击
- 冲锋
- 瞬移
- 跃击
- 地面 AOE
- 召唤
- 控制技能
- 终极攻击

Boss 位移技能必须与攻击系统结合。

例如：

```text
Teleport → Slash Combo

Back Step → Projectile

Leap → Ground Slam

Dash → Sweep Attack

Charge → Wall Impact
```

不能只是单纯移动。

---

# 二十九、Boss 阶段 AI

Boss 血量达到：

- 70%
- 40%

进入新阶段。

Phase 1：

- 基础攻击
- 基础位移
- 简单技能组合

Phase 2：

- 增加攻击速度
- 新增位移技能
- 新增 AOE
- 技能组合更加复杂

Phase 3：

- Enrage
- 高机动
- 瞬移
- 大范围攻击
- 连续组合技能
- Ultimate

阶段切换时：

- 镜头反馈
- 特效
- 动画
- Boss 音效
- 短暂无敌
- 场景变化

---

# 三十、Boss 技能组合系统

Boss 应支持 Combo Pattern。

例如：

Combo A：

```text
Dash
→ Slash
→ Slash
→ Heavy Strike
```

Combo B：

```text
Teleport
→ Ground Slam
→ Projectile Ring
```

Combo C：

```text
Back Step
→ Projectile
→ Charge
```

Combo D：

```text
Leap
→ AOE
→ Summon
```

AI 根据玩家距离动态选择 Combo。

避免每次完全相同。

---

# 三十一、Boss 预测与反应

Boss 不需要作弊读取玩家未来输入。

但允许基于玩家历史行为进行有限预测。

例如记录：

最近 5~10 秒：

- 玩家闪避方向
- 玩家常用技能
- 玩家平均距离
- 玩家是否频繁贴脸

Boss 可据此调整 Utility Score。

例如：

玩家经常向后闪避：

冲锋技能稍微提高权重。

玩家持续近战：

范围震退提高权重。

但必须避免：

必定命中。

玩家始终需要有：

- 前摇提示
- 反应时间
- 闪避窗口

---

# 三十二、AI 公平性

所有 AI 必须遵守：

可读性。

强 AI 不等于作弊 AI。

禁止：

- 瞬间无前摇攻击
- 永久锁定玩家
- 无冷却连续位移
- 读取玩家未来输入
- 超出动画表现的攻击范围
- 无提示的大范围秒杀

Boss 高强度技能必须具有：

- Animation Telegraph
- VFX Telegraph
- Audio Telegraph

让玩家可以学习攻击模式。

---

# 三十三、AI 性能

怪物 AI 不允许每帧运行完整决策树。

使用不同 Tick Rate。

例如：

普通敌人：

5~10 次 / 秒。

精英：

10~15 次 / 秒。

Boss：

15~20 次 / 秒。

距离玩家很远的怪物降低 AI Tick。

死亡敌人：

停止 AI。

房间外敌人：

休眠。

---

## 三十四、Roguelike 地牢

每次游戏随机生成房间路线。

例如：

```text
Start
  ↓
Combat
↙     ↘
Elite   Event
 ↓       ↓
Treasure Combat
  ↘     ↙
    Boss
```

房间类型：

- Combat
- Elite
- Treasure
- Event
- Shop
- Rest
- Challenge
- Boss

---

## 三十五、Roguelike 强化

玩家通关房间后：

随机出现三个强化。

三选一。

例如：

- 攻击 +15%
- 暴击 +8%
- 火元素伤害 +25%
- 闪避后攻击强化
- 技能冷却 -10%
- 击杀恢复生命
- Chain Lightning
- Burn Spread
- Double Projectile

必须可以叠加形成 Build。

---

## 三十六、场景破坏

场景必须存在真实可破坏元素：

- 木箱
- 木桶
- 罐子
- 木门
- 栅栏
- 石柱
- 路障
- 魔法水晶

被攻击时：

产生受击反馈。

耐久归零：

破碎。

产生：

- 碎片
- 粒子
- 灰尘
- 碰撞
- 声音

部分可掉：

- 金币
- 药剂
- 材料
- 装备

不要让破坏只是物体瞬间消失。

---

## 三十七、粒子特效

使用 Three.js 粒子系统。

至少包括：

- 剑气
- 攻击轨迹
- 命中火花
- 血液 / 魔法碎屑
- 火焰
- 冰晶
- 雷电
- 毒雾
- 治疗
- 闪避残影
- 装备光柱
- Boss AOE
- 环境尘埃
- 落叶
- 火星

注意性能。

必须使用：

对象池 / Object Pooling。

禁止不断创建销毁大量 Mesh。

---

## 三十八、角色动画

角色必须拥有：

- Idle
- Walk
- Run
- Attack1
- Attack2
- Attack3
- Attack4
- Skill1
- Skill2
- Skill3
- Skill4
- Ultimate
- Dodge
- Hit
- Knockback
- Death
- Victory

如果没有外部动画模型：

允许开发阶段通过程序动画或简化骨骼模型实现。

但是逻辑必须完整。

---

## 三十九、怪物动画

小怪至少：

- Idle
- Patrol
- Walk
- Run
- Attack 1
- Attack 2
- Skill
- Dodge / Move
- Hit
- Stagger
- Knockback
- Death

精英怪：

必须增加：

- 专属技能动画
- 位移动画
- 防御动画
- 特殊攻击动画

Boss：

必须增加：

- Intro
- Phase Change
- 多种 Attack
- 多种 Skill
- Dash
- Charge
- Teleport
- Leap
- Ultimate
- Stagger
- Enrage
- Death

---

## 四十、摄像机

使用第三人称 / 2.5D 横版摄像机。

支持：

自动跟随角色。

同时允许：

玩家在右侧非技能区域拖动手指旋转观察视角。

限制旋转范围，避免失去横版游戏方向感。

支持：

- Yaw
- 轻微 Pitch

摄像机必须：

- 平滑跟随
- 碰撞避免
- 战斗镜头震动
- Boss 镜头调整

不得无限自由旋转导致无法操作。

---

## 四十一、游戏开始菜单

必须单独设计完整主菜单。

不要直接进入游戏。

启动后显示：

- 游戏 Logo
- 动态 3D 背景
- 环境粒子
- 背景音乐

按钮：

- START GAME
- CONTINUE
- CHARACTERS
- SETTINGS
- CREDITS

第一次游戏：

START GAME。

有存档：

CONTINUE。

点击 START GAME：

进入角色选择 / 开始界面。

选择角色。

然后：

进入地牢。

---

## 四十二、设置菜单

Graphics：

- Low
- Medium
- High
- Ultra

配置：

- Shadow
- Particles
- Bloom
- Resolution Scale
- Anti Aliasing

Audio：

- Master
- Music
- SFX
- UI

Control：

- Joystick Size
- Button Size
- Camera Sensitivity
- Vibration

---

## 四十三、声音系统

必须有：

- 背景音乐系统
- 战斗音乐
- Boss 音乐
- 环境声音
- UI 点击
- 攻击音效
- 命中音效
- 技能音效
- 闪避音效
- 受击
- 死亡
- 装备掉落
- 装备拾取
- Legendary Drop 特殊声音

不同材质：

- 木头
- 石头
- 金属

必须拥有不同破坏声音接口。

如果没有真实音频文件：

创建完整 AudioManager 架构并使用合法占位音频或程序生成基础音效。

不能完全无声。

---

## 四十四、战斗伤害系统

必须包含：

- Base Damage
- Attack
- Skill Multiplier
- Crit
- Element Damage
- Defense
- Resistance
- Damage Reduction
- 随机浮动

显示战斗数字：

普通伤害：

白色。

暴击：

黄色 / 橙色。

元素伤害：

对应元素颜色。

治疗：

绿色。

---

## 四十五、浮动伤害数字

敌人受到攻击：

头顶显示伤害数字。

要求：

- 向上漂浮
- 淡出
- 暴击放大
- 元素颜色变化

不能使用简单 alert。

---

## 四十六、小地图 / 地图

菜单中必须可以查看地图。

显示：

- 当前房间
- 已经探索房间
- 未探索连接
- Boss
- Shop
- Treasure

---

## 四十七、交互系统

角色靠近：

- NPC
- 宝箱
- 祭坛
- 传送门
- 掉落装备
- 机关

出现：

`INTERACT`

支持点击交互。

---

## 四十八、宝箱

宝箱拥有：

- Common Chest
- Rare Chest
- Legendary Chest

打开：

- 动画
- 光效
- 声音
- 装备飞出

---

## 四十九、UI 风格

UI 不要使用浏览器默认 Button 风格。

必须设计游戏级 UI。

整体：

- 深色半透明玻璃
- 金属边框
- 幻想纹理
- 元素光效
- 柔和 Bloom
- 高品质图标风格

移动端：

按钮必须足够大。

需要：

- Touch Feedback
- Pressed State
- Cooldown Mask
- Disabled State

技能冷却时：

显示径向遮罩。

同时显示：

Cooldown 数字。

---

## 五十、游戏性能

目标：

中端手机 `50~60 FPS`。

必须：

- 限制 Draw Calls
- 实例化重复场景对象
- 使用 InstancedMesh
- Object Pooling
- 粒子池
- Texture Atlas
- 减少透明 Overdraw
- LOD
- Frustum Culling

加入：

PerformanceManager。

根据 FPS 自动降低：

- Particle Count
- Shadow Quality
- Render Scale

---

## 五十一、游戏状态

实现 GameState：

```text
MAIN_MENU
LOADING
PLAYING
PAUSED
ROOM_CLEAR
LEVEL_UP
BOSS
PLAYER_DEAD
VICTORY
```

避免各系统直接互相硬编码。

---

## 五十二、事件系统

创建：

EventBus。

例如：

```text
PLAYER_DAMAGED
PLAYER_HEALED
ENEMY_KILLED
ITEM_DROPPED
ITEM_PICKED
ROOM_CLEARED
SKILL_CAST
BOSS_STARTED
BOSS_DEFEATED
ENEMY_STATE_CHANGED
BOSS_PHASE_CHANGED
```

UI 使用事件更新。

---

## 五十三、数据驱动设计

所有：

- 装备
- 技能
- 敌人
- Boss
- AI 参数
- 词条
- 房间
- Buff
- 物品

必须数据驱动。

例如：

```text
skills.js
equipment.js
affixes.js
enemies.js
eliteAffixes.js
bosses.js
aiProfiles.js
rooms.js
```

不要把所有数值硬编码到 Combat.js。

---

## 五十四、存档系统

保存：

- 角色等级
- 解锁内容
- 装备
- 背包
- 设置
- 金币
- 永久升级
- 游戏进度

Roguelike 当前 Run：

可以单独保存。

死亡：

清除本轮临时强化。

保留 Meta Progression。

---

## 五十五、死亡界面

玩家死亡：

- 时间减速
- 画面暗化

显示：

`RUN FAILED`

统计：

- 本局时间
- 击杀数量
- Boss
- 获得装备
- 获得资源
- 最高连击

按钮：

- RETRY
- MAIN MENU

---

## 五十六、胜利界面

击败最终 Boss：

`VICTORY`

显示：

- Run Time
- Kills
- Damage
- Legendary Items
- Build

---

## 五十七、加载界面

切换地图时：

Loading Screen。

显示：

- 地图名称
- Tips
- Loading Bar

---

## 五十八、开发顺序

不要一次创建无法维护的巨大代码。

按照以下顺序实施：

### Phase 1

- 项目架构
- Three.js Renderer
- Scene
- Camera
- Game Loop

### Phase 2

- Player
- Joystick
- Camera Control
- Animation

### Phase 3

- Combat
- Attack
- Dodge
- Damage

### Phase 4

- Enemy 基础系统
- AI Framework
- Perception
- Navigation
- 小怪技能
- AI 状态机

### Phase 5

- 精英怪
- Elite Affix
- 群体协同 AI
- 高级敌人行为

### Phase 6

- Boss
- Boss AI
- Boss 位移
- Boss Combo
- Boss Phase
- Boss Utility Decision

### Phase 7

- Skills
- Elements
- Particles

### Phase 8

- Equipment
- Affix
- Drop
- Inventory

### Phase 9

- Roguelike Rooms
- Events
- Elite Room
- Boss Room

### Phase 10

- UI
- Menu
- Character
- Skills
- Equipment

### Phase 11

- Audio
- Destruction
- Polish

### Phase 12

- Mobile Optimization
- Save
- QA

但是：

不要只告诉我开发计划。

直接开始创建工程和代码。

---

## 五十九、调试面板

开发模式加入：

- FPS
- Draw Calls
- Triangles
- Player HP
- Enemy Count
- Particle Count
- Active AI Count
- AI Decision Time
- Boss State
- Boss Utility Score

同时支持快捷测试：

- Spawn Enemy
- Spawn Elite
- Spawn Boss
- Spawn Legendary
- Kill All
- God Mode
- Reset Run
- Force Boss Phase 2
- Force Boss Phase 3
- Show AI Debug

Show AI Debug 可显示：

- 感知范围
- 攻击范围
- 当前目标
- AI State
- 当前技能
- 移动目的地
- 攻击槽位

正式模式隐藏。

---

## 六十、操作布局验收标准

最终手机横屏 UI 必须大致满足：

```text
┌─────────────────────────────────────────────────────────────┐
│ [头像] HP ███████      地图名称                    [☰]      │
│        MP ███████                                         │
│        Dodge █████                                        │
│                                                             │
│                                                             │
│                       GAME WORLD                            │
│                                                             │
│                                                             │
│                                             [S3]            │
│                                      [S2]          [S4]      │
│                                                             │
│     ◯ JOYSTICK                         [S1]   [ATTACK]       │
│                                               [DODGE]       │
└─────────────────────────────────────────────────────────────┘
```

Skill 1~4：

围绕 ATTACK。

ATTACK：

尺寸最大。

DODGE：

靠近 Attack，但是不要误触。

交互按钮：

只在可交互目标附近出现。

---

## 六十一、代码质量要求

必须：

- 使用 ES Modules
- Class / Component 合理拆分
- JSDoc
- 统一命名
- 统一 EventBus
- 统一资源管理
- 统一对象池
- 统一时间系统
- AI 与渲染逻辑解耦
- Boss AI 与普通敌人 AI 配置解耦

Game Loop 使用：

`deltaTime`

禁止让游戏逻辑依赖具体 FPS。

---

## 六十二、错误处理

所有资源加载：

必须处理失败。

如果：

- 纹理
- 模型
- 音频

不存在：

游戏仍然可以启动。

使用程序生成 Placeholder。

不能因为一个素材失败导致白屏。

---

## 六十三、视觉资源策略

当前开发阶段如果没有正式资源：

优先使用：

- Three.js 几何体
- 程序材质
- CanvasTexture
- Shader
- 程序粒子
- SVG 图标
- 合法免费资源

不要等待外部素材才继续开发。

游戏必须始终保持可以运行。

---

## 六十四、最终验收

开发完成后必须实际检查：

1. 主菜单能打开。
2. Start Game 可以进入游戏。
3. 玩家可以用左下摇杆移动。
4. 摄像机可以有限旋转。
5. 普通攻击可以攻击敌人。
6. 四个技能均可以释放。
7. 技能存在冷却。
8. Mana 正常消耗。
9. 闪避值正确消耗和恢复。
10. 敌人可以攻击玩家。
11. 玩家可以死亡。
12. 敌人死亡会掉装备。
13. 装备具有随机品质。
14. 装备具有随机词条。
15. 玩家可以拾取装备。
16. 可以打开背包。
17. 可以装备 / 卸下装备。
18. 点击头像可以打开角色属性面板。
19. 技能面板完整。
20. Roguelike 房间能够切换。
21. Elite 正常出现。
22. Boss 可以完整战斗。
23. 场景物体可以破坏。
24. 粒子效果存在。
25. 音效存在。
26. Boss 音乐存在。
27. 游戏菜单完整。
28. 设置可以保存。
29. 手机横屏 UI 不重叠。
30. 多点触控正常。
31. 摇杆 + Attack 可以同时操作。
32. 摇杆 + Skill 可以同时操作。
33. 摇杆 + Camera 可以同时操作。
34. Attack + Dodge 不冲突。
35. 游戏刷新后存档仍存在。
36. 没有关键 Console Error。
37. 没有明显内存不断增长问题。
38. 手机运行时保持合理 FPS。
39. 小怪不会只直线追击玩家。
40. 近战怪、远程怪、盾牌怪、冲锋怪、施法怪行为明显不同。
41. 不同小怪拥有不同技能。
42. 多个小怪不会全部重叠在玩家身上。
43. 敌人具有合理的攻击间隔和位移逻辑。
44. 精英怪拥有普通怪没有的专属技能。
45. 精英词缀会影响 AI 行为，而不是只改变数值。
46. 精英怪会使用位移、反击、防御或特殊技能。
47. Boss 不使用固定 Skill 1 → Skill 2 → Skill 3 死循环。
48. Boss 会根据玩家距离动态选择技能。
49. Boss 会根据玩家行为调整技能权重。
50. Boss 具有 Dash。
51. Boss 具有 Charge。
52. Boss 具有 Leap 或 Teleport。
53. Boss 会主动重新站位。
54. Boss 有至少三阶段 AI。
55. Boss 阶段切换会改变技能和行为。
56. Boss 技能具有清晰前摇。
57. Boss 技能具有合理闪避窗口。
58. Boss 不会无冷却连续瞬移。
59. Boss 位移技能与攻击技能能够组合。
60. Boss 可以进行多套不同 Combo。
61. AI 调试模式可以显示当前状态。
62. AI 远离玩家后自动降低 Tick。
63. 房间结束后敌人 AI 正确释放。
64. Boss 死亡后不会继续执行 AI。
65. AI 不存在明显每帧高开销决策导致的性能问题。

---

## 六十五、最终开发原则

优先级必须始终按照：

```text
可玩性
>
操作手感
>
战斗反馈
>
敌人 AI 与 Boss 战体验
>
装备构筑
>
Roguelike 循环
>
UI 完整性
>
视觉特效
>
美术精细度
```

不要为了制作漂亮场景而留下无法游玩的核心系统。

每完成一个阶段：

1. 运行项目；
2. 检查 Console；
3. 修复错误；
4. 实际测试；
5. 再继续。

如果发现架构问题：

直接重构。

不要通过不断追加临时代码解决。

最终目标：

交付一个拥有完整主菜单、横屏移动端操作、Three.js 3D 世界、横版即时战斗、四技能 + 普通攻击 + 闪避、随机装备掉落、随机词条、装备 Build、元素系统、Roguelike 房间、具备较强 AI 的不同类型小怪、拥有独立技能与战术行为的精英怪、具备多阶段状态机、技能决策、连招、冲锋、跳跃、瞬移、侧移、后撤、重新站位等复杂位移能力的 Boss、场景破坏、粒子特效、音效、完整角色 / 背包 / 装备 / 技能 / 设置 UI 和存档系统的可运行原创移动端 Roguelike ARPG。

现在开始实际创建项目。

不要只回复方案。

不要只回复代码示例。

不要停留在框架。

不要用大量 Placeholder 伪装完成。

请持续开发、运行、测试和修复，直到形成一个真正能够从主菜单进入、完整完成至少一局 Roguelike 流程的可玩版本。
