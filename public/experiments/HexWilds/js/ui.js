// UI和事件处理
import * as THREE from 'three';
import { CONFIG, LANG, COLOR_SCHEMES } from './config.js';
import { state } from './state.js';
import { scene, camera, gridGroup, highlightPool, pGroup, enemyMesh, pBody, pHead } from './scene.js';
import { tileMap } from './world.js';
import { findPath, getDist } from './utils.js';
import { startEnemyTurn } from './game.js';
import { generateWorld } from './world.js';
import { resetGame } from './game.js';
import { handleMove as playerHandleMove, doRest as playerDoRest, getIsMoving } from './player.js';

// 注册移动完成回调
window.onPlayerMoveComplete = () => {
    updateCursor();
};

let hoveredTile = null;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// UI面板选择器列表
const UI_PANEL_SELECTORS = [
    '#ui-panel',
    '#action-bar',
    '#modal-container',
    '.modal-content',
    '#time-display',
    '#enemy-hud',
    '#game-over',
    '#loading-screen',
    '#color-scheme-selection',
    '#character-settings',
    '#game-settings',
    '#light-settings'
];

/**
 * 检查鼠标是否在任意UI面板上
 * @param {Event} event - 鼠标事件
 * @returns {boolean} - 如果鼠标在UI面板上返回true
 */
function isMouseOverUIPanel(event) {
    const target = event.target;
    // 检查是否在pointer-auto元素上（已有类标记的元素）
    if (target.closest('.pointer-auto')) {
        return true;
    }
    // 检查是否在任何UI面板上
    for (const selector of UI_PANEL_SELECTORS) {
        if (target.closest(selector)) {
            return true;
        }
    }
    return false;
}

export function updateUI() {
    const hpPct = Math.max(0, (state.hp / state.maxHp) * 100);
    const foodPct = Math.max(0, (state.food / state.maxFood) * 100);
    const enemyHpPct = state.enemyStats.hp > 0 ? (state.enemyStats.hp / state.enemyStats.maxHp) * 100 : 0;
    document.getElementById('hp-bar').style.width = `${hpPct}%`;
    document.getElementById('food-bar').style.width = `${foodPct}%`;
    document.getElementById('ap-display').innerText = `${state.ap} / ${state.maxAp}`;
    document.getElementById('turn-val').innerText = state.turn;
    document.getElementById('enemy-hp-fill').style.width = `${enemyHpPct}%`;
    updateActionButtons();
}

function updateActionButtons() {
    const ids = ['btn-move','btn-attack','btn-wait'];
    ids.forEach(id=>document.getElementById(id).classList.remove('active'));
    if(state.mode==='move') document.getElementById('btn-move').classList.add('active');
    if(state.mode==='attack') document.getElementById('btn-attack').classList.add('active');
    document.getElementById('btn-move').classList.toggle('disabled', state.ap < 1);
    document.getElementById('btn-attack').classList.toggle('disabled', state.ap < 2);
    document.getElementById('btn-wait').classList.toggle('disabled', state.ap < 1);
}

window.toggleModal = (id) => {
    const modal = document.getElementById(id);
    const container = document.getElementById('modal-container');
    // 隐藏配色方案选择面板和选择器
    const colorSchemeSelection = document.getElementById('color-scheme-selection');
    const colorSchemeSelector = document.getElementById('color-scheme-selector');
    if (colorSchemeSelection) colorSchemeSelection.style.display = 'none';
    if (colorSchemeSelector) colorSchemeSelector.style.display = 'none';
    document.querySelectorAll('.modal-content').forEach(m => {
        if (m.id !== 'color-scheme-selection' && m.id !== 'color-scheme-selector') {
            m.style.display = 'none';
        }
    });
    if (modal && modal.style.display === 'block') { 
        container.style.display = 'none'; 
        modal.style.display = 'none'; 
    } else if (modal) { 
        container.style.display = 'flex'; 
        modal.style.display = 'block';
        // 如果是角色设置面板，初始化值
        if (id === 'character-settings') {
            document.getElementById('set-char-color').value = state.settings.playerColor;
            const moveSpeedInput = document.getElementById('set-moveSpeed');
            moveSpeedInput.value = state.settings.moveSpeed || 15;
            document.getElementById('val-moveSpeed').innerText = moveSpeedInput.value;
        }
        // 如果是游戏设置面板，初始化值
        if (id === 'game-settings') {
            const langSelect = document.getElementById('set-lang');
            const diffSelect = document.getElementById('set-diff');
            const schemeSelect = document.getElementById('set-color-scheme');
            const initialTimeSelect = document.getElementById('set-initial-time');
            if (langSelect) langSelect.value = state.settings.lang;
            if (diffSelect) diffSelect.value = state.settings.difficulty;
            if (schemeSelect) schemeSelect.value = state.settings.colorScheme || 'classic';
            if (initialTimeSelect) initialTimeSelect.value = state.settings.initialTimePhase || 'night';
        }
    }
};

