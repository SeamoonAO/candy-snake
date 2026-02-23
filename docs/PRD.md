# Candy Snake PRD

## 1. 项目概述
- 项目名称：Candy Snake
- 项目路径：`d:\Work\Code\Codex\candy-snake`
- 技术栈：React + Vite + TypeScript
- 目标：实现桌面浏览器优先的彩色贪吃蛇，包含道具、PvE 敌方蛇和可配置玩法参数。

## 2. 目标与范围
### 2.1 目标
- 提供可直接游玩的贪吃蛇核心玩法。
- 增加 6 种有趣道具，提升策略与随机性。
- 提供糖果卡通视觉风格和轻量特效反馈。
- 支持本地最高分与对局数持久化。
- 支持局内参数可调（豆子数量、PvE 蛇数量）。

### 2.2 范围内
- 桌面浏览器优先（Chrome/Edge/Firefox 新版）。
- 键盘操控：方向、暂停、重开。
- 分数系统与动态难度（随分数加速）。
- 多豆子并存、可调豆子数量。
- PvE 敌方蛇（1-3 条，可调）。
- 本地存档（`localStorage`）。

### 2.3 范围外
- 联网排行榜。
- 背景音乐和音效系统。
- 移动端优先触控交互。

## 3. 核心玩法规则
### 3.1 棋盘与基础参数
- 棋盘：`32 x 32` 网格（为多蛇共存放大盘面）。
- 玩家初始蛇长：`4`。
- PvE 初始蛇长：`4`。
- 初始速度：`150ms/step`。

### 3.2 动态难度
- 每 `5` 分减少 `5ms/step`。
- 最低基础速度不低于 `75ms/step`。

### 3.3 食物与得分
- 场上同时存在多颗豆子。
- 豆子数量支持界面滑杆动态调整（`1-12`）。
- 吃到豆子：基础 `+1` 分，蛇长 `+1`。
- 双倍积分生效时：吃豆 `+2` 分。
- 某颗豆子被吃后，仅补位该颗，维持配置总量。

### 3.4 PvE 敌方蛇
- 数量支持界面滑杆动态调整（`1-3`）。
- 敌蛇默认寻路优先朝最近豆子移动。
- 敌蛇会避开边界、玩家蛇身、其他敌蛇及自身身体。
- 敌蛇若出现不可行走状态，会重生到可用区域以保持对局活跃。
- 玩家蛇头撞到敌蛇视为致命碰撞（护盾可抵消一次）。

### 3.5 碰撞规则
- 默认撞墙或撞自己：游戏结束。
- 穿墙道具生效时：玩家蛇可环绕穿墙。
- 护盾生效时：可抵消一次致命碰撞并消耗护盾。

### 3.6 输入规则
- `Arrow` / `WASD`：移动方向。
- 禁止 180° 反向瞬转。
- `Space`：暂停/继续。
- `R`：重开。

## 4. 道具系统
### 4.1 生成与存在规则
- 场上最多 1 个道具。
- 道具存在时间：`8s`（超时消失）。
- 每步在“当前无道具”时以 `8%` 概率尝试生成。
- 道具生成位置必须避开玩家蛇、敌蛇和豆子。

### 4.2 道具列表
1. `SPEED_UP`（加速糖）
- 速度系数 `0.75x`
- 持续 `6s`

2. `SLOW_DOWN`（减速糖）
- 速度系数 `1.35x`
- 持续 `6s`

3. `GHOST_WALL`（穿墙软糖）
- 可穿墙环绕
- 持续 `8s`

4. `DOUBLE_SCORE`（双倍积分棒）
- 吃豆得分 `x2`
- 持续 `10s`

5. `SHORTEN`（瘦身果冻）
- 蛇长立即减少 `3`，最低保留 `3`
- 即时生效

6. `SHIELD`（护盾泡泡）
- 获得 1 层护盾，最多 1 层不叠加
- 直到触发或本局结束

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
- 玩家蛇：彩虹渐变色段。
- 敌方蛇：独立色系（与玩家明显区分）。
- 豆子：高饱和红/橙。
- 道具：类型色 + 字母标识。
- 特效：
- 吃豆触发爆粒动画。
- 拾取道具触发更强爆粒动画。
- 棋盘元素保持轻量过渡（`transform + opacity`）。

## 6. 数据与状态
- 统一由 `useSnakeGame` 管理游戏状态和键盘监听。
- `setInterval` 按 `tickMs` 驱动循环，速度变化时重建计时器。
- 运行时配置状态：
- `foodCount`：豆子数量（1-12）。
- `enemyCount`：PvE 敌蛇数量（1-3）。
- 本地持久化：
- 初始化读取 `bestScore`、`gamesPlayed`。
- 游戏结束写回统计。
- 存储失败不影响游戏主流程。

## 7. 核心接口
### 7.1 `src/game/types.ts`
- `Point`
- `Direction`
- `PowerUpType`
- `PowerUpInstance`
- `ActiveEffects`
- `EnemySnake`
- `GameState`（含 `foods`、`foodCount`、`enemies`、`enemyCount`）

### 7.2 `src/game/engine.ts`
- `createInitialState(seed?: number): GameState`
- `step(state: GameState, now: number): GameState`
- `turn(state: GameState, next: Direction): GameState`
- `togglePause(state: GameState): GameState`
- `setFoodCount(state: GameState, nextCount: number, seed?: number): GameState`
- `setEnemyCount(state: GameState, nextCount: number, seed?: number): GameState`
- `restart(state: GameState, seed?: number): GameState`

### 7.3 `src/storage/stats.ts`
- `loadStats(): { bestScore: number; gamesPlayed: number }`
- `saveStats(stats: { bestScore: number; gamesPlayed: number }): void`

## 8. 验收标准
### 8.1 功能验收
1. 方向控制稳定且反向约束有效。
2. 暂停时冻结，恢复后正常继续。
3. 结束后可重开且状态重置正确。
4. 6 种道具均可触发且效果符合规格。
5. 动态难度与速度下限生效。
6. 豆子数量可通过界面调整，并立即反映到盘面。
7. PvE 蛇数量可通过界面调整，并立即反映到盘面。
8. 玩家与敌蛇碰撞按规则结算（护盾可一次抵消）。
9. 刷新后最高分和局数保留。

### 8.2 测试验收
- 单测覆盖：
- 初始状态
- 方向约束
- 吃豆加分与增长
- 自动加速下限
- 道具生效与过期
- `SHORTEN` 最低长度保护
- `SHIELD` 一次性抵消
- 穿墙/非穿墙碰撞
- 运行时豆子数量调整
- 运行时敌蛇数量调整
- 本地存储容错

## 9. 非功能要求
- 优先稳定可玩。
- 存储异常不阻塞主流程。
- 模块化结构，便于后续扩展（敌蛇难度档位、更多模式、联网功能）。
