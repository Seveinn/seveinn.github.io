import { useEffect, useRef, useState, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { CONFIG } from './config';
import { createGameState, placeTile, getRecruitCost } from './gameState';
import { GameState, Hex } from './types';
import { Unit } from './Unit';
import { pixelToHex, hexToPixel, drawHex, hexToRgb, drawGrassBlades } from './utils';
import InventoryList from './InventoryList';
import ControlPanel from './ControlPanel';
import './styles.css';

export default function HexaLife() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState>(createGameState());
  const animationFrameRef = useRef<number>();
  const [gameState, setGameState] = useState<GameState>(gameStateRef.current);
  const [expandedResource, setExpandedResource] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ visible: boolean; x: number; y: number; content: string }>({
    visible: false,
    x: 0,
    y: 0,
    content: ''
  });
  const floatTextsRef = useRef<Array<{ id: number; text: string; x: number; y: number; color: string; startTime: number }>>([]);
  const floatTextIdCounter = useRef(0);
  const [fps, setFps] = useState(0);
  const fpsRef = useRef({ lastTime: Date.now(), frameCount: 0, fps: 0 });

  // 显示浮动文字
  const showFloatText = useCallback((text: string, x: number, y: number, color: string) => {
    floatTextsRef.current.push({
      id: floatTextIdCounter.current++,
      text,
      x,
      y,
      color,
      startTime: Date.now()
    });
  }, []);

  // 更新游戏状态的辅助函数
  const updateGameState = useCallback(() => {
    setGameState({ ...gameStateRef.current });
  }, []);

  // 初始化游戏
  useEffect(() => {
    const state = gameStateRef.current;
    
    // 设置回调函数
    state.onResourceAdded = (id: string, count: number) => {
      state.inventory[id] += count;
      updateGameState();
    };
    
    state.onXPAdded = (amount: number) => {
      state.xp += amount;
      if (state.xp >= state.xpToNext) {
        state.level++;
        state.xp -= state.xpToNext;
        state.xpToNext = Math.floor(state.xpToNext * 1.3);
        showFloatText("LEVEL UP!", window.innerWidth / 2, window.innerHeight / 2, '#9b59b6');
      }
      updateGameState();
    };
    
    state.onFloatText = (text: string, x: number, y: number, color: string) => {
      showFloatText(text, x, y, color);
    };

    // 初始化地块
    placeTile(state, 0, 0, 'grass');
    placeTile(state, 1, -1, 'grass');
    placeTile(state, 0, -1, 'grass');
    placeTile(state, -1, 0, 'forest');

    // 初始化摄像机 - 延迟执行以确保容器已渲染
    const initCanvas = () => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const container = canvas.parentElement;
        if (container) {
          const width = container.clientWidth || 800;
          const height = container.clientHeight || 600;
          canvas.width = width;
          canvas.height = height;
          state.camera.x = width / 2;
          state.camera.y = height / 2;
        } else {
          // 如果没有容器，使用默认值
          const width = window.innerWidth;
          const height = window.innerHeight;
          canvas.width = width;
          canvas.height = height;
          state.camera.x = width / 2;
          state.camera.y = height / 2;
        }
      }
    };

    // 使用 setTimeout 确保 DOM 已渲染
    const timer1 = setTimeout(initCanvas, 0);
    const timer2 = setTimeout(initCanvas, 100);
    // 也立即执行一次
    initCanvas();

    updateGameState();

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [updateGameState, showFloatText]);

  // 生成单位
  const spawnUnit = useCallback((): boolean => {
    const state = gameStateRef.current;
    let spawnTile: Hex | null = null;
    
    // 找一个空闲的地块（不占用，仅用于生成位置）
    for (let tile of state.tiles.values()) {
      if (!tile.isOccupied()) {
        spawnTile = tile;
        break;
      }
    }
    
    // 如果找不到空闲地块，返回false
    if (!spawnTile) {
      return false;
    }

    let q = spawnTile.q;
    let r = spawnTile.r;
    
    // 新招募的角色在空闲地块生成，初始状态为空闲
    // 立即占用地块，防止多个角色重叠在同一地块
    const unit = new Unit(q, r, state, null);
    spawnTile.occupiedBy = unit.id; // 立即占用地块
    state.units.push(unit);
    updateGameState();
    return true;
  }, [updateGameState]);

  // 游戏循环
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state = gameStateRef.current;

    let lastTileInfoUpdate = 0;
    let lastTileUpdate = 0;
    const TILE_UPDATE_INTERVAL = 100; // 地块更新间隔：100ms（降低更新频率）
    
    const gameLoop = () => {
      // 计算帧率
      const currentTime = Date.now();
      fpsRef.current.frameCount++;
      if (currentTime - fpsRef.current.lastTime >= 1000) {
        fpsRef.current.fps = fpsRef.current.frameCount;
        fpsRef.current.frameCount = 0;
        fpsRef.current.lastTime = currentTime;
        setFps(fpsRef.current.fps);
      }
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 应用缩放和平移
      ctx.save();
      ctx.translate(state.camera.x, state.camera.y);
      ctx.scale(state.zoom, state.zoom);
      
      // 优化：只更新枯竭的地块，并且降低更新频率
      if (currentTime - lastTileUpdate >= TILE_UPDATE_INTERVAL) {
        let needsStateUpdate = false;
        state.tiles.forEach(t => {
          // 只更新枯竭的地块
          if (t.isDepleted()) {
            const changed = t.update(currentTime);
            if (changed) {
              needsStateUpdate = true;
            }
          }
        });
        
        if (needsStateUpdate) {
          updateGameState();
        }
        lastTileUpdate = currentTime;
      }
      
      // 如果当前有悬浮的地块，定期更新状态以确保信息面板实时更新（每100ms更新一次）
      if (state.hoveredTile && currentTime - lastTileInfoUpdate >= 100) {
        updateGameState();
        lastTileInfoUpdate = currentTime;
      }
      
      // 渲染地块
      state.tiles.forEach(t => {
        const worldPos = t.getWorldPos();
        const screenX = worldPos.x;
        const screenY = worldPos.y;

        let color = CONFIG.tiles[t.type].color;
        if (t.isDepleted() && t.type !== 'river') {
          color = (t.type === 'grass') ? CONFIG.colors.grassDepleted : CONFIG.colors.forestDepleted;
        }
        
        // 高亮悬浮的地块
        const isHovered = state.hoveredTile && state.hoveredTile.q === t.q && state.hoveredTile.r === t.r;
        if (isHovered) {
          const rgb = hexToRgb(color);
          if (rgb) {
            const lightenAmount = 0.2;
            color = `rgb(${Math.min(255, rgb.r + (255 - rgb.r) * lightenAmount)}, 
                       ${Math.min(255, rgb.g + (255 - rgb.g) * lightenAmount)}, 
                       ${Math.min(255, rgb.b + (255 - rgb.b) * lightenAmount)})`;
          }
        }
        
        drawHex(ctx, screenX, screenY, color, t.type);
        
        // 在草地上绘制随机草
        if (t.type === 'grass') {
          drawGrassBlades(ctx, screenX, screenY, t.q, t.r);
        }
        
        if (t.isDepleted()) {
          const pct = t.curRes / t.maxRes;
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(46, 204, 113, 0.8)';
          ctx.lineWidth = 3;
          ctx.arc(screenX, screenY, 10, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * pct));
          ctx.stroke();
        }
      });

      // 渲染预览
      if (state.selectedCard) {
        const hex = pixelToHex(state.mouse.x, state.mouse.y, state.camera.x, state.camera.y, state.zoom);
        const key = `${hex.q},${hex.r}`;
        const worldPos = hexToPixel(hex.q, hex.r);
        
        if (!state.tiles.has(key)) {
          let hasNeighbor = false;
          const dirs = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
          for (let d of dirs) {
            if (state.tiles.has(`${hex.q + d[0]},${hex.r + d[1]}`)) {
              hasNeighbor = true;
              break;
            }
          }
          if (hasNeighbor) {
            ctx.globalAlpha = 0.6;
            drawHex(ctx, worldPos.x, worldPos.y, CONFIG.tiles[state.selectedCard].color, state.selectedCard);
            ctx.globalAlpha = 1;
          }
        }
      }

      // 渲染单位
      state.units.forEach(u => {
        u.update(1);
        u.draw(ctx);
      });
      
      // 恢复变换
      ctx.restore();

      // 渲染浮动文字
      const floatTextTime = Date.now();
      floatTextsRef.current = floatTextsRef.current.filter(ft => {
        const elapsed = (floatTextTime - ft.startTime) / 1000;
        if (elapsed > 1.2) return false;
        
        const progress = elapsed / 1.2;
        const y = ft.y - (progress * 40);
        const scale = progress < 0.2 ? 0.5 + (progress / 0.2) * 0.7 : 1.2 - ((progress - 0.2) / 0.8) * 0.2;
        const opacity = progress < 0.2 ? progress / 0.2 : 1 - ((progress - 0.2) / 0.8);
        
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.font = '800 14px Arial';
        ctx.fillStyle = ft.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.translate(ft.x, y);
        ctx.scale(scale, scale);
        ctx.fillText(ft.text, 0, 0);
        ctx.restore();
        
        return true;
      });

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [updateGameState]);

  // 窗口大小调整
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const state = gameStateRef.current;
      const container = canvas.parentElement;
      if (container) {
        const width = container.clientWidth || 800;
        const height = container.clientHeight || 600;
        canvas.width = width;
        canvas.height = height;
        state.camera.x = width / 2;
        state.camera.y = height / 2;
      } else {
        const width = window.innerWidth;
        const height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        state.camera.x = width / 2;
        state.camera.y = height / 2;
      }
    };

    // 使用 ResizeObserver 监听容器大小变化
    const canvas = canvasRef.current;
    if (canvas && canvas.parentElement) {
      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(canvas.parentElement);
      // 初始执行一次
      handleResize();
      return () => resizeObserver.disconnect();
    }

    window.addEventListener('resize', handleResize);
    // 初始执行一次
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 鼠标事件处理
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const state = gameStateRef.current;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const canvasX = e.clientX - rect.left;
      const canvasY = e.clientY - rect.top;
      
      state.mouse.x = canvasX;
      state.mouse.y = canvasY;
      
      if (state.isDragging || state.isMiddleDragging) {
        state.camera.x += e.clientX - state.lastMouse.x;
        state.camera.y += e.clientY - state.lastMouse.y;
        state.lastMouse.x = e.clientX;
        state.lastMouse.y = e.clientY;
      } else {
        const hex = pixelToHex(canvasX, canvasY, state.camera.x, state.camera.y, state.zoom);
        const key = `${hex.q},${hex.r}`;
        const tile = state.tiles.get(key);
        state.hoveredTile = tile || null;
        updateGameState();
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 1) {
        // 中键：拖拽场景
        state.isMiddleDragging = true;
        state.lastMouse = { x: e.clientX, y: e.clientY };
        e.preventDefault();
      } else if (e.button === 2 || !state.selectedCard) {
        // 右键或未选择卡片时：拖拽场景
        state.isDragging = true;
        state.lastMouse = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 1) {
        state.isMiddleDragging = false;
      } else {
        state.isDragging = false;
      }
    };

    const handleMouseLeave = () => {
      state.hoveredTile = null;
      updateGameState();
    };

    const handleClick = (e: MouseEvent) => {
      if (state.selectedCard && !state.isDragging) {
        const rect = canvas.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;
        const h = pixelToHex(canvasX, canvasY, state.camera.x, state.camera.y, state.zoom);
        const k = `${h.q},${h.r}`;
        if (state.tiles.has(k)) return;
        
        let valid = false;
        const dirs = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
        for (let d of dirs) {
          if (state.tiles.has(`${h.q + d[0]},${h.r + d[1]}`)) {
            valid = true;
            break;
          }
        }
        
        if (valid) {
          const cost = CONFIG.tiles[state.selectedCard].cost;
          if (state.gold >= cost) {
            state.gold -= cost;
            placeTile(state, h.q, h.r, state.selectedCard);
            if (state.onXPAdded) {
              state.onXPAdded(10);
            }
            if (state.onFloatText) {
              state.onFloatText("Build", canvasX, canvasY, '#2ecc71');
            }
            updateGameState();
          }
        }
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // 计算鼠标在世界坐标中的位置
      const worldX = (mouseX - state.camera.x) / state.zoom;
      const worldY = (mouseY - state.camera.y) / state.zoom;
      
      // 缩放因子
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.3, Math.min(3, state.zoom * zoomFactor));
      
      // 计算缩放后鼠标应该在世界坐标中的位置
      const newWorldX = (mouseX - state.camera.x) / newZoom;
      const newWorldY = (mouseY - state.camera.y) / newZoom;
      
      // 调整相机位置以保持鼠标下的点不变
      state.camera.x += (worldX - newWorldX) * newZoom;
      state.camera.y += (worldY - newWorldY) * newZoom;
      
      state.zoom = newZoom;
      updateGameState();
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('contextmenu', handleContextMenu);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('contextmenu', handleContextMenu);
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [updateGameState]);

  // UI 处理函数
  const handleRecruit = useCallback(() => {
    const state = gameStateRef.current;
    const cost = getRecruitCost(state);
    
    // 检查是否有空闲地块
    let hasFreeTile = false;
    for (let tile of state.tiles.values()) {
      if (!tile.isOccupied()) {
        hasFreeTile = true;
        break;
      }
    }
    
    if (!hasFreeTile) {
      // 所有地块都被占用，提示购买新地块
      if (state.onFloatText) {
        state.onFloatText("所有地块已被占用，请购买新地块!", window.innerWidth / 2, window.innerHeight / 2, '#e74c3c');
      }
      return;
    }
    
    if (state.gold >= cost) {
      state.gold -= cost;
      const success = spawnUnit();
      if (success) {
        if (state.onFloatText) {
          state.onFloatText("招募成功!", window.innerWidth / 2, window.innerHeight / 2, '#2980b9');
        }
      } else {
        // 如果生成失败（理论上不应该发生，因为已经检查了），退还金币
        state.gold += cost;
        if (state.onFloatText) {
          state.onFloatText("招募失败，所有地块已被占用!", window.innerWidth / 2, window.innerHeight / 2, '#e74c3c');
        }
      }
      updateGameState();
    }
  }, [spawnUnit, updateGameState]);

  const handleCardClick = useCallback((type: string) => {
    const state = gameStateRef.current;
    const tileConfig = CONFIG.tiles[type];
    if (state.gold >= tileConfig.cost) {
      if (state.selectedCard === type) {
        state.selectedCard = null;
      } else {
        state.selectedCard = type;
      }
      updateGameState();
    } else {
      if (state.onFloatText) {
        state.onFloatText("金币不足", window.innerWidth / 2, window.innerHeight - 100, '#e74c3c');
      }
    }
  }, [updateGameState]);

  const handleToggleResource = useCallback((key: string) => {
    const state = gameStateRef.current;
    if (state.inventory[key] <= 0) return;
    setExpandedResource(expandedResource === key ? null : key);
  }, [expandedResource]);

  const handleSellItem = useCallback((key: string, amount: number) => {
    const state = gameStateRef.current;
    if (amount > 0 && state.inventory[key] >= amount) {
      state.inventory[key] -= amount;
      state.gold += amount * CONFIG.resources[key].price;
      if (state.inventory[key] === 0) {
        setExpandedResource(null);
      }
      if (state.onFloatText) {
        state.onFloatText(`+${amount * CONFIG.resources[key].price} G`, window.innerWidth / 2, window.innerHeight / 2, '#f1c40f');
      }
      updateGameState();
    }
  }, [updateGameState]);

  const handleUpdateTileConfig = useCallback((type: string, property: 'cap' | 'cost', value: number) => {
    const state = gameStateRef.current;
    const numValue = parseInt(String(value));
    if (isNaN(numValue) || numValue < 1) {
      if (state.onFloatText) {
        state.onFloatText("数值无效", window.innerWidth / 2, window.innerHeight / 2, '#e74c3c');
      }
      return;
    }
    
    if (property === 'cap') {
      CONFIG.tiles[type].cap = numValue;
      state.tiles.forEach(tile => {
        if (tile.type === type) {
          const oldMax = tile.maxRes;
          tile.maxRes = numValue;
          if (tile.curRes > numValue) {
            tile.curRes = numValue;
          }
          if (tile.curRes <= 0 && numValue > oldMax) {
            tile.curRes = Math.min(numValue, oldMax);
          }
        }
      });
      if (state.onFloatText) {
        state.onFloatText(`${CONFIG.tiles[type].name} 上限已更新`, window.innerWidth / 2, window.innerHeight / 2, '#2ecc71');
      }
    } else if (property === 'cost') {
      CONFIG.tiles[type].cost = numValue;
      if (state.onFloatText) {
        state.onFloatText(`${CONFIG.tiles[type].name} 价格已更新`, window.innerWidth / 2, window.innerHeight / 2, '#2ecc71');
      }
    }
    updateGameState();
  }, [updateGameState]);

  // 计算招募成本
  const recruitCost = getRecruitCost(gameState);

  // 计算悬浮地块信息
  const hoveredTile = gameState.hoveredTile;
  const tileInfo = hoveredTile ? {
    worldPos: hoveredTile.getWorldPos(),
    screenX: hoveredTile.getWorldPos().x + gameState.camera.x,
    screenY: hoveredTile.getWorldPos().y + gameState.camera.y,
    tileConfig: CONFIG.tiles[hoveredTile.type],
    progress: Math.max(0, Math.min(1, hoveredTile.curRes / hoveredTile.maxRes)),
    isRegenerating: hoveredTile.isRegenerating ? hoveredTile.isRegenerating() : false,
    depletedTime: hoveredTile.depletedTime,
    regenDelay: hoveredTile.regenDelay,
    currentYield: hoveredTile.curRes,
    maxYield: hoveredTile.maxRes,
    gatherTime: CONFIG.tiles[hoveredTile.type].gatherTime
  } : null;

  return (
    <>
      <Helmet>
        <title>六边形田园 - 完美寻路修复版 | Seveinn</title>
        <meta name="description" content="一个基于六边形网格的资源管理游戏，体验策略与生存的挑战。" />
      </Helmet>
      
      <div className="hexalife-container">
        <div className="fps-display" style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 1000,
          background: 'rgba(0, 0, 0, 0.7)',
          color: '#fff',
          padding: '5px 10px',
          borderRadius: '4px',
          fontSize: '12px',
          fontFamily: 'monospace',
          pointerEvents: 'none'
        }}>
          FPS: {fps}
        </div>
        <canvas 
          ref={canvasRef} 
          id="gameCanvas" 
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%',
            display: 'block'
          }} 
        />
        
        <div className="ui-layer">
          <div className="header">
            <div className="stat-box">
              <span className="stat-label">金币</span>
              <span className="stat-value" style={{ color: '#e67e22' }}>
                💰 <span>{Math.floor(gameState.gold)}</span>
              </span>
            </div>
            <div className="stat-box">
              <span className="stat-label">人口</span>
              <span className="stat-value" style={{ color: '#3498db' }}>
                👥 <span>{gameState.units.length}</span>
              </span>
            </div>
            <button
              className="btn-recruit"
              onClick={handleRecruit}
              disabled={gameState.gold < recruitCost}
            >
              <span>+ 招募</span>
              <span style={{ fontSize: '10px', opacity: 0.8 }}>{recruitCost} G</span>
            </button>
            <div className="stat-box">
              <span className="stat-label">等级</span>
              <span className="stat-value" style={{ color: '#9b59b6' }}>
                ⭐ <span>{gameState.level}</span>
              </span>
            </div>
          </div>
          
          <div className="inventory-panel">
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#aaa', marginBottom: '10px', textTransform: 'uppercase' }}>
              📦 物资仓库
            </div>
            <InventoryList
              resources={CONFIG.resources}
              inventory={gameState.inventory}
              expandedResource={expandedResource}
              onToggleResource={handleToggleResource}
              onSellItem={handleSellItem}
            />
          </div>
          
          <div className="control-panel">
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#aaa', marginBottom: '10px', textTransform: 'uppercase' }}>
              ⚙️ 地块配置
            </div>
            <ControlPanel
              tiles={CONFIG.tiles}
              onUpdateTileConfig={handleUpdateTileConfig}
            />
          </div>
          
          <div className="shop-bar">
            {Object.keys(CONFIG.tiles).map(type => {
              const tile = CONFIG.tiles[type];
              const isActive = gameState.selectedCard === type;
              const canAfford = gameState.gold >= tile.cost;
              
              return (
                <div
                  key={type}
                  className={`card ${isActive ? 'active' : ''}`}
                  style={{ opacity: canAfford ? 1 : 0.5 }}
                  onClick={() => handleCardClick(type)}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTooltip({
                      visible: true,
                      x: rect.left + rect.width / 2, // 卡片中心X坐标
                      y: rect.top - 10, // 卡片上方10px
                      content: `
                        <div class="tt-title">${tile.name}</div>
                        <div class="tt-desc">${tile.desc}</div>
                        <div class="tt-stat">
                          <span>储量: ${tile.cap}</span>
                          <span>掉落: ${tile.drops.map(x => CONFIG.resources[x].icon).join('')}</span>
                        </div>
                      `
                    });
                  }}
                  onMouseLeave={() => {
                    setTooltip(prev => ({ ...prev, visible: false }));
                  }}
                >
                  <div className="card-icon" style={{ background: tile.color }}></div>
                  <div className="card-cost">{tile.cost}</div>
                </div>
              );
            })}
          </div>
        </div>
        
        {tooltip.visible && (
          <div
            className="tooltip"
            style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px`, display: 'block' }}
            dangerouslySetInnerHTML={{ __html: tooltip.content }}
          />
        )}
        
        {tileInfo && (
          <div
            className="tile-info-panel active"
            style={{
              left: `${tileInfo.screenX}px`,
              top: `${tileInfo.screenY - 100}px`
            }}
          >
            <div className="tile-info-header">
              <div className="tile-info-icon" style={{ background: tileInfo.tileConfig.color }}>
                {tileInfo.tileConfig.name.charAt(0)}
              </div>
              <div className="tile-info-title">
                <div className="tile-info-name">{tileInfo.tileConfig.name}</div>
                <div className="tile-info-coord">
                  坐标: ({hoveredTile!.q}, {hoveredTile!.r})
                </div>
              </div>
            </div>
            <div className="tile-info-content">
              <div className="tile-info-row">
                <span className="tile-info-label">产出类型</span>
                <div className="tile-info-drops">
                  {tileInfo.tileConfig.drops.map(dropKey => (
                    <span key={dropKey} className="tile-info-drop-item" title={CONFIG.resources[dropKey].name}>
                      {CONFIG.resources[dropKey].icon}
                    </span>
                  ))}
                </div>
              </div>
              <div className="tile-info-row">
                <span className="tile-info-label">资源储量</span>
                {tileInfo.isRegenerating ? (
                  <div style={{ flex: 1, fontSize: '12px', color: '#e67e22', fontWeight: 'bold' }}>
                    枯竭，恢复中... ({Math.ceil((tileInfo.regenDelay - (Date.now() - (tileInfo.depletedTime || 0))) / 1000)}秒)
                  </div>
                ) : (
                  <div className="tile-info-progress">
                    <div
                      className="tile-info-progress-bar"
                      style={{
                        width: `${tileInfo.progress * 100}%`,
                        background: tileInfo.progress > 0.5
                          ? 'linear-gradient(90deg, #2ecc71, #27ae60)'
                          : tileInfo.progress > 0.2
                          ? 'linear-gradient(90deg, #f39c12, #e67e22)'
                          : 'linear-gradient(90deg, #e74c3c, #c0392b)'
                      }}
                    ></div>
                    <div className="tile-info-progress-text">
                      {Math.floor(tileInfo.currentYield)} / {tileInfo.maxYield}
                    </div>
                  </div>
                )}
              </div>
              <div className="tile-info-row">
                <span className="tile-info-label">购买金额</span>
                <div style={{ flex: 1, fontSize: '13px', fontWeight: '800', color: '#e67e22' }}>
                  {tileInfo.tileConfig.cost} G
                </div>
              </div>
              <div className="tile-info-row">
                <span className="tile-info-label">采集时间</span>
                <div style={{ flex: 1, fontSize: '13px', fontWeight: '800', color: '#3498db' }}>
                  {(tileInfo.gatherTime / 1000).toFixed(1)} 秒
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

