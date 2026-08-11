

// HexaLife 游戏类型定义

export interface HexConfig {
  hexSize: number;
  colors: {
    grass: string;
    grassDark: string;
    grassDepleted: string;
    forest: string;
    forestDepleted: string;
    water: string;
    rock: string;
    unit: string;
  };
  tiles: {
    [key: string]: TileConfig;
  };
  resources: {
    [key: string]: ResourceConfig;
  };
}

export interface TileConfig {
  name: string;
  color: string;
  cost: number;
  type: string;
  cap: number;
  regen: number;
  gatherTime: number; // 采集一次所需的时间（毫秒）
  desc: string;
  drops: string[];
  dropRates: number[];
}

// 地块配置结构体（用于信息面板显示）
export interface TileInfo {
  type: string; // 地块类型
  gridIndex: string; // 网格索引（q,r格式）
  gridCoord: { q: number; r: number }; // 网格坐标
  isDepleted: boolean; // 枯竭状态
  isRegenerating: boolean; // 是否正在恢复中
  currentYield: number; // 当前产量
  maxYield: number; // 最大产量
  purchaseCost: number; // 购买金额
  gatherTime: number; // 采集一次所需的时间（毫秒）
}

export interface ResourceConfig {
  name: string;
  icon: string;
  price: number;
}

export interface GameState {
  gold: number;
  level: number;
  xp: number;
  xpToNext: number;
  inventory: { [key: string]: number };
  units: Unit[];
  tiles: Map<string, Hex>;
  selectedCard: string | null;
  camera: { x: number; y: number };
  zoom: number;
  isDragging: boolean;
  isMiddleDragging: boolean;
  lastMouse: { x: number; y: number };
  mouse: { x: number; y: number };
  expandedResource: string | null;
  recruitBaseCost: number;
  hoveredTile: Hex | null;
  onResourceAdded?: (id: string, count: number) => void;
  onXPAdded?: (amount: number) => void;
  onFloatText?: (text: string, x: number, y: number, color: string) => void;
}

export interface HexCoordinate {
  q: number;
  r: number;
}

export interface Hex {
  q: number;
  r: number;
  type: string;
  maxRes: number;
  curRes: number;
  regenRate: number;
  occupiedBy: string | null;
  depletedTime: number | null;
  regenDelay: number;
  isDepleted(): boolean;
  isOccupied(): boolean;
  isRegenerating(): boolean;
  update(currentTime?: number): boolean;
  getWorldPos(): { x: number; y: number };
}

export interface Unit {
  id: string;
  q: number;
  r: number;
  worldX: number;
  worldY: number;
  targetHex: Hex | null;
  state: 'idle' | 'moving' | 'working' | 'returning' | 'resting' | 'thinking';
  workTimer: number;
  restTimer: number;
  update(dt: number): void;
  draw(ctx: CanvasRenderingContext2D): void;
}

