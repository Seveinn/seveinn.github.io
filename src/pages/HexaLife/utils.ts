import { CONFIG } from './config';
import { HexCoordinate } from './types';

/**
 * 核心坐标系统
 * hexToPixel: 返回【世界坐标】，不包含摄像机偏移和缩放
 */
export function hexToPixel(q: number, r: number, zoom: number = 1): { x: number; y: number } {
  const x = CONFIG.hexSize * (3 / 2 * q) * zoom;
  const y = CONFIG.hexSize * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r) * zoom;
  return { x, y };
}

/**
 * pixelToHex: 输入【屏幕坐标】，减去摄像机偏移和缩放后转为六边形坐标
 */
export function pixelToHex(screenX: number, screenY: number, cameraX: number, cameraY: number, zoom: number = 1): HexCoordinate {
  const worldX = (screenX - cameraX) / zoom;
  const worldY = (screenY - cameraY) / zoom;
  
  const q = (2 / 3 * worldX) / CONFIG.hexSize;
  const r = (-1 / 3 * worldX + Math.sqrt(3) / 3 * worldY) / CONFIG.hexSize;
  return hexRound(q, r);
}

function hexRound(q: number, r: number): HexCoordinate {
  let s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  let rs = Math.round(s);
  if (Math.abs(rq - q) > Math.abs(rr - r) && Math.abs(rq - q) > Math.abs(rs - s)) {
    rq = -rr - rs;
  } else if (Math.abs(rr - r) > Math.abs(rs - s)) {
    rr = -rq - rs;
  }
  return { q: rq, r: rr };
}

export function getHexDist(q1: number, r1: number, q2: number, r2: number): number {
  return (Math.abs(q1 - q2) + Math.abs(q1 + r1 - q2 - r2) + Math.abs(r1 - r2)) / 2;
}

// 辅助函数：将十六进制颜色转换为RGB
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // 处理 #RRGGBB 格式
  if (hex.startsWith('#')) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }
  // 处理 rgb(r, g, b) 格式
  const rgbMatch = hex.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1]),
      g: parseInt(rgbMatch[2]),
      b: parseInt(rgbMatch[3])
    };
  }
  return null;
}

// 绘图辅助函数
export function drawHex(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, type: string) {
  const size = CONFIG.hexSize - 1;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const ang = Math.PI / 3 * i;
    ctx.lineTo(x + size * Math.cos(ang), y + size * Math.sin(ang));
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.05)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  if (type === 'forest') {
    ctx.beginPath();
    ctx.arc(x, y - 5, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x - 5, y + 5, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 5, y + 5, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  if (type === 'rock') {
    ctx.fillRect(x - 4, y - 4, 8, 8);
  }
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function ellipse(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number) {
  ctx.save();
  ctx.beginPath();
  ctx.translate(cx - rx, cy - ry);
  ctx.scale(rx, ry);
  ctx.arc(1, 1, 1, 0, 2 * Math.PI, false);
  ctx.restore();
}

// 简单的伪随机数生成器（基于种子）
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// 绘制草地上的草（矢量化风格）
export function drawGrassBlades(ctx: CanvasRenderingContext2D, x: number, y: number, q: number, r: number) {
  const size = CONFIG.hexSize - 1;
  const grassCount = 3 + Math.floor(seededRandom(q * 1000 + r) * 3); // 3-5根草
  
  for (let i = 0; i < grassCount; i++) {
    // 使用地块坐标作为种子，生成固定的随机位置
    const seed = q * 10000 + r * 1000 + i;
    const angle = seededRandom(seed) * Math.PI * 2;
    const distance = seededRandom(seed + 1) * size * 0.7; // 在六边形内70%范围内
    
    const grassX = x + Math.cos(angle) * distance;
    const grassY = y + Math.sin(angle) * distance;
    
    // 统一宽度为3px，高度随机
    const width = 3; // 统一宽度3px
    const height = 4 + seededRandom(seed + 2) * 8; // 4-12px高
    
    // 随机角度（稍微倾斜）
    const grassAngle = (seededRandom(seed + 3) - 0.5) * 0.3; // -0.15 到 0.15 弧度
    
    ctx.save();
    ctx.translate(grassX, grassY);
    ctx.rotate(grassAngle);
    
    // 绘制阴影（干净的单一颜色，矢量化风格）
    ctx.fillStyle = 'rgba(60, 100, 60, 0.15)'; // 深绿色半透明阴影
    roundRect(ctx, -width / 2, height / 2 - 0.5, width, 1.5, 0.75);
    ctx.fill();
    
    // 绘制草（单一颜色的圆角矩形，矢量化风格）
    ctx.fillStyle = '#6b9b6b'; // 统一的绿色，矢量化风格
    roundRect(ctx, -width / 2, -height / 2, width, height, 1);
    ctx.fill();
    
    ctx.restore();
  }
}