window.closeModal = () => { 
    document.getElementById('modal-container').style.display = 'none'; 
    document.querySelectorAll('.modal-content').forEach(m => m.style.display = 'none'); 
};

window.applyGameSettings = async () => {
    state.settings.lang = document.getElementById('set-lang').value;
    state.settings.difficulty = document.getElementById('set-diff').value;
    // 配色方案从下拉框获取
    const schemeSelect = document.getElementById('set-color-scheme');
    if (schemeSelect) {
        state.settings.colorScheme = schemeSelect.value;
    }
    // 初始时间从下拉框获取
    const initialTimeSelect = document.getElementById('set-initial-time');
    if (initialTimeSelect) {
        state.settings.initialTimePhase = initialTimeSelect.value;
    }
    closeModal(); 
    resetGame();
    await generateWorld();
    updateText();
};

// 应用角色设置
window.applyCharacterSettings = () => {
    state.settings.playerColor = document.getElementById('set-char-color').value;
    const moveSpeedInput = document.getElementById('set-moveSpeed');
    state.settings.moveSpeed = parseInt(moveSpeedInput.value);
    
    // 更新角色颜色
    pBody.material.color.set(state.settings.playerColor);
    pHead.material.color.set(state.settings.playerColor);
    
    closeModal();
    updateText();
};

// 更新移动速度显示
window.updateMoveSpeed = (value) => {
    state.settings.moveSpeed = parseInt(value);
    document.getElementById('val-moveSpeed').innerText = value;
};

// 显示配色方案选择器（在游戏设置中）
window.showColorSchemeSelector = () => {
    const selector = document.getElementById('color-scheme-selector');
    const container = document.getElementById('modal-container');
    if (selector && container) {
        container.style.display = 'flex';
        selector.style.display = 'block';
        // 标记当前选中的方案
        document.querySelectorAll('#color-scheme-selector .scheme-option').forEach(opt => {
            opt.classList.toggle('selected', opt.dataset.scheme === state.settings.colorScheme);
        });
        updateText();
    }
};

// 关闭配色方案选择器
window.closeColorSchemeSelector = () => {
    const selector = document.getElementById('color-scheme-selector');
    const container = document.getElementById('modal-container');
    if (selector) selector.style.display = 'none';
    // 返回到游戏设置面板
    const gameSettings = document.getElementById('game-settings');
    if (gameSettings && container) {
        container.style.display = 'flex';
        gameSettings.style.display = 'block';
    }
};

// 在游戏设置中选择配色方案
window.selectColorSchemeInSettings = (scheme) => {
    document.querySelectorAll('#color-scheme-selector .scheme-option').forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.scheme === scheme);
    });
};

// 确认配色方案并重启游戏
window.confirmColorSchemeInSettings = async () => {
    const selectedOption = document.querySelector('#color-scheme-selector .scheme-option.selected');
    if (selectedOption) {
        const scheme = selectedOption.dataset.scheme;
        state.settings.colorScheme = scheme;
        // 更新游戏设置面板中的下拉框
        const schemeSelect = document.getElementById('set-color-scheme');
        if (schemeSelect) {
            schemeSelect.value = scheme;
        }
    }
    closeColorSchemeSelector();
    closeModal();
    // 重启游戏
    resetGame();
    await generateWorld();
    updateText();
};

