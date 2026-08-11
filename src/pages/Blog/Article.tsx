import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { BlogArticle } from './types';
import { showToast } from '@/components/Toast';
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

// 保存文章列表到 localStorage
const saveArticlesToStorage = (articles: BlogArticle[]) => {
  try {
    localStorage.setItem('blogArticles', JSON.stringify(articles));
    console.log('✅ 文章列表已保存');
  } catch (error) {
    console.error('❌ 保存文章列表失败:', error);
  }
};

export default function Article() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<BlogArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const loadArticle = async () => {
      if (!id) {
        navigate('/blog');
        return;
      }

      let articles: BlogArticle[] = [];
      
      if (isDev) {
        articles = loadArticlesFromStorage();
      } else {
        articles = await loadArticlesFromJSON();
      }

      const foundArticle = articles.find(a => a.id === id);
      if (foundArticle) {
        setArticle(foundArticle);
      } else {
        navigate('/blog');
      }
      setLoading(false);
    };

    loadArticle();
  }, [id, navigate]);

  // 删除文章（仅开发模式）
  const handleDelete = () => {
    if (!isDev || !id || !article) return;

    const articles = loadArticlesFromStorage();
    const updatedArticles = articles.filter(a => a.id !== id);
    saveArticlesToStorage(updatedArticles);
    
    showToast('文章已删除', 'success');
    navigate('/blog');
  };

  // 隐藏文章（转为草稿）
  const handleHide = () => {
    if (!id || !article) return;

    if (isDev) {
      // 开发模式：更新 localStorage
      const articles = loadArticlesFromStorage();
      const index = articles.findIndex(a => a.id === id);
      if (index !== -1) {
        articles[index] = {
          ...articles[index],
          status: 'draft',
          updatedAt: new Date().toISOString(),
        };
        saveArticlesToStorage(articles);
        showToast('文章已隐藏（转为草稿）', 'info');
        navigate('/blog');
      }
    } else {
      showToast('生产模式下无法修改文章状态', 'warning');
    }
  };

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

  return (
    <div className="blog-article-page">
      <div className="blog-article-container">
        <header className="blog-article-header">
          <Link to="/blog" className="back-link">
            ← 返回列表
          </Link>
          <div className="article-actions">
            {isDev && (
              <>
                <Link to={`/blog/editor/${article.id}`} className="edit-link">
                  ✏️ 编辑
                </Link>
                <button 
                  className="article-action-btn hide-btn"
                  onClick={handleHide}
                  title="隐藏文章（转为草稿）"
                >
                  👁️ 隐藏
                </button>
                <button 
                  className="article-action-btn delete-btn"
                  onClick={() => setShowDeleteConfirm(true)}
                  title="删除文章"
                >
                  🗑️ 删除
                </button>
              </>
            )}
          </div>
        </header>

        <article className="blog-article-content">
          <h1 className="article-title">{article.title}</h1>
          
          <div className="article-meta">
            <div className="meta-item">
              <span className="meta-label">作者：</span>
              <span className="meta-value">{article.author || 'Seveinn'}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">发布时间：</span>
              <span className="meta-value">
                {new Date(article.publishDate).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
            {article.category && (
              <div className="meta-item">
                <span className="meta-label">分类：</span>
                <span className="meta-value">{article.category}</span>
              </div>
            )}
          </div>

          {article.tags.length > 0 && (
            <div className="article-tags">
              {article.tags.map((tag, index) => (
                <span key={index} className="tag">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {article.excerpt && (
            <div className="article-excerpt">
              {article.excerpt}
            </div>
          )}

          <div 
            className="article-body"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </article>

        {/* 删除确认对话框 */}
        {showDeleteConfirm && (
          <div 
            className="delete-confirm-modal"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowDeleteConfirm(false);
              }
            }}
          >
            <div className="delete-confirm-dialog">
              <h3>确认删除</h3>
              <p>确定要删除文章《{article.title}》吗？此操作不可恢复。</p>
              <div className="delete-confirm-actions">
                <button 
                  className="blog-btn blog-btn-secondary"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  取消
                </button>
                <button 
                  className="blog-btn blog-btn-danger"
                  onClick={handleDelete}
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

