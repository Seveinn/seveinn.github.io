import { CONFIG } from './config';
import { Hex as IHex } from './types';
import { hexToPixel } from './utils';

export class Hex implements IHex {
  q: number;
  r: number;
  type: string;
  maxRes: number;
  curRes: number;
  regenRate: number;
  occupiedBy: string | null;
  depletedTime: number | null;
  regenDelay: number;
  originalMaxRes: number; // 原始最大产量，用于恢复后计算70%
  private lastUpdateTime: number = 0; // 上次更新时间戳（毫秒）

  constructor(q: number, r: number, type: string) {
    this.q = q;
    this.r = r;
    this.type = type;
    const conf = CONFIG.tiles[type];
    this.maxRes = conf.cap;
    this.originalMaxRes = conf.cap; // 保存原始最大产量
    this.curRes = conf.cap;
    this.regenRate = conf.regen;
    this.occupiedBy = null;
    this.depletedTime = null;
    this.regenDelay = 20000; // 20秒（毫秒）
    this.lastUpdateTime = Date.now();
  }

  isDepleted(): boolean {
    return this.curRes <= 0;
  }
  
  // 检查是否被角色占用
  isOccupied(): boolean {
    return this.occupiedBy !== null;
  }
  
  // 检查是否正在恢复中
  isRegenerating(): boolean {
    if (this.curRes > 0 || this.depletedTime === null) {
      return false;
    }
    const elapsed = Date.now() - this.depletedTime;
    return elapsed < this.regenDelay;
  }

  // 优化后的更新方法：使用时间戳，只在需要时更新
  update(currentTime?: number): boolean {
    // 如果地块未枯竭，不需要更新
    if (this.curRes > 0) {
      // 如果之前是枯竭状态，现在有资源了，重置状态
      if (this.depletedTime !== null) {
        this.depletedTime = null;
        return true; // 状态改变，需要通知外部
      }
      return false; // 无需更新
    }

    // 地块已枯竭，需要更新
    const now = currentTime ?? Date.now();
    
    // 记录枯竭时间（首次枯竭时）
    if (this.depletedTime === null) {
      this.depletedTime = now;
      this.lastUpdateTime = now;
      return true; // 状态改变
    }

    // 计算经过的时间（毫秒）
    const elapsed = now - this.depletedTime;
    
    // 如果还没到恢复延迟时间，不需要更新资源
    if (elapsed < this.regenDelay) {
      return false; // 仍在等待中，无需更新
    }

    // 计算自上次更新以来经过的时间（秒）
    const deltaTime = (now - this.lastUpdateTime) / 1000;
    this.lastUpdateTime = now;

    // 开始恢复资源（按秒计算恢复量）
    this.curRes += this.regenRate * deltaTime * 60; // regenRate 是按帧计算的，转换为按秒
    
    // 限制不超过最大产量
    if (this.curRes > this.maxRes) {
      this.curRes = this.maxRes;
    }
    
    // 如果恢复到上限，重置计时器，并将最大产量设为原来的70%（取整）
    if (this.curRes >= this.maxRes) {
      this.maxRes = Math.floor(this.originalMaxRes * 0.7);
      this.curRes = this.maxRes; // 恢复后产量等于新的最大产量
      this.depletedTime = null;
      return true; // 状态改变，恢复完成
    }

    return true; // 正在恢复中，状态改变
  }

  // 返回世界坐标
  getWorldPos(): { x: number; y: number } {
    return hexToPixel(this.q, this.r);
  }
}

