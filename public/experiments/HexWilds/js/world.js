// 世界生成
import * as THREE from 'three';
import { CONFIG, COLOR_SCHEMES } from './config.js';
import { state } from './state.js';
import { scene, gridGroup, propGroup, glowGroup, grassGroup, materials, applyColorScheme } from './scene.js';
import { LightingManager } from './lighting.js';
import { hexToWorld, getDist } from './utils.js';
import { updateUI } from './ui.js';
import { pGroup, enemyMesh } from './scene.js';

export const tileMap = new Map();
const hexGeo = new THREE.CylinderGeometry(1, 1, 0.5, 6);

// 创建六边形平面几何体（用于水面）
// 使用 ShapeGeometry 创建与 CylinderGeometry 完全匹配的六边形
function createHexPlaneGeometry(radius = 1) {
    const shape = new THREE.Shape();
    // 创建六边形，顶点朝上（与 CylinderGeometry 匹配）
    // CylinderGeometry 的六边形顶点在顶部，所以从顶部开始
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 2; // 从顶部（-90度）开始
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        if (i === 0) {
            shape.moveTo(x, y);
        } else {
            shape.lineTo(x, y);
        }
    }
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
}
const hexPlaneGeo = createHexPlaneGeometry(1);

function createTile(q, r) {
    const noise = Math.sin(q * 0.5) + Math.cos(r * 0.5) * Math.sin(r*0.3);
    let type = 'plain', height = 0, isObstacle = false;
    if (noise < -0.7) { type = 'water'; height = -0.2; isObstacle = true; }
    else if (noise < -0.2) { type = 'grassland'; height = 0; }
    else if (noise < 0.4) { type = 'plain'; height = 0; }
    else if (noise < 1.1) { type = 'forest'; height = 0.1; }
    else { type = 'mountain'; height = 0.6; isObstacle = true; } 

    const pos = hexToWorld(q, r);
    let mesh;
    
    if(type === 'water') {
        // 分层渲染：河床层 + 水面层
        const waterGroup = new THREE.Group();
        waterGroup.position.set(pos.x, 0, pos.z);
        
        // 河床层：在低于地面位置的下方渲染
        const seabedHeight = -0.35;
        const seabedMesh = new THREE.Mesh(hexGeo, materials.seabed);
        seabedMesh.position.y = seabedHeight;
        seabedMesh.receiveShadow = true;
        // 添加轮廓线
        seabedMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(hexGeo), materials.line));
        
        // 水面层：与地面plain齐平（使用平面面片）
        const waterSurfaceHeight = 0;
        // 创建透明蓝色材质（参考 Water.html 的效果）
        const scheme = COLOR_SCHEMES[state.settings.colorScheme] || COLOR_SCHEMES.classic;
        // 将水的颜色稍微调亮，使其更清澈
        const waterColor = new THREE.Color(scheme.materials.water);
        waterColor.lerp(new THREE.Color(0xffffff), 0.15); // 混合15%的白色，使颜色更亮更清澈
        const waterSurfaceMaterial = new THREE.MeshStandardMaterial({
            color: waterColor,
            transparent: true,
            opacity: 0.35, // 更清透的透明度
            depthWrite: false,
            depthTest: true,
            side: THREE.DoubleSide,
            roughness: 0.0, // 完全光滑，模拟清澈的水面（接近镜面反射）
            metalness: 0.0, // 水不是金属材质
            envMapIntensity: 1.0 // 环境反射强度（如果有环境贴图会增强反射效果）
        });
        const waterSurfaceMesh = new THREE.Mesh(hexPlaneGeo, waterSurfaceMaterial);
        waterSurfaceMesh.position.y = waterSurfaceHeight;
        waterSurfaceMesh.rotation.x = -Math.PI / 2; // 旋转90度使平面水平
        waterSurfaceMesh.receiveShadow = true;
        waterSurfaceMesh.renderOrder = 1; // 确保透明物体正确渲染
        
        // 添加白色边框高光效果（参考 Water.html 的白色描边）
        // 边框需要和水面使用相同的坐标系（XY平面，然后旋转到水平面）
        const waterEdgeMaterial = new THREE.LineBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.4, // 参考 Water.html 的边框透明度
            linewidth: 2
        });
        // 创建六边形顶点（使用与hexPlaneGeo相同的XY平面坐标）
        // 这样添加到waterSurfaceMesh后会自动继承旋转
        const hexVertices = [];
        const radius = 1;
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 2; // 从顶部（-90度）开始
            hexVertices.push(
                new THREE.Vector3(
                    radius * Math.cos(angle), // x (XY平面)
                    radius * Math.sin(angle), // y (XY平面)
                    0  // z (XY平面，z=0)
                )
            );
        }
        const hexGeometry = new THREE.BufferGeometry().setFromPoints(hexVertices);
        const waterEdges = new THREE.LineLoop(hexGeometry, waterEdgeMaterial);
        // 添加到waterSurfaceMesh，会自动继承rotation.x = -Math.PI / 2的旋转
        waterSurfaceMesh.add(waterEdges);
        
        waterGroup.add(seabedMesh, waterSurfaceMesh);
        mesh = waterGroup;
    } else {
        mesh = new THREE.Mesh(hexGeo, materials[type]);
        mesh.position.set(pos.x, height, pos.z); 
        mesh.receiveShadow = true;
        if(type === 'mountain') {
            mesh.scale.set(1, 1.5, 1);
            const rock = new THREE.Mesh(
                new THREE.DodecahedronGeometry(0.4), 
                new THREE.MeshToonMaterial({color:0x263238})
            );
            rock.position.set(0, 0.8, 0); 
            rock.castShadow = true; 
            mesh.add(rock);
        }
        mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(hexGeo), materials.line));
    }
    
    const tileData = { 
        mesh, q, r, type, isObstacle, occupied: false, 
        hasGrass: false, hasLight: false, 
        worldPos: new THREE.Vector3(pos.x, height + 0.25, pos.z) 
    };
    mesh.userData = tileData; 
    tileMap.set(`${q},${r}`, tileData); 
    gridGroup.add(mesh);
}

