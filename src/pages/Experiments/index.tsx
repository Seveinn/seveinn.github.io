import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import './styles.css';

interface Experiment {
  id: string;
  title: string;
  description: string;
  path: string;
  thumbnail?: string;
  isMobile?: boolean; // 是否为移动端H5展示模式
  isModule?: boolean; // 是否为模块化组件（在弹窗中直接渲染）
  moduleId?: string; // 模块化组件的标识符
}

const experiments: Experiment[] = [
  {
    id: 'image-flow',
    title: 'ImageFlow · 节点式批量图片工坊',
    description: '在无限画布上串联抠图、裁剪、格式转换与压缩节点，批量预览并导出图片。',
    path: '/experiments/ImageFlow/index.html',
  },
  {
    id: 'story-node',
    title: 'StoryNode · 剧情节点生成器',
    description: '可视化互动剧情设计工具，支持节点编辑、画布漫游、AI 分支演算，以及剧情数据与完整剧本导出。',
    path: '/experiments/StoryNode/index.html',
  },
  {
    id: 'particle-atelier',
    title: 'Particle Atelier · 粒子特效实验室',
    description: '一个可交互的实时粒子特效展厅，汇集闪电、暴雨、云雾、烟雾、火光、水流，以及奥术与虚空风格的攻击特效。',
    path: '/experiments/ParticleAtelier/index.html',
  },
  {
    id: 'sprite-sheet-flow',
    title: 'SpriteSheetFlow',
    description: '面向游戏美术工作流的浏览器工具：批量裁剪序列帧、自动抠图、逐帧修整与动画预览，并可合成、导出 Sprite Sheet。图片仅在本地浏览器处理。',
    path: '/experiments/SpriteSheetFlow/index.html',
  },
  {
    id: 'hex-wilds',
    title: 'Hex Survival: Day & Night',
    description: '一个六边形网格生存游戏，包含昼夜循环系统，体验策略与生存的挑战。',
    path: '/experiments/HexWilds/index.html',
  },
  {
    id: 'swimming-fish',
    title: '游动的鱼群',
    description: '一个 Canvas 动画实验，展示鱼群游动的视觉效果，支持实时调整参数控制鱼群行为。',
    path: '/experiments/SwimmingFish/index.html',
  },
  {
    id: 'tiny-defender',
    title: '符文防线：虚空协议',
    description: '一个策略塔防游戏，使用 Canvas 和 JavaScript 开发，体验符文防御的乐趣。',
    path: '/experiments/tiny-defender/index.html',
  },
  {
    id: 'rainy3d',
    title: '3D 雨景立方体',
    description: '一个基于 Three.js 的 3D 交互场景，包含可控制的立方体和动态雨滴系统，支持碰撞检测、水花和涟漪效果。',
    path: '/experiments/Rainy3D/index.html',
  },
  {
    id: 'health-assistant',
    title: 'Health Flow - 成就版',
    description: '一个健康状态追踪应用，支持记录心情状态、可视化热力图、游戏化等级系统和成就解锁功能。',
    path: '/experiments/HealthAssistant/HealthAssitant.html',
    isMobile: true,
  },
  {
    id: 'growing-tree',
    title: '程序化自然生成',
    description: '一个基于 Canvas 的程序化生成实验，展示树木和植物的生长过程，支持多种生成模式（树叶、花朵、混合）和深度层次效果。',
    path: '/experiments/GrowingTree/index.html',
  },
  {
    id: 'growing-vine',
    title: '独干藤蔓生成器',
    description: '一个极简风格的 Canvas 程序化生成实验，展示单主干藤蔓的生长过程，支持随机突变和重生，具有清晰的景深层次效果。',
    path: '/experiments/GrowingVine/index.html',
  },
  {
    id: 'swag-box',
    title: '物理绳索木牌',
    description: '一个基于 Verlet 积分的物理模拟实验，展示绳索悬挂的木牌物理交互效果，支持鼠标拖拽和风力模拟，具有真实的物理摆动和碰撞效果。',
    path: '/experiments/SwagBox/index.html',
  },
  {
    id: 'hexa-life',
    title: '六边形田园',
    description: '一个基于六边形网格的资源管理游戏，体验策略与生存的挑战。包含完美的寻路系统、资源采集、单位招募等功能。',
    path: '/experiments/HexaLife/index.html',
  },
  {
    id: 'swag-grass',
    title: '手绘风格草丛',
    description: '一个基于 Canvas 的手绘风格草丛动画实验，展示程序化生成的草丛随风摆动的自然效果，支持实时调整密度、风速、高度等参数，具有分形噪声分布和真实的物理摆动效果。',
    path: '/experiments/SwagGrass/index.html',
  },
];

