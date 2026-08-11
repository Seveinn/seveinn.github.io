import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import ReactMarkdown from 'react-markdown';
import type { BlogArticle } from '../types';
import { getArticleBySlug } from '../services/blogRepository';
import '../styles/blog.css';

export default function BlogArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<BlogArticle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!slug) {
        navigate('/blog');
        return;
      }

      try {
        const found = await getArticleBySlug(slug);
        if (cancelled) return;
        if (!found) {
          navigate('/blog');
          return;
        }
        setArticle(found);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          navigate('/blog');
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
  }, [slug, navigate]);

  if (loading) {
    return (
      <div className="blog-article-page">
        <div className="blog-article-container">
          <div className="loading">加载中...</div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="blog-article-page">
        <div className="blog-article-container">
          <div className="error">文章未找到</div>
          <Link to="/blog" className="blog-btn blog-btn-primary">
            返回博客列表
          </Link>
        </div>
      </div>
    );
  }

  const canonical = `https://fairycode.tech/blog/${article.slug}`;

  return (
    <div className="blog-article-page">
      <Helmet>
        <title>{article.title} | Seveinn</title>
        <meta name="description" content={article.excerpt} />
        <link rel="canonical" href={canonical} />
      </Helmet>

      <div className="blog-article-container">
        <header className="blog-article-header">
          <Link to="/blog" className="back-link">
            ← 返回列表
          </Link>
        </header>

        <article className="blog-article-content">
          <h1 className="article-title">{article.title}</h1>

          <div className="article-meta">
            <div className="meta-item">
              <span className="meta-label">作者：</span>
              <span className="meta-value">{article.author}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">发布时间：</span>
              <span className="meta-value">
                {new Date(article.publishDate).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
            {article.categories.length > 0 && (
              <div className="meta-item">
                <span className="meta-label">分类：</span>
                <span className="meta-value">
                  {article.categories.join(' / ')}
                </span>
              </div>
            )}
          </div>

          {article.tags.length > 0 && (
            <div className="article-tags">
              {article.tags.map((tag) => (
                <span key={tag} className="tag">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {article.excerpt && (
            <div className="article-excerpt">{article.excerpt}</div>
          )}

          <div className="article-body">
            <ReactMarkdown>{article.content}</ReactMarkdown>
          </div>
        </article>
      </div>
    </div>
  );
}
