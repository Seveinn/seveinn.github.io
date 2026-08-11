// 游戏状态管理
export const state = {
    hp: 100, 
    maxHp: 100, 
    food: 60, 
    maxFood: 100, 
    ap: 3, 
    maxAp: 3, 
    atk: 20,
    enemyStats: { hp: 100, maxHp: 100, atk: 25 },
    turn: 1, 
    timePhase: 'night', 
    dayCounter: 0,
    isPlayerTurn: true, 
    isGameOver: false, 
    isWorldReady: false, 
    mode: 'move',
    playerPos: null, 
    enemyPos: { q: -999, r: -999 }, 
    items: [],
    settings: { 
        lang: 'zh', 
        difficulty: 'normal', 
        playerColor: '#ff8a65',
        colorScheme: 'classic', // 配色方案
        moveSpeed: 15, // 移动速度（lerp插值速度）
        initialTimePhase: 'night' // 初始时间阶段：'day' 或 'night'
    }
};

