import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export default function NotFoundPage() {
  return (
    <div
      style={{
        minHeight: '100%',
        display: 'grid',
        placeItems: 'center',
        padding: '3rem 1.5rem',
        textAlign: 'center',
        color: 'var(--text-light)',
        fontFamily: 'Quicksand, sans-serif',
      }}
    >
      <Helmet>
        <title>页面未找到 | Seveinn</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>404</h1>
        <p style={{ color: 'var(--text-sub)', marginBottom: '1.5rem' }}>
          没有找到这个页面。
        </p>
        <Link to="/" style={{ color: 'var(--primary)' }}>
          返回首页
        </Link>
      </div>
    </div>
  );
}
