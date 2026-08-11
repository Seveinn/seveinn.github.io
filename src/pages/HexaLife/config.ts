import { HexConfig } from './types';

export const CONFIG: HexConfig = {
  hexSize: 38,
  colors: {
    grass: '#A0D6B4',
    grassDark: '#8FC2A3',
    grassDepleted: '#d4dcb6',
    forest: '#5D9B7B',
    forestDepleted: '#8c9c8e',
    water: '#87CEEB',
    rock: '#B0B0B0',
    unit: '#fffaf0'
  },
  tiles: {
    grass: {
      name: '丰饶草地',
      color: '#A0D6B4',
      cost: 50,
      type: 'grass',
      cap: 5,
      regen: 0.02,
      gatherTime: 3000, // 3秒
      desc: '基础种植地块，产出野花与小麦。',
      drops: ['wildflower', 'wheat', 'berry'],
      dropRates: [0.6, 0.3, 0.1]
    },
    forest: {
      name: '古老森林',
      color: '#5D9B7B',
      cost: 80,
      type: 'forest',
      cap: 8,
      regen: 0.015,
      gatherTime: 4000, // 4秒
      desc: '林木资源丰富，偶尔有蘑菇。',
      drops: ['wood', 'mushroom', 'resin'],
      dropRates: [0.6, 0.3, 0.1]
    },
    river: {
      name: '清澈溪流',
      color: '#87CEEB',
      cost: 100,
      type: 'river',
      cap: 100,
      regen: 99,
      gatherTime: 2000, // 2秒（水最容易采集）
      desc: '永不枯竭的水源地。',
      drops: ['water', 'fish'],
      dropRates: [0.7, 0.3]
    },
    rock: {
      name: '岩石荒地',
      color: '#B0B0B0',
      cost: 30,
      type: 'rock',
      cap: 20,
      regen: 0.01,
      gatherTime: 6000, // 6秒（岩石最难采集）
      desc: '坚硬的岩石，含有矿产。',
      drops: ['stone', 'crystal'],
      dropRates: [0.9, 0.1]
    }
  },
  resources: {
    wildflower: { name: '野花', icon: '🌸', price: 2 },
    wheat: { name: '小麦', icon: '🌾', price: 4 },
    berry: { name: '浆果', icon: '🍒', price: 6 },
    wood: { name: '木材', icon: '🪵', price: 5 },
    mushroom: { name: '蘑菇', icon: '🍄', price: 8 },
    resin: { name: '树脂', icon: '🍯', price: 12 },
    water: { name: '清水', icon: '💧', price: 3 },
    fish: { name: '鲜鱼', icon: '🐟', price: 10 },
    stone: { name: '石料', icon: '🪨', price: 4 },
    crystal: { name: '水晶', icon: '💎', price: 30 }
  }
};

