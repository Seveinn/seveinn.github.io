import { CONFIG } from './config';
import { GameState, Hex, Unit as IUnit } from './types';
import { hexToPixel, getHexDist, roundRect, ellipse } from './utils';

export class Unit implements IUnit {
  id: string;
  q: number;
  r: number;
  worldX: number;
  worldY: number;
  targetHex: Hex | null;
  state: 'idle' | 'moving' | 'working' | 'returning' | 'resting' | 'thinking';
  workTimer: number;
  restTimer: number;
  workStartTime: number; // 开始工作的时间戳
  gatherCompleteTime: number; // 采集完成的时间戳，用于延迟显示动画
  thinkingStartTime: number; // 开始思考的时间戳
  spawnTime: number; // 角色生成的时间戳
  private gameState: GameState;

  constructor(q: number, r: number, gameState: GameState, startTile: Hex | null = null) {
    this.id = Math.random().toString(36).substr(2, 9);
    this.q = q;
    this.r = r;
    this.gameState = gameState;
    
    // 关键修复：初始化时使用【世界坐标】
    const worldPos = hexToPixel(q, r);
    this.worldX = worldPos.x;
    this.worldY = worldPos.y;
    
    this.targetHex = startTile;
    
    if (startTile) {
      this.state = 'working';
      startTile.occupiedBy = this.id;
      this.workStartTime = Date.now(); // 初始化时如果直接工作，记录开始时间
    } else {
      this.state = 'idle';
      this.workStartTime = 0;
      // 如果生成时没有指定地块，尝试找到当前坐标的地块并占用
      const key = `${q},${r}`;
      const currentTile = gameState.tiles.get(key);
      if (currentTile && !currentTile.occupiedBy) {
        currentTile.occupiedBy = this.id;
        this.targetHex = currentTile;
      }
    }
    this.workTimer = 0;
    this.restTimer = 0;
    this.gatherCompleteTime = 0;
    this.thinkingStartTime = 0;
    this.spawnTime = Date.now(); // 记录生成时间
  }

  update(dt: number): void {
    switch (this.state) {
      case 'idle':
        // 新招募的角色保持空闲状态3秒后才开始工作
        const idleDuration = Date.now() - this.spawnTime;
        if (idleDuration >= 3000) {
          this.findNewJob();
        }
        break;
      case 'moving':
        this.move();
        break;
      case 'working':
        this.work(dt);
        break;
      case 'returning':
        this.move();
        break;
      case 'resting': 
        // 休息状态：定期检查是否有新地块可以采集
        this.restTimer += dt;
        if (this.restTimer >= 60) {
          // 每60帧（约1秒）检查一次
          this.restTimer = 0;
          this.findNewJob(); // 尝试寻找新工作
        }
        break;
      case 'thinking':
        // 思考状态：停顿2秒后开始移动
        const thinkingDuration = 2000; // 2秒
        if (Date.now() - this.thinkingStartTime >= thinkingDuration) {
          // 思考结束，开始移动
          this.state = 'moving';
        }
        break;
    }
  }

