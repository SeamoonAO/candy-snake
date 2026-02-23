# Candy Snake PRD

## 1. 项目概述

- 项目名称：Candy Snake
- 项目位置：`d:\Work\Code\Codex\candy-snake`
- 技术栈：React + Vite + TypeScript
- 目标：实现桌面浏览器优先的多彩贪吃蛇，包含趣味道具与本地成绩记录。

## 2. 目标与范围

### 2.1 目标

- 提供可直接游玩的贪吃蛇核心玩法。
- 增加 6 种有趣道具，提升策略与随机性。
- 提供糖果卡通风格视觉体验。
- 支持本地最高分与对局数持久化。

### 2.2 范围内

- 桌面浏览器优先（Chrome/Edge/Firefox 新版）。
- 键盘操控：方向、暂停、重开。
- 分数系统与动态难度（分数越高速度越快）。
- 单机本地存档（`localStorage`）。

### 2.3 范围外

- 联网排行榜。
- 背景音乐与音效系统。
- 移动端优先触摸交互。

## 3. 玩法规则

### 3.1 棋盘与基础参数

- 棋盘：`24 x 24` 网格。
- 初始蛇长：`4`。
- 初始速度：`150ms/step`。

### 3.2 动态难度

- 每 `5` 分减少 `5ms/step`。
- 最低基础速度不低于 `75ms/step`。

### 3.3 食物与得分

- 场上同时只有 1 个普通食物。
- 吃到食物：基础 `+1` 分，蛇长 `+1`。
- 若双倍积分生效：吃食物 `+2` 分。

### 3.4 碰撞规则

- 默认撞墙或撞自己：游戏结束。
- 穿墙生效时：撞墙改为从对侧穿出（环绕）。
- 护盾生效时：可抵消一次致命碰撞并消耗护盾。

### 3.5 输入规则

- `Arrow` / `WASD`：移动方向。
- 禁止 180° 反向瞬转。
- `Space`：暂停/继续。
- `R`：重开。

## 4. 道具系统

### 4.1 生成与存在规则

- 场上最多 1 个道具。
- 道具存在时间：`8s`（超时消失）。
- 每步在“当前无道具”时以 `8%` 概率尝试生成。
- 道具生成位置必须避开蛇身与食物。

### 4.2 道具列表

1. `SPEED_UP`（加速糖）
- 效果：速度系数 `0.75x`
- 持续：`6s`

2. `SLOW_DOWN`（减速糖）
- 效果：速度系数 `1.35x`
- 持续：`6s`

3. `GHOST_WALL`（穿墙软糖）
- 效果：可穿墙环绕
- 持续：`8s`

4. `DOUBLE_SCORE`（双倍积分棒）
- 效果：食物得分 `x2`
- 持续：`10s`

5. `SHORTEN`（瘦身果冻）
- 效果：蛇长立即减少 `3`，最低保留 `3`
- 持续：即时生效

6. `SHIELD`（护盾泡泡）
- 效果：获得 1 层护盾，最多 1 层，不叠加
- 持续：直到触发或本局结束

### 4.3 道具权重

- `SPEED_UP`: 20%
- `SLOW_DOWN`: 20%
- `GHOST_WALL`: 15%
- `DOUBLE_SCORE`: 20%
- `SHORTEN`: 15%
- `SHIELD`: 10%

## 5. 视觉与交互

- 风格：糖果卡通风。
- 背景：奶油黄 -> 薄荷绿渐变。
- 蛇身：按索引变化的彩虹色。
- 食物：高饱和红/橙。
- 道具：类型色 + 缩写标识。
- 动效：
- 棋盘元素轻量过渡（`transform + opacity`）。
- 分数变化时 HUD 短促放大。
- 道具出现时淡入脉冲。

## 6. 数据与状态

- 核心状态由 `useSnakeGame` 统一管理。
- `setInterval` 依据 `tickMs` 驱动循环，速度变更后重建定时器。
- 本地持久化：
- 初次加载读取 `bestScore` 与 `gamesPlayed`。
- 游戏结束时写回统计数据。
- 存储失败不影响游玩。

## 7. 核心接口（已约定）

### 7.1 `src/game/types.ts`

- `Point`
- `Direction`
- `PowerUpType`
- `PowerUpInstance`
- `ActiveEffects`
- `GameState`

### 7.2 `src/game/engine.ts`

- `createInitialState(seed?: number): GameState`
- `step(state: GameState, now: number): GameState`
- `turn(state: GameState, next: Direction): GameState`
- `togglePause(state: GameState): GameState`
- `restart(state: GameState, seed?: number): GameState`

### 7.3 `src/storage/stats.ts`

- `loadStats(): { bestScore: number; gamesPlayed: number }`
- `saveStats(stats: { bestScore: number; gamesPlayed: number }): void`

## 8. 验收标准

### 8.1 功能验收

1. 方向控制稳定，且反向约束有效。
2. 暂停时游戏冻结，继续后恢复正常。
3. 结束后可重开，重新开始状态正确。
4. 6 种道具均可触发，效果符合规格。
5. 动态难度随分数提升，最低速度边界有效。
6. 本地最高分和局数刷新后仍保留。

### 8.2 测试验收

- 单测覆盖：
- 初始状态
- 方向约束
- 吃食物加分与增长
- 自动加速下限
- 道具生效与过期
- `SHORTEN` 最低长度保护
- `SHIELD` 一次性抵消
- 穿墙/非穿墙碰撞分支
- 本地存储容错

## 9. 非功能要求

- 优先稳定可玩。
- 出错容忍：本地存储异常不阻断主流程。
- 代码模块化清晰，便于后续扩展（新道具、音效、排行榜等）。
