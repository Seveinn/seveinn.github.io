// 场景设置
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CONFIG, COLOR_SCHEMES } from './config.js';
import { state } from './state.js';
import { LightingManager } from './lighting.js';

export const scene = new THREE.Scene();
const aspect = window.innerWidth / window.innerHeight;
export const d = 10;
export const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
camera.position.set(20, 20, 20); 
camera.lookAt(scene.position);

export const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// renderer.domElement将在main.js中添加到DOM

export const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; 
controls.minZoom = 0.5; 
controls.maxZoom = 2.0;
controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.ROTATE, RIGHT: THREE.MOUSE.PAN };

export const gridGroup = new THREE.Group();
export const propGroup = new THREE.Group();
export const glowGroup = new THREE.Group();
export const grassGroup = new THREE.Group();
export const highlightGroup = new THREE.Group();
export const pGroup = new THREE.Group();
scene.add(gridGroup, propGroup, glowGroup, grassGroup, highlightGroup, pGroup);

LightingManager.init(scene);

// 创建材质
function createMaterials() {
    const scheme = COLOR_SCHEMES[state.settings.colorScheme] || COLOR_SCHEMES.classic;
    return {
        plain: new THREE.MeshToonMaterial({ color: scheme.materials.plain }),
        water: new THREE.MeshToonMaterial({ color: scheme.materials.water, transparent: true, opacity: 0.8, depthWrite: false }),
        seabed: new THREE.MeshToonMaterial({ color: scheme.materials.seabed }),
        forest: new THREE.MeshToonMaterial({ color: scheme.materials.forest }),
        grassland: new THREE.MeshToonMaterial({ color: scheme.materials.grassland }),
        mountain: new THREE.MeshToonMaterial({ color: scheme.materials.mountain }),
        enemy: new THREE.MeshToonMaterial({ color: scheme.colors.enemy }),
        highlight: new THREE.MeshBasicMaterial({ color: scheme.colors.pathValid, transparent: true, opacity: 0.4, depthTest: false }),
        line: new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 })
    };
}

export let materials = createMaterials();

// 应用配色方案
export function applyColorScheme() {
    const scheme = COLOR_SCHEMES[state.settings.colorScheme] || COLOR_SCHEMES.classic;
    // 更新CONFIG中的颜色
    CONFIG.colors = { ...scheme.colors };
    // 重新创建材质
    materials = createMaterials();
    // 更新高亮材质颜色（如果highlightPool已创建）
    if (highlightPool && highlightPool.length > 0) {
        highlightPool.forEach(h => {
            h.material.color.setHex(scheme.colors.pathValid);
        });
    }
}

export const pBody = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.2, 0.4, 4, 8), 
    new THREE.MeshToonMaterial({color: state.settings.playerColor})
);
pBody.position.y = 0.4; 
pBody.castShadow = true;

export const pHead = new THREE.Mesh(
    new THREE.SphereGeometry(0.15), 
    new THREE.MeshToonMaterial({color: state.settings.playerColor})
);
pHead.position.y = 0.7;
pGroup.add(pBody, pHead);

export const selectionRing = new THREE.Mesh(
    new THREE.RingGeometry(0.4, 0.45, 32), 
    new THREE.MeshBasicMaterial({ color: 0xffca28, side: THREE.DoubleSide })
);
selectionRing.rotation.x = -Math.PI/2; 
selectionRing.position.y = 0.05;
pGroup.add(selectionRing);

export const enemyMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.7, 0.6), 
    materials.enemy
);
enemyMesh.castShadow = true; 
scene.add(enemyMesh);

export const highlightPool = [];
for(let i=0; i<20; i++) {
    const m = new THREE.Mesh(
        new THREE.CylinderGeometry(0.9, 0.9, 0.1, 6), 
        materials.highlight.clone()
    );
    m.visible = false; 
    highlightGroup.add(m); 
    highlightPool.push(m);
}

// 初始化时应用配色方案（在highlightPool创建后）
applyColorScheme();

