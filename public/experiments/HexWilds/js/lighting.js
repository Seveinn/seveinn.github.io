// 光照管理器
import * as THREE from 'three';
import { CONFIG, COLOR_SCHEMES } from './config.js';
import { state } from './state.js';

let scene = null;

export const LightingManager = {
    ambient: null, 
    directional: null, 
    pointLights: [],
    
    init(sceneInstance) {
        scene = sceneInstance;
        this.ambient = new THREE.AmbientLight(0x404040, CONFIG.light.night.ambient);
        scene.add(this.ambient);
        this.directional = new THREE.DirectionalLight(0xffffff, CONFIG.light.night.dir);
        this.directional.position.set(10, 20, 10);
        this.directional.castShadow = true;
        this.directional.shadow.mapSize.width = 2048;
        scene.add(this.directional);
    },
    
    registerPointLight(light) { 
        this.pointLights.push(light); 
    },
    
    clear() { 
        this.pointLights = []; 
    },
    
    updateParams(key, value) {
        if(key === 'nightAmbient') {
            CONFIG.light.night.ambient = parseFloat(value);
            document.getElementById('val-nightAmbient').innerText = value;
            if (state.timePhase === 'night') this.ambient.intensity = CONFIG.light.night.ambient;
        } else if (key === 'dayAmbient') {
            CONFIG.light.day.ambient = parseFloat(value);
            document.getElementById('val-dayAmbient').innerText = value;
            if (state.timePhase === 'day') this.ambient.intensity = CONFIG.light.day.ambient;
        } else if (key === 'dayDir') {
            CONFIG.light.day.dir = parseFloat(value);
            document.getElementById('val-dayDir').innerText = value;
            if (state.timePhase === 'day') this.directional.intensity = CONFIG.light.day.dir;
        } else if (key === 'radius') {
            CONFIG.light.night.plantDist = parseFloat(value);
            document.getElementById('val-radius').innerText = value;
            if (state.timePhase === 'night') this.pointLights.forEach(l => l.distance = parseFloat(value));
        } else if (key === 'color') {
            CONFIG.light.night.plantColor = value;
            const scheme = COLOR_SCHEMES[state.settings.colorScheme] || COLOR_SCHEMES.classic;
            scheme.colors.lightPlant = value;
            if (state.timePhase === 'night') {
                 const col = new THREE.Color(value);
                 this.pointLights.forEach(l => {
                     l.color.set(col);
                     if(l.userData.mesh) { 
                         l.userData.mesh.material.emissive.set(col); 
                         l.userData.mesh.material.color.set(col); 
                     }
                 });
            }
        }
    },

    update(isDay) {
        const cfg = isDay ? CONFIG.light.day : CONFIG.light.night;
        const scheme = COLOR_SCHEMES[state.settings.colorScheme] || COLOR_SCHEMES.classic;
        const bgColor = new THREE.Color(isDay ? scheme.colors.bg_day : scheme.colors.bg_night);
        scene.background = bgColor;
        this.ambient.intensity = cfg.ambient;
        this.directional.intensity = cfg.dir;
        
        this.pointLights.forEach(light => {
            light.intensity = isDay ? 0 : cfg.plantInt;
            if(!isDay) {
                light.distance = CONFIG.light.night.plantDist;
                light.color.set(scheme.colors.lightPlant);
            }
            if(light.userData.mesh) {
                const mat = light.userData.mesh.material;
                if(isDay) { 
                    mat.emissive.setHex(0x000000); 
                    mat.color.setHex(0x607d8b); 
                } else { 
                    mat.emissive.set(scheme.colors.lightPlant);
                    mat.color.set(scheme.colors.lightPlant);
                }
            }
        });
    },

    animate(time) {
        if(state.timePhase === 'night') {
            const pulse = Math.sin(time * 2) * 0.3 + 1.0;
            this.pointLights.forEach(light => {
                light.intensity = CONFIG.light.night.plantInt * pulse;
            });
        }
    }
};

window.updateLightParam = (k, v) => LightingManager.updateParams(k, v);

