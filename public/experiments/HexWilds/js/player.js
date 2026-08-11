// 玩家角色移动和状态管理
import { CONFIG, LANG } from './config.js';
import { state } from './state.js';
import { scene, pGroup, selectionRing } from './scene.js';
import { tileMap } from './world.js';
import { findPath, getDist, getNeighbors } from './utils.js';
import { updateUI, msg, createFloatingText, gameOver } from './ui.js';

// 移动队列：存储待移动的路径
let moveQueue = [];
let isMoving = false;
let moveCallback = null;

/**
 * 更新实体视觉位置
 * @param {THREE.Object3D} obj - 要更新的对象
 * @param {number} q - 六边形坐标q
 * @param {number} r - 六边形坐标r
 * @param {boolean} now - 是否立即设置位置
 */
export function updateEntityVisuals(obj, q, r, now = false) {
    const t = tileMap.get(`${q},${r}`);
    if (t) {
        obj.userData.target = t.worldPos.clone();
        if (now) obj.position.copy(t.worldPos);
    }
}

/**
 * 处理玩家移动
 * @param {Object} targetTile - 目标地块
 */
export function handleMove(targetTile) {
    if (isMoving) return; // 如果正在移动，忽略新的移动请求
    
    const path = findPath(state.playerPos, targetTile, tileMap);
    if (path && path.length > 1 && state.ap >= path.length - 1) {
        const t = path[path.length - 1];
        let cost = 5;
        if (t.type === 'forest') cost = 8; // 森林地形消耗更多食物

        // 扣除行动点和食物
        state.ap -= (path.length - 1);
        state.food = Math.max(0, state.food - cost);

        // 设置移动队列（跳过第一个，因为那是当前位置）
        moveQueue = path.slice(1); // 移除第一个元素（当前位置）
        isMoving = true;
        
        // 存储目标地块信息，用于移动完成后的处理
        moveCallback = () => {
            // 夜间进入森林会受到伤害
            if (state.timePhase === 'night' && t.type === 'forest') {
                state.hp -= 10;
                createFloatingText(pGroup.position, "-10 HP (Thorns)", "#e53935");
                msg(LANG[state.settings.lang].msg_forest);
                updateUI();
                if (state.hp <= 0) {
                    gameOver(LANG[state.settings.lang].reason_killed);
                    return;
                }
            }

            // 检查是否拾取物品
            const idx = state.items.findIndex(i => i.userData.q === t.q && i.userData.r === t.r);
            if (idx !== -1) {
                scene.remove(state.items[idx]);
                state.items.splice(idx, 1);
                state.food = Math.min(state.maxFood, state.food + 25);
                tileMap.get(`${t.q},${t.r}`).hasItem = false;
                createFloatingText(pGroup.position, "+25 Food", "#ffca28");
            }

            // 检查是否进入草丛（获得潜行效果）
            if (t.hasGrass) {
                createFloatingText(pGroup.position, "Stealth", "#a5d6a7");
                msg(LANG[state.settings.lang].msg_stealth);
            }

            updateUI();
        };

        // 开始移动第一步
        startNextMove();
    } else {
        createFloatingText(pGroup.position, LANG[state.settings.lang].msg_ap, "#ef5350");
    }
}

/**
 * 开始移动到下一个格子
 */
function startNextMove() {
    if (moveQueue.length === 0) {
        // 移动完成
        isMoving = false;
        if (moveCallback) {
            moveCallback();
            moveCallback = null;
        }
        // 触发移动完成事件，让 UI 更新光标
        if (typeof window !== 'undefined' && window.onPlayerMoveComplete) {
            window.onPlayerMoveComplete();
        }
        return;
    }

    // 获取下一个目标格子
    const nextTile = moveQueue.shift();
    state.playerPos = { q: nextTile.q, r: nextTile.r };
    updateEntityVisuals(pGroup, nextTile.q, nextTile.r);
}

/**
 * 更新移动状态（在动画循环中调用）
 * @param {number} dt - 帧时间差
 * @returns {boolean} - 是否正在移动
 */
export function updateMovement(dt) {
    if (!isMoving || !pGroup.userData.target) return false;
    
    // 检查是否到达当前目标
    const distance = pGroup.position.distanceTo(pGroup.userData.target);
    if (distance < 0.05) { // 到达阈值
        pGroup.position.copy(pGroup.userData.target);
        // 移动到下一个格子
        startNextMove();
    }
    
    return isMoving;
}

/**
 * 检查是否正在移动
 */
export function getIsMoving() {
    return isMoving;
}

/**
 * 处理玩家休息
 * 恢复生命值，消耗食物和行动点
 */
export function doRest() {
    if (state.isPlayerTurn && state.ap >= 1) {
        state.ap--;
        state.hp = Math.min(state.maxHp, state.hp + 10);
        state.food = Math.max(0, state.food - 5);
        updateUI();
        createFloatingText(pGroup.position, "+10 HP", "#66bb6a");
    } else {
        createFloatingText(pGroup.position, LANG[state.settings.lang].msg_ap, "#ef5350");
    }
}

/**
 * 开始玩家回合
 * 更新玩家状态：恢复行动点、消耗食物、检查光照恢复等
 */
export function startPlayerTurn() {
    if (state.isGameOver) return;

    // 回合数增加，恢复行动点
    state.turn++;
    state.ap = state.maxAp;

    // 每回合消耗食物
    state.food -= (state.settings.difficulty === 'hardcore' ? 8 : 5);

    // 夜间在光源附近恢复生命值
    if (state.timePhase === 'night') {
        const neighbors = getNeighbors(state.playerPos.q, state.playerPos.r, tileMap);
        if (neighbors.some(n => n.hasLight)) {
            state.hp = Math.min(state.maxHp, state.hp + 5);
            createFloatingText(pGroup.position, "+5 HP (Light)", "#00bcd4");
        }
    }

    // 设置玩家回合状态
    state.isPlayerTurn = true;
    selectionRing.visible = true;

    // 检查饥饿状态
    if (state.food <= 0) {
        state.food = 0;
        state.hp -= 10;
        if (state.hp <= 0) {
            gameOver(LANG[state.settings.lang].reason_starve);
        }
    }

    updateUI();
}

/**
 * 更新玩家状态（在回合开始时调用）
 * 这个方法会被 game.js 中的 startPlayerTurn 调用，但状态更新逻辑在这里
 */
export function updatePlayerState() {
    // 检查并更新玩家状态
    if (state.food <= 0) {
        state.food = 0;
        state.hp -= 10;
        if (state.hp <= 0) {
            gameOver(LANG[state.settings.lang].reason_starve);
        }
    }
    updateUI();
}

