import { Link, useLocation } from 'react-router-dom';
import './Navigation.css';

export default function Navigation() {
  const { pathname } = useLocation();
  return (
    <nav className="main-nav">
      <div className="nav-container">
        <Link to="/" className="nav-logo"><span className="nav-planet" aria-hidden="true" /> Seveinn</Link>
        <div className="nav-links">
          <Link to="/experiments" className={`nav-link ${pathname === '/experiments' ? 'active' : ''}`}>实验作品</Link>
          <Link to="/translations" className={`nav-link ${pathname === '/translations' ? 'active' : ''}`}>文学翻译</Link>
        </div>
      </div>
    </nav>
  );
}
