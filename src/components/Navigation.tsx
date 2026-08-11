/*
 * @Author: Seveinn
 * @Date: 2025-11-24 11:43:26
 * @LastEditors: Seveinn
 * @LastEditTime: 2025-12-13 22:45:27
 * @FilePath: \seveinn-site\src\components\Navigation.tsx
 * @Description: 
 * 
 * Copyright (c) 2025 by ${git_name_email}, All Rights Reserved. 
 */
import { Link, useLocation } from 'react-router-dom';
import './Navigation.css';

export default function Navigation() {
  const location = useLocation();
  const isTranslations = location.pathname === '/translations';
  const isExperiments = location.pathname === '/experiments';
  const isBlog = location.pathname.startsWith('/blog');

  return (
    <nav className="main-nav">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          👾 Seveinn
        </Link>
        <div className="nav-links">
          {/* <Link 
            to="/" 
            className={`nav-link ${isHome ? 'active' : ''}`}
            title="首页"
          >
            🏠
          </Link> */}
          <Link 
            to="/experiments" 
            className={`nav-link ${isExperiments ? 'active' : ''}`}
          >
            实验作品
          </Link>
          <Link 
            to="/translations" 
            className={`nav-link ${isTranslations ? 'active' : ''}`}
          >
            文学翻译
          </Link>
          <Link 
            to="/blog" 
            className={`nav-link ${isBlog ? 'active' : ''}`}
          >
            技术博客
          </Link>
        </div>
      </div>
    </nav>
  );
}