  findNewJob(): void {
    // 检查当前地块是否已经被自己占用，如果是且地块可用，直接开始工作
    const currentKey = `${this.q},${this.r}`;
    const currentTile = this.gameState.tiles.get(currentKey);
    if (currentTile && currentTile.occupiedBy === this.id && !currentTile.isDepleted() && !currentTile.isRegenerating()) {
      // 当前地块已经被自己占用且可用，直接开始工作
      this.targetHex = currentTile;
      this.state = 'working';
      this.workTimer = 0;
      this.workStartTime = Date.now();
      return;
    }

    let bestDist = Infinity;
    let bestTile: Hex | null = null;

    for (let tile of this.gameState.tiles.values()) {
      if (tile.type === 'rock' && Math.random() > 0.3) continue;
      if (tile.isDepleted()) continue;
      if (tile.isRegenerating()) continue;
      if (tile.occupiedBy && tile.occupiedBy !== this.id) continue;

      const dist = getHexDist(this.q, this.r, tile.q, tile.r);
      if (dist < bestDist) {
        bestDist = dist;
        bestTile = tile;
      }
    }

    if (bestTile) {
      // 再次检查目标地块是否仍然可用（防止多单位同时选择同一地块）
      if (bestTile.occupiedBy && bestTile.occupiedBy !== this.id) {
        // 目标地块已被其他单位占用，重新寻找
        this.state = 'idle';
        return;
      }
      
      // 释放之前占用的地块
      if (this.targetHex && this.targetHex.occupiedBy === this.id) {
        this.targetHex.occupiedBy = null;
      }
      
      this.targetHex = bestTile;
      this.targetHex.occupiedBy = this.id;
      // 先进入思考状态，停顿2秒后再移动
      this.state = 'thinking';
      this.thinkingStartTime = Date.now();
    } else {
      if (this.q !== 0 || this.r !== 0) {
        const centerTile = this.gameState.tiles.get("0,0");
        if (centerTile) {
          // 检查中心地块是否可用
          if (centerTile.occupiedBy && centerTile.occupiedBy !== this.id) {
            // 中心地块已被占用，保持空闲状态
            this.state = 'idle';
            return;
          }
          this.targetHex = centerTile;
          this.state = 'returning';
        }
      }
    }
  }

  move(): void {
    if (!this.targetHex) {
      this.state = 'idle';
      return;
    }

    // 检查目标地块是否仍然可用（防止移动过程中被其他单位占用）
    if (this.targetHex.occupiedBy && this.targetHex.occupiedBy !== this.id) {
      // 目标地块已被其他单位占用，取消移动
      this.targetHex = null;
      this.state = 'idle';
      return;
    }

    // 获取目标的世界坐标
    const targetPos = this.targetHex.getWorldPos();
    const dx = targetPos.x - this.worldX;
    const dy = targetPos.y - this.worldY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = 2.5;

    if (dist > speed) {
      this.worldX += (dx / dist) * speed;
      this.worldY += (dy / dist) * speed;
    } else {
      // 到达目标前，再次检查是否被占用
      if (this.targetHex.occupiedBy && this.targetHex.occupiedBy !== this.id) {
        // 在到达前被占用，取消移动
        this.targetHex = null;
        this.state = 'idle';
        return;
      }
      
      this.worldX = targetPos.x;
      this.worldY = targetPos.y;
      this.q = this.targetHex.q;
      this.r = this.targetHex.r;
      
      // 确保占用标记正确
      if (!this.targetHex.occupiedBy || this.targetHex.occupiedBy !== this.id) {
        this.targetHex.occupiedBy = this.id;
      }
      
      if (this.state === 'returning') {
        this.state = 'idle';
      } else {
        this.state = 'working';
        this.workTimer = 0;
        this.workStartTime = Date.now(); // 记录开始工作的时间
      }
    }
  }

