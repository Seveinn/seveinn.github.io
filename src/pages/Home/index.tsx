import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import './styles.css';
import type { SkillNode, SkillTreeConfig } from './types';
import { showToast } from '@/components/Toast';

// 尝试导入配置文件（如果存在）
import configDataRaw from './skillTreeConfig.json';
const configData: SkillTreeConfig | null = (configDataRaw as SkillTreeConfig) || null;

// 默认配置
const defaultConfig: SkillTreeConfig = {
  version: '1.0.0',
  nodes: [
    { id: 'core', icon: '👾', title: 'Me', type: 'root', x: 0, y: 0, level: 100, progress: 100, color: '#BF616A' },
    { id: 'web', icon: '🕸️', title: 'Web', type: 'branch', x: -150, y: -100, level: 85, progress: 85, color: '#88C0D0' },
    { id: 'game', icon: '🎮', title: 'Game', type: 'branch', x: 150, y: -100, level: 75, progress: 75, color: '#BF616A' },
    { id: 'react', icon: '⚛️', title: 'React / Vue', type: 'skill', x: -250, y: 0, level: 85, progress: 85, color: '#88C0D0' },
    { id: 'godot', icon: '🤖', title: 'Godot Engine', type: 'skill', x: 250, y: 0, level: 75, progress: 75, color: '#BF616A' },
  ],
  connections: [
    ['core', 'web'],
    ['core', 'game'],
    ['web', 'react'],
    ['game', 'godot'],
  ],
};

// 环境判断
const isDev = import.meta.env.DEV;
const STORAGE_KEY = 'skillTreeConfig';

// 从 localStorage 加载配置
const loadConfigFromStorage = (): SkillTreeConfig | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('加载 localStorage 配置失败:', error);
  }
  return null;
};

// 保存配置到 localStorage
const saveConfigToStorage = (config: SkillTreeConfig) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    console.log('✅ 配置已保存到 localStorage');
  } catch (error) {
    console.error('❌ 保存配置失败:', error);
  }
};

// 导出配置为 JSON 文件
const exportConfig = (config: SkillTreeConfig) => {
  try {
    const dataStr = JSON.stringify(config, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'skillTreeConfig.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    console.log('✅ 配置已导出');
  } catch (error) {
    console.error('❌ 导出配置失败:', error);
  }
};

// 从文件导入配置
const importConfigFromFile = (file: File): Promise<SkillTreeConfig> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const config = JSON.parse(content) as SkillTreeConfig;
        // 验证配置格式
        if (config.nodes && Array.isArray(config.nodes) && config.connections && Array.isArray(config.connections)) {
          resolve(config);
        } else {
          reject(new Error('配置文件格式不正确'));
        }
      } catch (error) {
        reject(new Error('解析配置文件失败'));
      }
    };
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsText(file);
  });
};

