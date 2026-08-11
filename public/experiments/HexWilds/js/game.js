// 游戏逻辑
import { CONFIG, LANG } from './config.js';
import { state } from './state.js';
import { scene, gridGroup, propGroup, glowGroup, grassGroup, pBody, pHead, selectionRing, enemyMesh } from './scene.js';
import { LightingManager } from './lighting.js';
import { tileMap } from './world.js';
import { getNeighbors, findPath, getDist } from './utils.js';
import { pGroup } from './scene.js';
import { updateUI, msg, createFloatingText, gameOver, clearHighlights, setMode } from './ui.js';
import { startPlayerTurn as playerStartTurn } from './player.js';

export function resetGame() {
    gridGroup.clear(); 
    propGroup.clear(); 
    glowGroup.clear(); 
    grassGroup.clear(); 
    tileMap.clear();
    state.items.forEach(i => scene.remove(i)); 
    state.items = []; 
    LightingManager.clear();
    if (state.settings.difficulty === 'hardcore') {
        state.maxHp=80; state.hp=80; state.maxFood=100; state.food=40; 
        state.atk=15; state.enemyStats={hp:150,maxHp:150,atk:30};
    } else {
        state.maxHp=100; state.hp=100; state.maxFood=100; state.food=80; 
        state.atk=25; state.enemyStats={hp:100,maxHp:100,atk:20};
    }
    state.turn=1; state.dayCounter=0; 
    state.timePhase = state.settings.initialTimePhase || 'night'; 
    state.isGameOver=false;
    pBody.material.color.set(state.settings.playerColor); 
    pHead.material.color.set(state.settings.playerColor);
}

export function toggleDayNight() {
    state.dayCounter++;
    if(state.dayCounter >= 3) {
        state.dayCounter = 0;
        state.timePhase = state.timePhase === 'night' ? 'day' : 'night';
        LightingManager.update(state.timePhase === 'day');
        const t = LANG[state.settings.lang];
        msg(state.timePhase === 'day' ? t.msg_day : t.msg_night);
        const icon = state.timePhase === 'night' ? '🌙' : '☀️';
        const text = state.timePhase === 'night' ? 
            (state.settings.lang==='zh'?'黑夜':'Night') : 
            (state.settings.lang==='zh'?'白昼':'Day');
        document.getElementById('time-display').innerHTML = `<span class="time-icon">${icon}</span> ${text}`;
    }
}

export function startPlayerTurn() {
    if(state.isGameOver) return;
    toggleDayNight();
    playerStartTurn();
}

export function startEnemyTurn() {
    state.isPlayerTurn = false; 
    selectionRing.visible = false; 
    clearHighlights(); 
    setMode('none');
    if(state.enemyStats.hp <= 0) { 
        setTimeout(startPlayerTurn, 800); 
        return; 
    }
    if(state.timePhase === 'day') {
        const burnDmg = Math.floor(state.enemyStats.maxHp * 0.05); 
        state.enemyStats.hp -= burnDmg;
        createFloatingText(enemyMesh.position, `-${burnDmg} (Sun)`, "#ff5722");
        if(state.enemyStats.hp <= 0) { 
            state.enemyStats.hp=0; 
            document.getElementById('enemy-hud').style.display='none'; 
            scene.remove(enemyMesh); 
            setTimeout(startPlayerTurn, 1000); 
            return; 
        }
        updateUI();
    }
    setTimeout(() => {
        const playerTile = tileMap.get(`${state.playerPos.q},${state.playerPos.r}`);
        const dist = getDist(state.enemyPos, state.playerPos);
        const isHidden = playerTile.hasGrass && dist > 1;
        if(!isHidden) {
            let movePath = null;
            const neighbors = getNeighbors(state.playerPos.q, state.playerPos.r, tileMap).filter(t => !t.isObstacle);
            for(let t of neighbors) { 
                const p = findPath(state.enemyPos, t, tileMap); 
                if(p && (!movePath || p.length < movePath.length)) movePath = p; 
            }
            if(dist === 1) performEnemyAttack();
            else if (movePath && movePath.length > 1) {
                const step = movePath[Math.min(movePath.length-1, 1)];
                state.enemyPos.q = step.q; 
                state.enemyPos.r = step.r; 
                enemyMesh.userData.target = step.worldPos.clone();
                if(getDist(state.enemyPos, state.playerPos) === 1) 
                    setTimeout(performEnemyAttack, 300); 
                else 
                    setTimeout(startPlayerTurn, 600);
            } else setTimeout(startPlayerTurn, 600);
        } else { 
            msg("Enemy cannot see you..."); 
            setTimeout(startPlayerTurn, 1000); 
        }
    }, 1000);
}

function performEnemyAttack() {
    let dmg = state.enemyStats.atk; 
    if(state.timePhase === 'day') dmg = Math.floor(dmg * 0.5);
    state.hp -= dmg; 
    createFloatingText(pGroup.position, `-${dmg} HP`, "#d32f2f"); 
    updateUI();
    if(state.hp <= 0) 
        gameOver(LANG[state.settings.lang].reason_killed); 
    else 
        setTimeout(startPlayerTurn, 1000);
}