  work(_dt: number): void {
    if (!this.targetHex) {
      this.state = 'idle';
      return;
    }
    
    // 确保占用标记正确（防止被其他单位抢占）
    if (!this.targetHex.occupiedBy || this.targetHex.occupiedBy !== this.id) {
      // 地块被其他单位占用，停止工作
      this.targetHex = null;
      this.state = 'idle';
      return;
    }
    
    // 检查地块是否正在恢复中（不能采集）
    if (this.targetHex.isRegenerating()) {
      // 地块正在恢复中，寻找附近尚未枯竭的地块
      this.findNearbyJob();
      return;
    }
    
    // 如果地块完全枯竭且不在恢复期，或者地块被其他人占用
    if (this.targetHex.isDepleted() || (this.targetHex.occupiedBy && this.targetHex.occupiedBy !== this.id)) {
      if (this.targetHex.occupiedBy === this.id) {
        this.targetHex.occupiedBy = null;
      }
      this.targetHex = null;
      this.state = 'idle';
      return;
    }

    // 根据地块类型获取采集时间
    const conf = CONFIG.tiles[this.targetHex.type];
    const workDuration = conf.gatherTime; // 从配置中获取采集时间
    const elapsed = Date.now() - this.workStartTime;
    
    // 如果刚完成采集，检查延迟时间
    if (this.gatherCompleteTime > 0) {
      const delayElapsed = Date.now() - this.gatherCompleteTime;
      if (delayElapsed >= 300) {
        // 延迟0.3秒后显示浮动文字
        this.showGatherAnimation();
        this.gatherCompleteTime = 0;
        this.workStartTime = Date.now(); // 重置开始时间，准备下次采集
        this.workTimer = 0;
      } else {
        // 延迟期间，隐藏进度条（workTimer设为-1表示隐藏）
        this.workTimer = -1;
      }
      return;
    }
    
    if (elapsed >= workDuration) {
      // 采集完成，但不立即显示动画
      this.gather();
      this.gatherCompleteTime = Date.now(); // 记录完成时间
      this.workTimer = -1; // 隐藏进度条
    } else {
      // 更新workTimer用于显示进度（0-1之间的值）
      this.workTimer = elapsed / workDuration;
    }
  }
  
  findNearbyJob(): void {
    // 寻找附近（距离<=3）尚未枯竭的地块
    let bestDist = Infinity;
    let bestTile: Hex | null = null;
    const maxSearchDist = 3;

    for (let tile of this.gameState.tiles.values()) {
      if (tile.type === 'rock' && Math.random() > 0.3) continue;
      if (tile.isDepleted() || tile.isRegenerating()) continue; // 枯竭或恢复中的地块不能采集
      if (tile.occupiedBy && tile.occupiedBy !== this.id) continue;

      const dist = getHexDist(this.q, this.r, tile.q, tile.r);
      if (dist <= maxSearchDist && dist < bestDist) {
        bestDist = dist;
        bestTile = tile;
      }
    }

    if (bestTile) {
      // 再次检查目标地块是否仍然可用
      if (bestTile.occupiedBy && bestTile.occupiedBy !== this.id) {
        // 目标地块已被占用，停留在原地休息
        if (this.targetHex && this.targetHex.occupiedBy === this.id) {
          this.targetHex.occupiedBy = null;
        }
        this.targetHex = null;
        this.state = 'resting';
        return;
      }
      
      // 找到附近的地块，前往
      if (this.targetHex && this.targetHex.occupiedBy === this.id) {
        this.targetHex.occupiedBy = null;
      }
      this.targetHex = bestTile;
      this.targetHex.occupiedBy = this.id;
      this.state = 'moving';
    } else {
      // 找不到附近的地块，停留在原地休息
      if (this.targetHex && this.targetHex.occupiedBy === this.id) {
        this.targetHex.occupiedBy = null;
      }
      this.targetHex = null;
      this.state = 'resting';
    }
  }

  gather(): void {
    const tile = this.targetHex;
    if (!tile || tile.curRes <= 0) return;
    tile.curRes = Math.max(0, tile.curRes - 1);
    const conf = CONFIG.tiles[tile.type];
    const rand = Math.random();
    let cumulative = 0;
    let loot = conf.drops[0];
    
    for (let i = 0; i < conf.drops.length; i++) {
      cumulative += conf.dropRates[i];
      if (rand < cumulative) {
        loot = conf.drops[i];
        break;
      }
    }

    // 通过回调通知游戏状态更新
    if (this.gameState.onResourceAdded) {
      this.gameState.onResourceAdded(loot, 1);
    }
    if (this.gameState.onXPAdded) {
      this.gameState.onXPAdded(2);
    }
    
    // 保存loot信息，延迟显示动画
    (this as any).pendingLoot = loot;
  }
  
