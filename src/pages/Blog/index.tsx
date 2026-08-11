import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BlogArticle } from './types';
import './styles.css';

const isDev = import.meta.env.DEV;

// 从 localStorage 加载文章列表（开发模式）
const loadArticlesFromStorage = (): BlogArticle[] => {
  try {
    const stored = localStorage.getItem('blogArticles');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('加载文章列表失败:', error);
  }
  return [];
};

// 从 JSON 文件加载文章列表（生产模式）
const loadArticlesFromJSON = async (): Promise<BlogArticle[]> => {
  try {
    const response = await fetch('/data/blog/articles.json');
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('加载文章列表失败:', error);
  }
  return [];
};

export default function Blog() {
  const [publishedArticles, setPublishedArticles] = useState<BlogArticle[]>([]);
  const [draftArticles, setDraftArticles] = useState<BlogArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'published' | 'draft'>('published');

  useEffect(() => {
    const loadArticles = async () => {
      let loadedArticles: BlogArticle[] = [];
      
      if (isDev) {
        loadedArticles = loadArticlesFromStorage();
      } else {
        loadedArticles = await loadArticlesFromJSON();
      }

      // 分离已发布和草稿文章，按发布日期倒序
      const published = loadedArticles
        .filter(a => a.status === 'published')
        .sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime());
      
      const drafts = loadedArticles
        .filter(a => a.status === 'draft')
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      
      setPublishedArticles(published);
      setDraftArticles(drafts);
      setLoading(false);
    };

    loadArticles();
  }, []);

  return (
    <div className="blog-page">
      <div className="blog-container">
        <header className="blog-header">
          <h1 className="blog-title">📝 技术博客</h1>
          <div className="blog-subtitle">
            &lt;Blog&gt; 分享技术心得与思考 &lt;/Blog&gt;
          </div>
          {isDev && (
            <Link to="/blog/editor" className="blog-create-btn">
              ✏️ 新建文章
            </Link>
          )}
        </header>

        {/* 标签页切换（开发模式下显示草稿标签） */}
        {isDev && (publishedArticles.length > 0 || draftArticles.length > 0) && (
          <div className="blog-tabs">
            <button
              className={`blog-tab ${activeTab === 'published' ? 'active' : ''}`}
              onClick={() => setActiveTab('published')}
            >
              📝 公开文章 ({publishedArticles.length})
            </button>
            <button
              className={`blog-tab ${activeTab === 'draft' ? 'active' : ''}`}
              onClick={() => setActiveTab('draft')}
            >
              📄 草稿 ({draftArticles.length})
            </button>
          </div>
        )}

        {loading ? (
          <div className="loading">加载中...</div>
        ) : (() => {
          // 非开发模式下只显示公开文章
          const currentArticles = (!isDev || activeTab === 'published') ? publishedArticles : draftArticles;
          
          return currentArticles.length === 0 ? (
            <div className="empty-state">
              <p>{activeTab === 'published' ? '暂无公开文章' : '暂无草稿'}</p>
              {isDev && (
                <Link to="/blog/editor" className="blog-btn blog-btn-primary">
                  {activeTab === 'published' ? '创建第一篇文章' : '创建草稿'}
                </Link>
              )}
            </div>
          ) : (
            <div className="blog-grid">
              {currentArticles.map((article) => (
                <Link
                  key={article.id}
                  to={`/blog/article/${article.id}`}
                  className="blog-card"
                >
                  <div className="blog-card-header">
                    <div className="blog-card-dot red"></div>
                    <div className="blog-card-dot yellow"></div>
                    <div className="blog-card-dot green"></div>
                  </div>
                  <div className="blog-card-content">
                    <h2 className="blog-card-title">{article.title}</h2>
                    {activeTab === 'draft' && (
                      <span className="draft-badge">草稿</span>
                    )}
                    
                    {article.excerpt && (
                      <p className="blog-card-excerpt">{article.excerpt}</p>
                    )}

                    <div className="blog-card-meta">
                      <span className="blog-card-date">
                        {new Date(activeTab === 'published' ? article.publishDate : article.updatedAt).toLocaleDateString('zh-CN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                      {article.category && (
                        <span className="blog-card-category">{article.category}</span>
                      )}
                    </div>

                    {article.tags.length > 0 && (
                      <div className="blog-card-tags">
                        {article.tags.slice(0, 3).map((tag, index) => (
                          <span key={index} className="blog-tag">
                            #{tag}
                          </span>
                        ))}
                        {article.tags.length > 3 && (
                          <span className="blog-tag-more">+{article.tags.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