export function updateText() {
    const t = LANG[state.settings.lang];
    for (const key in t) { 
        const els = document.querySelectorAll(`.lang-${key}`); 
        els.forEach(el => el.innerText = t[key]); 
    }
    // 更新配色方案名称（包括游戏设置中的下拉框）
    document.querySelectorAll('[data-scheme-name]').forEach(el => {
        const schemeName = el.dataset.schemeName;
        if (COLOR_SCHEMES[schemeName]) {
            el.innerText = COLOR_SCHEMES[schemeName].name[state.settings.lang] || COLOR_SCHEMES[schemeName].name.en;
        }
    });
    // 更新游戏设置下拉框中的选项文本
    const schemeSelect = document.getElementById('set-color-scheme');
    if (schemeSelect) {
        Array.from(schemeSelect.options).forEach(option => {
            const scheme = COLOR_SCHEMES[option.value];
            if (scheme) {
                option.text = scheme.name[state.settings.lang] || scheme.name.en;
            }
        });
    }
    // 更新初始时间选项的文本（游戏设置面板）
    const initialTimeSelect = document.getElementById('set-initial-time');
    if (initialTimeSelect) {
        Array.from(initialTimeSelect.options).forEach(option => {
            if (option.classList.contains('lang-initial_time_day')) {
                option.text = t.initial_time_day || 'Day';
            } else if (option.classList.contains('lang-initial_time_night')) {
                option.text = t.initial_time_night || 'Night';
            }
        });
    }
    // 更新初始时间选项的文本（配色选择面板）
    const initialTimeSelection = document.getElementById('initial-time-selection');
    if (initialTimeSelection) {
        Array.from(initialTimeSelection.options).forEach(option => {
            if (option.classList.contains('lang-initial_time_day')) {
                option.text = t.initial_time_day || 'Day';
            } else if (option.classList.contains('lang-initial_time_night')) {
                option.text = t.initial_time_night || 'Night';
            }
        });
    }
}

export function msg(t) { 
    document.getElementById('log-msg').innerText = t; 
}

export function createFloatingText(pos, text, color) {
    const div = document.createElement('div'); 
    div.className = 'floating-text'; 
    div.innerText = text; 
    div.style.color = color;
    div.userData = { pos: pos.clone() }; 
    document.getElementById('floating-text-container').appendChild(div);
    setTimeout(() => div.remove(), 1500);
}

export function gameOver(reason) { 
    state.isGameOver = true; 
    document.getElementById('death-reason').innerText = reason; 
    document.getElementById('game-over').style.display = 'flex'; 
}

export function clearHighlights() { 
    highlightPool.forEach(h=>h.visible=false); 
}

function highlightTile(t, c) { 
    const h=highlightPool[0]; 
    h.position.copy(t.worldPos); 
    h.position.y+=0.05; 
    h.material.color.setHex(c); 
    h.visible=true; 
}

export function setMode(mode) { 
    if(state.isPlayerTurn) { 
        state.mode = mode; 
        updateUI(); 
        updateCursor(); 
        msg(mode==='move' ? LANG[state.settings.lang].msg_move : LANG[state.settings.lang].msg_attack); 
    }
}
window.setMode = setMode;

window.doRest = playerDoRest;

window.endPlayerTurn = () => { 
    if(state.isPlayerTurn) startEnemyTurn(); 
};

