import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import './styles.css';
import PlanetScene from './PlanetScene';

const updates = [
  { type: '文章', title: 'Vue 原理：从响应式到渲染流程', note: '重新整理核心机制与常见面试切入点', href: '/blog/2021-03-24-vue-principle', color: 'mint' },
  { type: '实验', title: 'HexWilds · 六边形荒野', note: 'WebGL 世界生成与探索玩法实验', href: '/experiments/HexWilds/index.html', color: 'gold' },
  { type: '文章', title: '前端工程化：代码规范', note: '团队协作、Lint 与可维护性的实践笔记', href: '/blog/2021-03-26-front-end-engineering-code-style', color: 'coral' },
];

// 暂不展示「站内重点」模块，保留数据以便后续恢复
// const featured = [
//   { label: 'React 高级特性', meta: '技术文章', href: '/blog/2021-03-31-react-advanced-features' },
//   { label: 'Vue 3 面试真题', meta: '专题整理', href: '/blog/2021-03-27-vue3-interview-questions' },
//   { label: '创意实验室', meta: '互动作品', href: '/experiments' },
// ];

function Arrow() { return <span aria-hidden="true">↗</span>; }

export default function Home() {
  const [planetPaused, setPlanetPaused] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const dateText = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(now);

  return (
    <div className={`planet-home ${planetPaused ? 'is-paused' : ''}`}>
      <Helmet>
        <title>Seveinn · 前端、图形与游戏实验</title>
        <meta name="description" content="Seveinn 的个人技术站：前端文章、图形实验与游戏开发记录。" />
      </Helmet>
      <div className="space-wash" aria-hidden="true" />
      <PlanetScene paused={planetPaused} />

      <main className="planet-layout">
        <aside className="glass-panel updates-panel">
          <header className="home-brand">
            <span className="brand-planet" aria-hidden="true" />
            <div><p className="eyebrow">SEVEINN'S ORBIT</p><h1>创作轨道</h1><p>记录前端、图形与游戏开发的每一次探索</p></div>
          </header>
          <section className="date-card" aria-label="今日日期">
            <div><span>今日坐标</span><strong>{dateText}</strong></div><span className="online-dot">持续更新中</span>
          </section>
          <div className="section-title">
            <div><span>UPDATE LOG</span><h2>内容更新播报</h2></div><Link to="/blog">全部文章 <Arrow /></Link>
          </div>
          <div className="update-list">
            {updates.map((item) => (
              <a className="update-item" href={item.href} key={item.title}>
                <span className={`update-mark ${item.color}`} aria-hidden="true" />
                <span className="update-copy"><small>{item.type}</small><strong>{item.title}</strong><em>{item.note}</em></span><Arrow />
              </a>
            ))}
          </div>
          <footer className="panel-footer"><span>保持好奇，缓慢生长。</span><span className="orbit-line" aria-hidden="true" /></footer>
        </aside>

        <section className="orbit-stage">
          <div className="hero-copy">
            <p className="eyebrow">WELCOME TO MY LITTLE UNIVERSE</p>
            <h2>在代码与想象之间，<br />建造自己的小小星球。</h2>
            <p>这里收集技术笔记、交互实验，以及那些尚未命名的灵感。</p>
            <div className="hero-actions"><Link className="primary-action" to="/experiments">探索实验室 <Arrow /></Link><Link className="text-action" to="/blog">阅读技术博客</Link></div>
          </div>
          <button className="planet-control" type="button" aria-pressed={planetPaused} onClick={() => setPlanetPaused((value) => !value)}>
            <span aria-hidden="true">{planetPaused ? '▶' : 'Ⅱ'}</span>{planetPaused ? '继续星球自转' : '暂停星球自转'}
          </button>
          {/* 暂不展示「站内重点」模块，保留结构以便后续恢复
          <div className="orbit-cards">
            <section className="glass-panel link-panel">
              <div className="section-title compact"><div><span>FEATURED</span><h2>站内重点</h2></div></div>
              <div className="featured-list">
                {featured.map((item, index) => <a href={item.href} key={item.label}><b>0{index + 1}</b><span><strong>{item.label}</strong><small>{item.meta}</small></span><Arrow /></a>)}
              </div>
            </section>
          </div>
          */}
        </section>
      </main>
    </div>
  );
}