export default function Home() {
  // 初始化配置：优先使用 localStorage，其次使用配置文件，最后使用默认配置
  const getInitialConfig = (): SkillTreeConfig => {
    const storedConfig = loadConfigFromStorage();
    if (storedConfig) {
      return storedConfig;
    }
    if (configData) {
      return configData;
    }
    return defaultConfig;
  };

  const [skillData, setSkillData] = useState<SkillNode[]>(getInitialConfig().nodes);
  const [connections, setConnections] = useState<[string, string][]>(getInitialConfig().connections);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeIcon, setNewNodeIcon] = useState('');
  const [tooltip, setTooltip] = useState<{ visible: boolean; node: SkillNode | null; x: number; y: number }>({ 
    visible: false, 
    node: null, 
    x: 0, 
    y: 0 
  });
  const [activeLines, setActiveLines] = useState<Set<string>>(new Set());
  const [displayMode, setDisplayMode] = useState<'icon' | 'text'>('icon');
  const [textSizeScale, setTextSizeScale] = useState(1.5); // 文字尺寸缩放比例
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null); // 选中的节点ID

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [isDragging, setIsDragging] = useState(false);
  const [dragNode, setDragNode] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 }); // 节点树整体偏移
  const [center, setCenter] = useState({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 保存配置到 localStorage（仅开发环境，使用防抖）
  useEffect(() => {
    if (isDev) {
      const timer = setTimeout(() => {
        saveConfigToStorage({
          version: '1.0.0',
          nodes: skillData,
          connections,
        });
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [skillData, connections]);

  // 使用 useLayoutEffect 确保在 DOM 更新后立即计算中心点
  useLayoutEffect(() => {
    const updateCenter = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCenter({
          x: rect.width / 2,
          y: rect.height / 2,
        });
      }
    };
    
    // 立即执行一次
    updateCenter();
    
    // 使用 ResizeObserver 监听容器尺寸变化
    const resizeObserver = containerRef.current 
      ? new ResizeObserver(updateCenter)
      : null;
    
    if (resizeObserver && containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    window.addEventListener('resize', updateCenter);
    
    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      window.removeEventListener('resize', updateCenter);
    };
  }, []);

  // 更新连线位置
  useEffect(() => {
    const updateLines = () => {
      if (!svgRef.current || !containerRef.current) return;
      
      const svg = svgRef.current;
      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      svg.innerHTML = '';

      connections.forEach(([startId, endId]) => {
        const startEl = nodeRefs.current.get(startId);
        const endEl = nodeRefs.current.get(endId);

        if (startEl && endEl) {
          const startRect = startEl.getBoundingClientRect();
          const endRect = endEl.getBoundingClientRect();

          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          const lineId = `${startId}-${endId}`;
          const isActive = activeLines.has(lineId);

          line.setAttribute('class', `connector-line ${isActive ? 'active' : ''}`);
          // 将视口坐标转换为相对于容器的坐标
          line.setAttribute('x1', String(startRect.left - containerRect.left + startRect.width / 2));
          line.setAttribute('y1', String(startRect.top - containerRect.top + startRect.height / 2));
          line.setAttribute('x2', String(endRect.left - containerRect.left + endRect.width / 2));
          line.setAttribute('y2', String(endRect.top - containerRect.top + endRect.height / 2));
          line.setAttribute('data-start', startId);
          line.setAttribute('data-end', endId);

          svg.appendChild(line);
        }
      });
    };

    // 延迟执行，确保节点已经渲染完成
    const timer = setTimeout(updateLines, 0);
    window.addEventListener('resize', updateLines);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateLines);
    };
  }, [skillData, connections, activeLines, center, displayMode, panOffset]);

  // 拖拽处理
  useEffect(() => {
    if (!isDragging || !dragNode || !containerRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      const containerRect = containerRef.current!.getBoundingClientRect();
      // 将鼠标视口坐标转换为容器相对坐标
      const mouseX = e.clientX - containerRect.left;
      const mouseY = e.clientY - containerRect.top;
      
      setSkillData((prev) =>
        prev.map((node) => {
          if (node.id === dragNode.id) {
            const newX = mouseX - dragNode.offsetX - center.x;
            const newY = mouseY - dragNode.offsetY - center.y;
            return { ...node, x: newX, y: newY };
          }
          return node;
        })
      );
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDragNode(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragNode, center, displayMode]);

  // 鼠标中键拖拽移动节点树
  useEffect(() => {
    if (!isPanning || !containerRef.current) return;

    let currentOffset = { x: 0, y: 0 };
    let animationFrameId: number | null = null;

    const updateLinesDuringPan = () => {
      if (!svgRef.current || !containerRef.current) return;
      
      const svg = svgRef.current;
      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      svg.innerHTML = '';

      connections.forEach(([startId, endId]) => {
        const startEl = nodeRefs.current.get(startId);
        const endEl = nodeRefs.current.get(endId);

        if (startEl && endEl) {
          const startRect = startEl.getBoundingClientRect();
          const endRect = endEl.getBoundingClientRect();

          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          const lineId = `${startId}-${endId}`;
          const isActive = activeLines.has(lineId);

          line.setAttribute('class', `connector-line ${isActive ? 'active' : ''}`);
          line.setAttribute('x1', String(startRect.left - containerRect.left + startRect.width / 2));
          line.setAttribute('y1', String(startRect.top - containerRect.top + startRect.height / 2));
          line.setAttribute('x2', String(endRect.left - containerRect.left + endRect.width / 2));
          line.setAttribute('y2', String(endRect.top - containerRect.top + endRect.height / 2));
          line.setAttribute('data-start', startId);
          line.setAttribute('data-end', endId);

          svg.appendChild(line);
        }
      });
    };

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      const deltaX = e.clientX - panStart.x;
      const deltaY = e.clientY - panStart.y;
      currentOffset = { x: deltaX, y: deltaY };
      setPanOffset(currentOffset);
      
      // 在拖拽过程中实时更新连线
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      animationFrameId = requestAnimationFrame(updateLinesDuringPan);
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 1 && containerRef.current) {
        // 将偏移应用到所有节点
        setSkillData((prev) =>
          prev.map((node) => ({
            ...node,
            x: node.x + currentOffset.x,
            y: node.y + currentOffset.y,
          }))
        );
        // 更新中心点
        setCenter((prev) => ({
          x: prev.x + currentOffset.x,
          y: prev.y + currentOffset.y,
        }));
      }
      setIsPanning(false);
      setPanOffset({ x: 0, y: 0 });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanning, panStart]);

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (e.button !== 0) return; // 只允许左键拖拽
    const node = skillData.find(n => n.id === nodeId);
    if (!node || !containerRef.current) return;
    
    // 选中节点
    setSelectedNodeId(nodeId);
    
    const containerRect = containerRef.current.getBoundingClientRect();
    // 将鼠标视口坐标转换为容器相对坐标
    const mouseX = e.clientX - containerRect.left;
    const mouseY = e.clientY - containerRect.top;
    
    // 使用节点的逻辑位置计算偏移
    const nodeCenterX = center.x + node.x;
    const nodeCenterY = center.y + node.y;
    
    setIsDragging(true);
    setDragNode({
      id: nodeId,
      offsetX: mouseX - nodeCenterX, // 鼠标相对于节点中心的偏移（容器相对坐标）
      offsetY: mouseY - nodeCenterY,
    });
    setTooltip({ ...tooltip, visible: false });
  };

  const handleNodeContextMenu = (e: React.MouseEvent, nodeId: string) => {
    if (!isDev) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    setCurrentParentId(nodeId);
    setNewNodeName('');
    setNewNodeIcon('');
    setIsModalOpen(true);
  };

  const handleNodeMouseEnter = (e: React.MouseEvent, node: SkillNode) => {
    if (isDragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      visible: true,
      node: node,
      x: rect.left + rect.width / 2 - 160,
      y: rect.top - 120,
    });

    // 高亮相关连线
    const relatedLines = new Set<string>();
    connections.forEach(([start, end]) => {
      if (start === node.id || end === node.id) {
        relatedLines.add(`${start}-${end}`);
      }
    });
    setActiveLines(relatedLines);

    // 触发进度条动画
    setTimeout(() => {
      const progressFill = document.querySelector(`.skill-tooltip.visible .progress-fill`);
      if (progressFill && node.progress !== undefined) {
        (progressFill as HTMLElement).style.width = `${node.progress}%`;
      }
    }, 10);
  };

  const handleNodeMouseLeave = () => {
    setTooltip({ ...tooltip, visible: false });
    setActiveLines(new Set());
  };

  const handleAddNode = () => {
    if (!currentParentId || !newNodeName.trim()) return;

    const newId = `node_${Date.now()}`;
    const parentNode = skillData.find((n) => n.id === currentParentId);
    if (!parentNode) return;

    const newNode: SkillNode = {
      id: newId,
      icon: newNodeIcon.trim() || '🔹',
      title: newNodeName.trim(),
      type: 'skill',
      x: parentNode.x + (Math.random() * 100 - 50),
      y: parentNode.y + 100,
    };

    setSkillData((prev) => [...prev, newNode]);
    setConnections((prev) => [...prev, [currentParentId, newId]]);
    setIsModalOpen(false);
    setCurrentParentId(null);
    setNewNodeName('');
    setNewNodeIcon('');
  };

  const handleModalKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddNode();
    }
  };

  // 导出配置
  const handleExportConfig = () => {
    exportConfig({
      version: '1.0.0',
      nodes: skillData,
      connections,
    });
  };

  // 导入配置
  const handleImportConfig = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const config = await importConfigFromFile(file);
      setSkillData(config.nodes);
      setConnections(config.connections);
      if (isDev) {
        saveConfigToStorage(config);
      }
      showToast('配置导入成功！', 'success');
    } catch (error) {
      showToast('导入配置失败: ' + (error instanceof Error ? error.message : String(error)), 'error');
    }

    // 清空文件输入，以便可以重复选择同一文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 处理鼠标中键按下
  const handleContainerMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1) { // 中键
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      setPanOffset({ x: 0, y: 0 });
    }
  };

  // 阻止中键默认行为（防止页面滚动）
  const handleContainerMouseUp = (e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault();
    }
  };

  // 阻止中键默认行为
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // 如果按住中键，阻止默认滚动
      if (isPanning) {
        e.preventDefault();
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      // 如果按住中键，阻止右键菜单
      if (isPanning) {
        e.preventDefault();
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [isPanning]);

  // 键盘Delete键删除选中节点
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 如果按的是Delete或Backspace键，且有选中的节点
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
        e.preventDefault();
        
        // 不允许删除根节点
        const nodeToDelete = skillData.find(n => n.id === selectedNodeId);
        if (nodeToDelete?.type === 'root') {
          return;
        }

        // 删除节点
        setSkillData((prev) => prev.filter((node) => node.id !== selectedNodeId));
        
        // 删除与该节点相关的所有连线
        setConnections((prev) =>
          prev.filter(([startId, endId]) => startId !== selectedNodeId && endId !== selectedNodeId)
        );
        
        // 清除选中状态
        setSelectedNodeId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedNodeId, skillData]);

  // 点击容器空白处取消选中
  const handleContainerClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedNodeId(null);
    }
  };

  return (
    <div 
      className="skill-tree-container" 
      ref={containerRef}
      onMouseDown={handleContainerMouseDown}
      onMouseUp={handleContainerMouseUp}
      onClick={handleContainerClick}
    >
      <Helmet>
        <title>我的代码游乐场 | Seveinn</title>
        <meta
          name="description"
          content="Seveinn 个人作品展示网站，包含游戏开发、翻译作品、创意实验与技术博客。"
        />
        <link rel="canonical" href="https://fairycode.tech/" />
      </Helmet>
      {/* 开发环境显示操作提示和工具按钮 */}
      {isDev && (
        <>
          <div className="instruction">
            💡 右键点击节点可添加子技能 | 拖拽节点整理布局
          </div>
          <div className="dev-tools">
            <button className="dev-btn" onClick={handleExportConfig}>
              📥 导出配置
            </button>
            <label className="dev-btn">
              📤 导入配置
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportConfig}
                style={{ display: 'none' }}
              />
            </label>
            <button 
              className="dev-btn" 
              onClick={() => setDisplayMode(displayMode === 'icon' ? 'text' : 'icon')}
              title={displayMode === 'icon' ? '切换到文字模式' : '切换到图标模式'}
            >
              {displayMode === 'icon' ? '📝 文字模式' : '🎨 图标模式'}
            </button>
            {displayMode === 'text' && (
              <>
                <button 
                  className="dev-btn" 
                  onClick={() => setTextSizeScale(prev => Math.max(0.5, prev - 0.1))}
                  title="缩小文字"
                >
                  🔍−
                </button>
                <button 
                  className="dev-btn" 
                  onClick={() => setTextSizeScale(prev => Math.min(2, prev + 0.1))}
                  title="放大文字"
                >
                  🔍+
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* 显示模式切换按钮 - 所有环境可用 */}
      {!isDev && (
        <div className="dev-tools">
          <button 
            className="dev-btn" 
            onClick={() => setDisplayMode(displayMode === 'icon' ? 'text' : 'icon')}
            title={displayMode === 'icon' ? '切换到文字模式' : '切换到图标模式'}
          >
            {displayMode === 'icon' ? '📝 文字模式' : '🎨 图标模式'}
          </button>
          {displayMode === 'text' && (
            <>
              <button 
                className="dev-btn" 
                onClick={() => setTextSizeScale(prev => Math.max(0.5, prev - 0.1))}
                title="缩小文字"
              >
                🔍−
              </button>
              <button 
                className="dev-btn" 
                onClick={() => setTextSizeScale(prev => Math.min(2, prev + 0.1))}
                title="放大文字"
              >
                🔍+
              </button>
            </>
          )}
        </div>
      )}

      {/* SVG 连线层 */}
      <svg ref={svgRef} id="connection-layer" className="connection-layer"></svg>

      {/* 节点 */}
      {skillData.map((node) => (
        <div
          key={node.id}
          ref={(el) => {
            if (el) nodeRefs.current.set(node.id, el);
            else nodeRefs.current.delete(node.id);
          }}
          className={`node ${node.type === 'root' ? 'root-node' : ''} ${displayMode === 'text' ? 'text-mode' : ''} ${selectedNodeId === node.id ? 'selected' : ''}`}
          data-type={node.type}
          style={{
            left: `${center.x + node.x + panOffset.x - (node.type === 'root' ? (displayMode === 'text' ? 50 : 35) : (displayMode === 'text' ? 40 : 25))}px`,
            top: `${center.y + node.y + panOffset.y - (node.type === 'root' ? (displayMode === 'text' ? 50 : 35) : (displayMode === 'text' ? 40 : 25))}px`,
            fontSize: displayMode === 'text' ? `${(node.type === 'root' ? 0.75 : 0.65) * textSizeScale}rem` : undefined,
          }}
          onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
          onContextMenu={isDev ? (e) => handleNodeContextMenu(e, node.id) : undefined}
          onMouseEnter={(e) => handleNodeMouseEnter(e, node)}
          onMouseLeave={handleNodeMouseLeave}
        >
          {displayMode === 'icon' ? node.icon : node.title}
        </div>
      ))}

      {/* 悬浮提示框 - 技能块样式 */}
      {tooltip.visible && tooltip.node && (
        <div
          className="skill-tooltip visible"
          style={{ 
            left: `${tooltip.x}px`, 
            top: `${tooltip.y}px`,
            '--block-color': tooltip.node.color || 'var(--primary)'
          } as React.CSSProperties}
        >
          <div className="skill-block-tooltip">
            <div className="skill-top">
              <span className="skill-name">{tooltip.node.icon} {tooltip.node.title}</span>
              {tooltip.node.level !== undefined && (
                <span className="skill-lvl">LV.{tooltip.node.level}</span>
              )}
            </div>
            {tooltip.node.progress !== undefined && (
              <div className="progress-track">
                <div 
                  className="progress-fill" 
                  style={{ 
                    width: `${tooltip.node.progress}%`,
                    backgroundColor: tooltip.node.color || 'var(--primary)',
                    boxShadow: `0 0 10px ${tooltip.node.color || 'var(--primary)'}`
                  }}
                ></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 添加节点模态框 */}
      <div
        className={`modal-overlay ${isModalOpen ? 'open' : ''}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setIsModalOpen(false);
          }
        }}
      >
        <div className="modal">
          <h3>Add New Skill</h3>
          <div className="form-group">
            <label>技能名称 (Name)</label>
            <input
              type="text"
              value={newNodeName}
              onChange={(e) => setNewNodeName(e.target.value)}
              placeholder="例如: TypeScript"
              autoComplete="off"
              onKeyPress={handleModalKeyPress}
            />
          </div>
          <div className="form-group">
            <label>图标/Emoji (Icon)</label>
            <input
              type="text"
              value={newNodeIcon}
              onChange={(e) => setNewNodeIcon(e.target.value)}
              placeholder="例如: 📘"
              maxLength={2}
              onKeyPress={handleModalKeyPress}
            />
          </div>
          <div className="btn-group">
            <button className="btn btn-cancel" onClick={() => setIsModalOpen(false)}>
              取消
            </button>
            <button className="btn btn-primary" onClick={handleAddNode}>
              创建节点
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