  showGatherAnimation(): void {
    const loot = (this as any).pendingLoot;
    if (!loot || !this.gameState.onFloatText) return;
    
    const resConf = CONFIG.resources[loot];
    // 浮动文字位置 = 世界坐标 * 缩放 + 摄像机坐标
    const screenX = this.worldX * this.gameState.zoom + this.gameState.camera.x;
    const screenY = this.worldY * this.gameState.zoom + this.gameState.camera.y - 25;
    this.gameState.onFloatText(
      `+${resConf.icon}`,
      screenX,
      screenY,
      '#333'
    );
    
    // 清除pendingLoot
    (this as any).pendingLoot = null;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    // 渲染时使用世界坐标（缩放和平移已在canvas层面应用）
    const screenX = this.worldX;
    const screenY = this.worldY;
    
    const breath = Math.sin(Date.now() / 200) * 1.5;
    
    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.beginPath();
    ellipse(ctx, screenX, screenY + 6, 8, 3);
    ctx.fill();
    
    // 身体 (居中绘制)
    ctx.fillStyle = CONFIG.colors.unit;
    ctx.beginPath();
    roundRect(ctx, screenX - 7 - breath / 2, screenY - 10 - breath, 14 + breath, 16 + breath, 5);
    ctx.fill();

    // 眼睛
    ctx.fillStyle = '#333';
    const blink = Math.sin(Date.now() / 1500) > 0.95;
    if (!blink) {
      ctx.beginPath();
      ctx.arc(screenX - 3, screenY - 5 - breath, 1.5, 0, Math.PI * 2);
      ctx.arc(screenX + 3, screenY - 5 - breath, 1.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(screenX - 4, screenY - 5);
      ctx.lineTo(screenX - 2, screenY - 5);
      ctx.moveTo(screenX + 2, screenY - 5);
      ctx.lineTo(screenX + 4, screenY - 5);
      ctx.stroke();
    }

    if (this.state === 'idle' || this.state === 'returning') {
      ctx.fillStyle = '#3498db';
      ctx.font = '10px Arial';
      ctx.fillText('zZ', screenX + 8, screenY - 8);
    }
    
    // 思考状态：显示问号
    if (this.state === 'thinking') {
      const questionY = screenY - 20 - Math.sin(Date.now() / 300) * 2;
      ctx.fillStyle = '#3498db';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', screenX, questionY);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    }
    
    // 工作状态：显示采集进度条（只在workTimer >= 0时显示，-1表示隐藏）
    if (this.state === 'working' && this.targetHex && this.workTimer >= 0) {
      const progressBarY = screenY - 25;
      const progressBarWidth = 30;
      const progressBarHeight = 4;
      const progress = Math.min(1, Math.max(0, this.workTimer)); // 0-1之间的进度
      
      // 进度条背景
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      roundRect(ctx, screenX - progressBarWidth / 2, progressBarY, progressBarWidth, progressBarHeight, 2);
      ctx.fill();
      
      // 进度条填充（亮黄色）
      const fillWidth = progressBarWidth * progress;
      if (fillWidth > 0) {
        ctx.fillStyle = '#FFD700'; // 亮黄色
        roundRect(ctx, screenX - progressBarWidth / 2, progressBarY, fillWidth, progressBarHeight, 2);
        ctx.fill();
      }
    }
    
    // 休息状态：显示泡泡
    if (this.state === 'resting') {
      const bubbleY = screenY - 20 - Math.sin(Date.now() / 300) * 2;
      const bubbleSize = 4 + Math.sin(Date.now() / 400) * 1;
      
      // 绘制泡泡
      ctx.fillStyle = 'rgba(173, 216, 230, 0.6)';
      ctx.beginPath();
      ctx.arc(screenX, bubbleY, bubbleSize, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = 'rgba(173, 216, 230, 0.8)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(screenX, bubbleY, bubbleSize, 0, Math.PI * 2);
      ctx.stroke();
      
      // 第二个小泡泡
      ctx.fillStyle = 'rgba(173, 216, 230, 0.4)';
      ctx.beginPath();
      ctx.arc(screenX - 3, bubbleY - 3, bubbleSize * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

