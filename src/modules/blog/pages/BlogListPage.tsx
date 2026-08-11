import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import type { BlogArticleMeta } from '../types';
import { listArticleMeta } from '../services/blogRepository';
import '../styles/blog.css';

export default function BlogListPage() {
  const [articles, setArticles] = useState<BlogArticleMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const list = await listArticleMeta();
        if (!cancelled) {
          setArticles(list);
          setError(null);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError('加载文章列表失败');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="blog-page">
      <Helmet>
        <title>技术博客 | Seveinn</title>
        <meta
          name="description"
          content="Seveinn 的技术博客，分享前端工程、框架原理与开发笔记。"
        />
        <link rel="canonical" href="https://fairycode.tech/blog" />
      </Helmet>

      <div className="blog-container">
        <header className="blog-header">
          <h1 className="blog-title">技术博客</h1>
          <div className="blog-subtitle">
            &lt;Blog&gt; 分享技术心得与思考 &lt;/Blog&gt;
          </div>
        </header>

        {loading ? (
          <div className="loading">加载中...</div>
        ) : error ? (
          <div className="empty-state">
            <p>{error}</p>
          </div>
        ) : articles.length === 0 ? (
          <div className="empty-state">
            <p>暂无公开文章</p>
          </div>
        ) : (
          <div className="blog-grid">
            {articles.map((article) => (
              <Link
                key={article.slug}
                to={`/blog/${article.slug}`}
                className="blog-card"
              >
                <div className="blog-card-header">
                  <div className="blog-card-dot red"></div>
                  <div className="blog-card-dot yellow"></div>
                  <div className="blog-card-dot green"></div>
                </div>
                <div className="blog-card-content">
                  <h2 className="blog-card-title">{article.title}</h2>
                  {article.status === 'draft' && (
                    <span className="draft-badge">草稿</span>
                  )}

                  {article.excerpt && (
                    <p className="blog-card-excerpt">{article.excerpt}</p>
                  )}

                  <div className="blog-card-meta">
                    <span className="blog-card-date">
                      {new Date(article.publishDate).toLocaleDateString('zh-CN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                    {article.categories[0] && (
                      <span className="blog-card-category">
                        {article.categories[0]}
                      </span>
                    )}
                  </div>

                  {article.tags.length > 0 && (
                    <div className="blog-card-tags">
                      {article.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="blog-tag">
                          #{tag}
                        </span>
                      ))}
                      {article.tags.length > 3 && (
                        <span className="blog-tag-more">
                          +{article.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