export default function Experiments() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentExperimentUrl, setCurrentExperimentUrl] = useState('');
  const [currentExperimentTitle, setCurrentExperimentTitle] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobileMode, setIsMobileMode] = useState(false);
  const windowRef = useRef<HTMLDivElement>(null);

  const openExperiment = (experiment: Experiment) => {
    // 如果是模块化组件，在弹窗中直接渲染
    if (experiment.isModule && experiment.moduleId) {
      // 模块化组件功能保留，但目前未使用
      setCurrentExperimentUrl('');
      setCurrentExperimentTitle(experiment.title);
      setIsMobileMode(false);
      setIsModalOpen(true);
      return;
    }
    
    // 使用 iframe 弹窗
    setCurrentExperimentUrl(experiment.path);
    setCurrentExperimentTitle(experiment.title);
    setIsMobileMode(experiment.isMobile || false);
    setIsModalOpen(true);
  };

  const closeExperiment = () => {
    // 如果处于全屏状态，先退出全屏
    if (isFullscreen) {
      exitFullscreen();
    }
    setIsModalOpen(false);
    // 延迟清空 iframe src 以停止运行（防止声音继续播放）
    setTimeout(() => {
      setCurrentExperimentUrl('');
    }, 300);
  };

  const handleModalClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isFullscreen) {
      closeExperiment();
    }
  };

  // 全屏功能
  const toggleFullscreen = async () => {
    if (!windowRef.current) return;

    try {
      if (!isFullscreen) {
        // 进入全屏
        if (windowRef.current.requestFullscreen) {
          await windowRef.current.requestFullscreen();
        } else if ((windowRef.current as any).webkitRequestFullscreen) {
          await (windowRef.current as any).webkitRequestFullscreen();
        } else if ((windowRef.current as any).mozRequestFullScreen) {
          await (windowRef.current as any).mozRequestFullScreen();
        } else if ((windowRef.current as any).msRequestFullscreen) {
          await (windowRef.current as any).msRequestFullscreen();
        }
      } else {
        // 退出全屏
        exitFullscreen();
      }
    } catch (error) {
      console.error('全屏操作失败:', error);
    }
  };

  const exitFullscreen = () => {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if ((document as any).webkitExitFullscreen) {
      (document as any).webkitExitFullscreen();
    } else if ((document as any).mozCancelFullScreen) {
      (document as any).mozCancelFullScreen();
    } else if ((document as any).msExitFullscreen) {
      (document as any).msExitFullscreen();
    }
  };

  // 监听全屏状态变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);


  // ESC 键关闭弹窗（全屏时也支持退出全屏）
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (isFullscreen) {
        exitFullscreen();
      } else if (isModalOpen) {
        closeExperiment();
      }
    }
  };

  // 获取当前域名（用于结构化数据）
  const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return 'https://fairycode.tech';
  };

  const baseUrl = getBaseUrl();

  return (
    <>
      <Helmet>
        <title>实验作品 - 创意与技术结合 | Seveinn</title>
        <meta 
          name="description" 
          content="探索创意与技术的结合，包含物理模拟、游戏开发、3D交互、程序化生成等多种实验作品。体验 Hex Survival、游动的鱼群、符文防线、3D雨景、物理绳索木牌等精彩项目。" 
        />
        <meta 
          name="keywords" 
          content="实验作品,创意编程,Canvas动画,Three.js,物理模拟,游戏开发,程序化生成,交互设计,Web实验,前端作品" 
        />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="实验作品 - 创意与技术结合 | Seveinn" />
        <meta property="og:description" content="探索创意与技术的结合，包含物理模拟、游戏开发、3D交互、程序化生成等多种实验作品。" />
        <meta property="og:url" content={`${baseUrl}/experiments`} />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="实验作品 - 创意与技术结合 | Seveinn" />
        <meta name="twitter:description" content="探索创意与技术的结合，包含物理模拟、游戏开发、3D交互、程序化生成等多种实验作品。" />
        
        {/* 结构化数据 - JSON-LD */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "name": "实验作品",
            "description": "探索创意与技术的结合，包含物理模拟、游戏开发、3D交互、程序化生成等多种实验作品",
            "url": `${baseUrl}/experiments`,
            "mainEntity": {
              "@type": "ItemList",
              "itemListElement": experiments.map((exp, index) => ({
                "@type": "ListItem",
                "position": index + 1,
                "name": exp.title,
                "description": exp.description,
                "url": `${baseUrl}${exp.path}`
              }))
            }
          })}
        </script>
      </Helmet>
      
    <div className="experiments-page" onKeyDown={handleKeyDown} tabIndex={0}>
      <div className="experiments-container">
        <header className="experiments-header">
          <p className="experiments-eyebrow">CREATIVE ORBIT · {String(experiments.length).padStart(2, '0')} PROJECTS</p>
          <h1 className="experiments-title">实验作品</h1>
          <p className="experiments-subtitle">在代码与想象之间，收集每一次可以被触碰的灵感。</p>
        </header>
        
        <div className="experiments-grid">
          {experiments.map((experiment, index) => (
            <article key={experiment.id} className="experiment-card">
              <div className="experiment-card-header">
                <span>PROJECT / {String(index + 1).padStart(2, '0')}</span>
                <span className="experiment-status">可交互</span>
              </div>
              <div className="experiment-card-content">
                <h2 className="experiment-title">{experiment.title}</h2>
                <p className="experiment-description">{experiment.description}</p>
                {experiment.id === 'sprite-sheet-flow' && (
                  <div className="experiment-badges" aria-label="作品特性">
                    <span>WEB TOOL</span><span>CANVAS</span><span>LOCAL-FIRST</span>
                  </div>
                )}
                <button
                  onClick={() => openExperiment(experiment)}
                  className="experiment-view-btn"
                >
                  <span>{experiment.id === 'sprite-sheet-flow' ? '打开工具' : '进入作品'}</span>
                  <span aria-hidden="true">↗</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* 实验作品运行弹窗结构 */}
      <div
        className={`experiment-modal-overlay ${isModalOpen ? 'active' : ''}`}
        onClick={handleModalClick}
      >
        <div 
          ref={windowRef}
          className={`experiment-window ${isFullscreen ? 'fullscreen' : ''} ${isMobileMode ? 'mobile-mode' : ''}`}
        >
          <div className="experiment-window-bar">
            <span>{isMobileMode ? '移动端预览' : currentExperimentTitle}</span>
            <div className="experiment-window-controls">
              <button 
                className="experiment-fullscreen-btn" 
                onClick={toggleFullscreen}
                title={isFullscreen ? '退出全屏' : '全屏'}
              >
                {isFullscreen ? '⤓' : '⤢'}
              </button>
              <button className="experiment-close-btn" onClick={closeExperiment}>
                ✕
              </button>
            </div>
          </div>
          {currentExperimentUrl && (
            <iframe
              id="experimentFrame"
              className="experiment-frame"
              src={currentExperimentUrl}
              allowFullScreen
              title={currentExperimentTitle}
            ></iframe>
          )}
          <div className="experiment-footer">
            按 ESC 或点击右上角关闭
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

