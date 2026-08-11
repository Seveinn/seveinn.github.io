import { CONFIG } from './config';
import { GameState } from './types';
import { Hex as HexClass } from './Hex';

export function createGameState(): GameState {
  const state: GameState = {
    gold: 150,
    level: 1,
    xp: 0,
    xpToNext: 100,
    inventory: {},
    units: [],
    tiles: new Map(),
    selectedCard: null,
    camera: { x: 0, y: 0 },
    zoom: 1,
    isDragging: false,
    isMiddleDragging: false,
    lastMouse: { x: 0, y: 0 },
    mouse: { x: 0, y: 0 },
    expandedResource: null,
    recruitBaseCost: 50,
    hoveredTile: null
  };

  // 初始化库存
  for (let k in CONFIG.resources) {
    state.inventory[k] = 0;
  }

  return state;
}

export function placeTile(state: GameState, q: number, r: number, type: string): boolean {
  const key = `${q},${r}`;
  if (state.tiles.has(key)) return false;
  state.tiles.set(key, new HexClass(q, r, type));
  return true;
}

export function getRecruitCost(state: GameState): number {
  const base = state.recruitBaseCost;
  const extra = Math.max(0, (state.units.length - 2) * 25);
  return base + extra;
}