function updateCursor() {
    clearHighlights();
    const cursorEl = document.getElementById('attack-cursor');
    if(!hoveredTile) { 
        cursorEl.style.display = 'none'; 
        return; 
    }

    if(state.mode === 'attack') {
        const dist = getDist(state.playerPos, hoveredTile);
        const isEnemy = (hoveredTile.q===state.enemyPos.q && hoveredTile.r===state.enemyPos.r);
        const isValid = isEnemy && dist === 1;
        
        cursorEl.style.display = 'flex';
        cursorEl.innerHTML = isValid ? '<span class="cursor-valid">⚔️</span>' : '<span class="cursor-invalid">🚫</span>';
        
        const vec = hoveredTile.worldPos.clone(); 
        vec.y += 1.0; 
        vec.project(camera);
        cursorEl.style.left = ((vec.x * .5 + .5) * window.innerWidth) + 'px'; 
        cursorEl.style.top = ((-(vec.y * .5) + .5) * window.innerHeight) + 'px';
        
        highlightTile(hoveredTile, isValid ? 0xff5252 : 0xffffff);
        document.body.style.cursor = 'none';
    } else {
        cursorEl.style.display = 'none'; 
        document.body.style.cursor = 'default';
        if(hoveredTile.q === state.playerPos.q && hoveredTile.r === state.playerPos.r) { 
            highlightTile(hoveredTile, 0xffffff); 
            return; 
        }
        
        const path = findPath(state.playerPos, hoveredTile, tileMap);
        if(path && path.length > 1) {
            const can = state.ap >= path.length - 1;
            path.forEach((n, i) => { 
                if(i>0 && i-1<highlightPool.length) { 
                    const h=highlightPool[i-1]; 
                    h.position.copy(n.worldPos); 
                    h.position.y+=0.05; 
                    h.material.color.setHex(can?CONFIG.colors.pathValid:CONFIG.colors.pathInvalid); 
                    h.visible=true; 
                }
            });
            document.body.style.cursor = can ? 'pointer' : 'not-allowed';
        } else {
            document.body.style.cursor = 'not-allowed';
        }
    }
}

function handleMove() {
    if (hoveredTile) {
        playerHandleMove(hoveredTile);
        // 如果不在移动队列中，立即更新光标
        // 否则在移动完成后由 player.js 触发更新
        if (!getIsMoving()) {
            updateCursor();
        }
    }
}

function handleAttack() {
    const isEnemy = (hoveredTile.q===state.enemyPos.q && hoveredTile.r===state.enemyPos.r);
    if(isEnemy && getDist(state.playerPos, hoveredTile)===1 && state.ap>=2) {
        state.ap-=2; 
        const dmg=state.atk; 
        state.enemyStats.hp-=dmg; 
        createFloatingText(enemyMesh.position, `-${dmg}`, "#ffeb3b");
        if(state.enemyStats.hp<=0) { 
            state.enemyStats.hp=0; 
            document.getElementById('enemy-hud').style.display='none'; 
            scene.remove(enemyMesh); 
            state.enemyPos={q:-999,r:-999}; 
        }
        updateUI();
    } else {
        createFloatingText(pGroup.position, LANG[state.settings.lang].msg_ap, "#ef5350"); 
    }
}


window.addEventListener('mousemove', (e) => {
    // 如果世界未就绪或鼠标在UI面板上，停止射线检测
    if(!state.isWorldReady || isMouseOverUIPanel(e)) {
        hoveredTile=null; 
        clearHighlights(); 
        document.getElementById('attack-cursor').style.display = 'none'; 
        document.body.style.cursor='default'; 
        return; 
    }
    mouse.x = (e.clientX/window.innerWidth)*2-1; 
    mouse.y=-(e.clientY/window.innerHeight)*2+1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(gridGroup.children, false);
    if(intersects.length>0 && intersects[0].object.userData.worldPos) {
        const hit = intersects[0].object.userData;
        if(hoveredTile!==hit) { 
            hoveredTile=hit; 
            updateCursor(); 
        }
    } else { 
        hoveredTile=null; 
        clearHighlights(); 
        document.getElementById('attack-cursor').style.display = 'none'; 
    }
});

window.addEventListener('mousedown', (e) => {
    // 如果鼠标在UI面板上，不处理世界交互
    if(!state.isPlayerTurn||!hoveredTile||state.isGameOver||isMouseOverUIPanel(e)) return;
    if(e.button===2) setMode('move');
    else if(e.button===0) { 
        state.mode==='move' ? handleMove() : handleAttack(); 
    }
});

export { updateCursor, handleMove, handleAttack };