function createProp(tile, type) {
    const g = new THREE.Group(); 
    g.position.copy(tile.worldPos);
    if(type === 'tree') {
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05,0.1,0.3), 
            new THREE.MeshToonMaterial({color:0x4e342e})
        );
        trunk.position.y = 0.15;
        const leaves = new THREE.Mesh(
            new THREE.ConeGeometry(0.3,0.8,5), 
            new THREE.MeshToonMaterial({color:0x2e7d32})
        );
        leaves.position.y = 0.6; 
        leaves.castShadow = true; 
        g.add(trunk, leaves);
        propGroup.add(g);
    } else if (type === 'grass') {
        const scheme = COLOR_SCHEMES[state.settings.colorScheme] || COLOR_SCHEMES.classic;
        for(let i=0; i<5; i++) {
            const blade = new THREE.Mesh(
                new THREE.ConeGeometry(0.05, 0.5, 3), 
                new THREE.MeshToonMaterial({color: scheme.colors.grass})
            );
            blade.position.set((Math.random()-0.5)*0.6, 0.25, (Math.random()-0.5)*0.6); 
            blade.rotation.y = Math.random() * Math.PI; 
            g.add(blade);
        }
        tile.hasGrass = true; 
        grassGroup.add(g);
    } else if (type === 'light_plant') {
        const scheme = COLOR_SCHEMES[state.settings.colorScheme] || COLOR_SCHEMES.classic;
        const stem = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.02, 0.4), 
            new THREE.MeshToonMaterial({color:0xffffff})
        );
        stem.position.y = 0.2;
        const bulb = new THREE.Mesh(
            new THREE.SphereGeometry(0.15), 
            new THREE.MeshStandardMaterial({
                color: scheme.colors.lightPlant, 
                emissive: scheme.colors.lightPlant, 
                emissiveIntensity: 1
            })
        );
        bulb.position.y = 0.45;
        const light = new THREE.PointLight(
            scheme.colors.lightPlant, 
            0, 
            CONFIG.light.night.plantDist
        );
        light.position.y = 0.5; 
        light.userData.mesh = bulb; 
        LightingManager.registerPointLight(light);
        g.add(stem, bulb, light); 
        tile.hasLight = true; 
        tile.isObstacle = true; 
        glowGroup.add(g);
    }
    tile.occupied = true;
}

