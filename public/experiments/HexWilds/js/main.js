// 主入口文件
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { state } from './state.js';
import { scene, camera, renderer, controls, pGroup, enemyMesh, highlightPool, d } from './scene.js';
import { LightingManager } from './lighting.js';
import { generateWorld } from './world.js';
import { updateUI, updateText, msg } from './ui.js';
import { selectionRing } from './scene.js';
import { tileMap } from './world.js';
import { updateMovement } from './player.js';

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta(); 
    const time = clock.getElapsedTime();
    controls.update();
    
    // 更新玩家移动（逐格移动）
    const isPlayerMoving = updateMovement(dt);
    const moveSpeed = state.settings.moveSpeed || 15;
    if (pGroup.userData.target && !isPlayerMoving) {
        // 如果不在移动队列中，使用平滑插值
        pGroup.position.lerp(pGroup.userData.target, (moveSpeed * 0.67)*dt);
    } else if (isPlayerMoving && pGroup.userData.target) {
        // 移动队列中的平滑移动，使用自定义移动速度
        pGroup.position.lerp(pGroup.userData.target, moveSpeed*dt);
    }
    
    if(enemyMesh.userData.target) enemyMesh.position.lerp(enemyMesh.userData.target, 8*dt);
    state.items.forEach(i => { 
        i.position.y=i.userData.floatY+Math.sin(time*2)*0.1; 
        i.rotation.y+=dt; 
    });
    LightingManager.animate(time);
    if(state.enemyStats.hp>0) {
        const vec=enemyMesh.position.clone(); 
        vec.y+=1.2; 
        vec.project(camera);
        const x=(vec.x*.5+.5)*window.innerWidth, 
              y=(-(vec.y*.5)+.5)*window.innerHeight;
        const hud=document.getElementById('enemy-hud'); 
        hud.style.transform=`translate(-50%, -50%)`; 
        hud.style.left=x+'px'; 
        hud.style.top=y+'px';
    }
    const floats=document.getElementById('floating-text-container').children;
    for(let div of floats) {
        if(div.userData && div.userData.pos) {
            const vec=div.userData.pos.clone(); 
            vec.y+=1.5; 
            vec.project(camera);
            div.style.left=((vec.x*.5+.5)*window.innerWidth)+'px'; 
            div.style.top=(-(vec.y*.5)+.5)*window.innerHeight+'px';
        }
    }
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    const aspect=window.innerWidth/window.innerHeight; 
    camera.left=-d*aspect; 
    camera.right=d*aspect;
    camera.updateProjectionMatrix(); 
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// 显示配色方案选择面板
function showColorSchemeSelection() {
    // 确保加载屏幕隐藏
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
        loadingScreen.style.opacity = '0';
    }
    
    const modal = document.getElementById('color-scheme-selection');
    const container = document.getElementById('modal-container');
    if (modal && container) {
        container.style.display = 'flex';
        modal.style.display = 'block';
        // 默认选择第一个方案
        const firstOption = document.querySelector('.scheme-option');
        if (firstOption) {
            document.querySelectorAll('.scheme-option').forEach(opt => opt.classList.remove('selected'));
            firstOption.classList.add('selected');
            state.settings.colorScheme = firstOption.dataset.scheme;
        }
        // 初始化初始时间选择器
        const initialTimeSelect = document.getElementById('initial-time-selection');
        if (initialTimeSelect) {
            initialTimeSelect.value = state.settings.initialTimePhase || 'night';
        }
        // 更新文本
        try {
            updateText();
        } catch (e) {
            console.warn('updateText failed:', e);
        }
    } else {
        console.error('Cannot find color-scheme-selection or modal-container');
    }
}

// 确认配色方案并开始游戏
window.confirmColorScheme = async () => {
    // 保存初始时间设置
    const initialTimeSelect = document.getElementById('initial-time-selection');
    if (initialTimeSelect) {
        state.settings.initialTimePhase = initialTimeSelect.value;
    }
    
    const container = document.getElementById('modal-container');
    const modal = document.getElementById('color-scheme-selection');
    if (container) container.style.display = 'none';
    if (modal) modal.style.display = 'none';
    // 显示加载屏幕
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'flex';
        loadingScreen.style.opacity = '1';
    }
    await init();
};

// 选择配色方案
window.selectColorScheme = (scheme) => {
    state.settings.colorScheme = scheme;
    document.querySelectorAll('.scheme-option').forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.scheme === scheme);
    });
};

// 初始化
async function init() {
    // 设置初始时间阶段（从用户选择中获取）
    state.timePhase = state.settings.initialTimePhase || 'night';
    updateText();
    await generateWorld();
    setTimeout(() => {
        selectionRing.visible = true; 
    }, 600);
    animate();
}

// 确保renderer已添加到DOM
function ensureRendererInDOM() {
    const container = document.getElementById('canvas-container');
    if (container && !container.contains(renderer.domElement)) {
        container.appendChild(renderer.domElement);
    }
}

// 页面加载完成后显示配色方案选择面板
function initializeGame() {
    ensureRendererInDOM();
    // 确保加载屏幕隐藏
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
        loadingScreen.style.opacity = '0';
    }
    // 延迟显示配色方案选择面板，确保所有DOM元素都已加载
    setTimeout(() => {
        showColorSchemeSelection();
    }, 100);
}

// 等待DOM完全加载
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGame);
} else {
    // DOM已加载，但可能脚本执行早于DOM，使用setTimeout确保DOM完全就绪
    setTimeout(initializeGame, 0);
}