function spawnItem(tile) {
    const geo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
    const item = new THREE.Mesh(geo, new THREE.MeshToonMaterial({color: 0xffb300}));
    item.position.copy(tile.worldPos); 
    item.position.y += 0.3;
    item.userData = { q: tile.q, r: tile.r, floatY: item.position.y };
    scene.add(item); 
    state.items.push(item); 
    tile.occupied = true; 
    tile.hasItem = true;
}

export async function generateWorld() {
    document.getElementById('loading-screen').style.display = 'flex';
    document.getElementById('loading-screen').style.opacity = 1;
    await new Promise(r => setTimeout(r, 50));

    // 应用配色方案
    applyColorScheme();
    const scheme = COLOR_SCHEMES[state.settings.colorScheme] || COLOR_SCHEMES.classic;
    // 设置初始背景色（根据当前时间阶段）
    const bgColor = new THREE.Color(state.timePhase === 'day' ? scheme.colors.bg_day : scheme.colors.bg_night);
    scene.background = bgColor;

    for (let q = -CONFIG.mapRadius; q <= CONFIG.mapRadius; q++) {
        let r1 = Math.max(-CONFIG.mapRadius, -q - CONFIG.mapRadius);
        let r2 = Math.min(CONFIG.mapRadius, -q + CONFIG.mapRadius);
        for (let r = r1; r <= r2; r++) { 
            createTile(q, r); 
        }
    }

    let validTiles = Array.from(tileMap.values()).filter(t => !t.isObstacle);
    let foodCount = state.settings.difficulty === 'hardcore' ? 5 : 10;
    for(let i=0; i<foodCount; i++) {
        const t = validTiles[Math.floor(Math.random() * validTiles.length)];
        if(!t.occupied) spawnItem(t);
    }

    tileMap.forEach(t => {
        if(t.occupied) return;
        const rand = Math.random();
        if(t.type === 'forest' && rand > 0.3) createProp(t, 'tree');
        else if (t.type === 'grassland' && rand > 0.2) createProp(t, 'grass');
        else if ((t.type === 'plain' || t.type === 'forest') && rand > 0.85) createProp(t, 'light_plant');
    });

    validTiles = Array.from(tileMap.values()).filter(t => !t.isObstacle && !t.occupied);
    const startTile = validTiles[Math.floor(Math.random() * validTiles.length)];
    state.playerPos = { q: startTile.q, r: startTile.r };
    pGroup.userData.target = startTile.worldPos.clone();
    pGroup.position.copy(startTile.worldPos);

    let bestDist = 0, enemyTile = startTile;
    validTiles.forEach(t => {
        const d = getDist(startTile, t);
        if(d > bestDist && d < 9) { bestDist = d; enemyTile = t; }
    });
    state.enemyPos = { q: enemyTile.q, r: enemyTile.r };
    enemyMesh.userData.target = enemyTile.worldPos.clone();
    enemyMesh.position.copy(enemyTile.worldPos);
    scene.add(enemyMesh);
    document.getElementById('enemy-hud').style.display = 'block';

    LightingManager.update(state.timePhase === 'day');
    // 更新时间显示
    const icon = state.timePhase === 'night' ? '🌙' : '☀️';
    const lang = state.settings.lang || 'zh';
    const text = state.timePhase === 'night' ? 
        (lang === 'zh' ? '黑夜' : 'Night') : 
        (lang === 'zh' ? '白昼' : 'Day');
    document.getElementById('time-display').innerHTML = `<span class="time-icon">${icon}</span> ${text}`;
    updateUI();
    state.isWorldReady = true; 
    state.isPlayerTurn = true;
    document.getElementById('loading-screen').style.opacity = 0;
    setTimeout(() => document.getElementById('loading-screen').style.display = 'none', 500);
}

