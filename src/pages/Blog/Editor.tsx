import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import ReactMarkdown from 'react-markdown';
import { marked } from 'marked';
import { BlogArticle } from './types';
import { showToast } from '@/components/Toast';
import './styles.css';

const isDev = import.meta.env.DEV;
const STORAGE_KEY = 'blogArticles';

// 从 localStorage 加载文章列表
const loadArticlesFromStorage = (): BlogArticle[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('加载文章列表失败:', error);
  }
  return [];
};

// 保存文章列表到 localStorage
const saveArticlesToStorage = (articles: BlogArticle[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(articles));
    console.log('✅ 文章已保存到 localStorage');
  } catch (error) {
    console.error('❌ 保存文章失败:', error);
  }
};

// 导出文章为 JSON
const exportArticles = (articles: BlogArticle[]) => {
  try {
    const dataStr = JSON.stringify(articles, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'blog-articles.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    console.log('✅ 文章已导出');
  } catch (error) {
    console.error('❌ 导出文章失败:', error);
  }
};

export default function Editor() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [tags, setTags] = useState('');
  const [category, setCategory] = useState('');
  const [author, setAuthor] = useState('Seveinn');
  
  // Markdown 导入相关状态
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false);
  const [markdownContent, setMarkdownContent] = useState('');
  const [previewMode, setPreviewMode] = useState<'edit' | 'preview' | 'split'>('split');
  const [markdownFileName, setMarkdownFileName] = useState('');
  const markdownFileInputRef = useRef<HTMLInputElement>(null);

  // 如果不是开发模式，重定向到博客列表
  useEffect(() => {
    if (!isDev) {
      navigate('/blog');
    }
  }, [navigate]);

  // 如果是编辑模式，加载文章数据
  useEffect(() => {
    if (isEditMode && id) {
      const articles = loadArticlesFromStorage();
      const article = articles.find(a => a.id === id);
      if (article) {
        setTitle(article.title);
        setContent(article.content);
        setExcerpt(article.excerpt || '');
        setTags(article.tags.join(', '));
        setCategory(article.category || '');
        setAuthor(article.author || 'Seveinn');
      }
    }
  }, [isEditMode, id]);

  // Quill 编辑器配置
  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'color': [] }, { 'background': [] }],
      ['link', 'image', 'code-block'],
      ['clean']
    ],
  };

  const quillFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'color', 'background',
    'link', 'image', 'code-block'
  ];

  // 生成摘要（如果没有手动输入）
  const generateExcerpt = (html: string, maxLength: number = 150): string => {
    const text = html.replace(/<[^>]*>/g, '').trim();
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // 保存文章
  const handleSave = () => {
    if (!title.trim() || !content.trim()) {
      showToast('请填写标题和内容', 'warning');
      return;
    }

    const articles = loadArticlesFromStorage();
    const now = new Date().toISOString();
    const tagArray = tags.split(',').map(t => t.trim()).filter(t => t);

    if (isEditMode && id) {
      // 更新现有文章
      const index = articles.findIndex(a => a.id === id);
      if (index !== -1) {
        articles[index] = {
          ...articles[index],
          title: title.trim(),
          content,
          excerpt: excerpt.trim() || generateExcerpt(content),
          tags: tagArray,
          category: category.trim() || undefined,
          author: author.trim() || 'Seveinn',
          updatedAt: now,
        };
        saveArticlesToStorage(articles);
        navigate(`/blog/article/${id}`);
      }
    } else {
      // 创建新文章
      const newArticle: BlogArticle = {
        id: `article_${Date.now()}`,
        title: title.trim(),
        content,
        excerpt: excerpt.trim() || generateExcerpt(content),
        tags: tagArray,
        category: category.trim() || undefined,
        author: author.trim() || 'Seveinn',
        publishDate: now,
        status: 'published',
        createdAt: now,
        updatedAt: now,
      };
      articles.push(newArticle);
      saveArticlesToStorage(articles);
      navigate(`/blog/article/${newArticle.id}`);
    }
  };

  // 导出 JSON
  const handleExport = () => {
    const articles = loadArticlesFromStorage();
    exportArticles(articles);
  };

  // 从 Markdown 提取标题（第一个 H1）
  const extractTitleFromMarkdown = (markdown: string): string => {
    const lines = markdown.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('# ')) {
        return trimmed.substring(2).trim();
      }
    }
    return '';
  };

  // 从文件名提取标题（去除扩展名）
  const extractTitleFromFileName = (fileName: string): string => {
    // 去除 .md 或 .markdown 扩展名
    const nameWithoutExt = fileName.replace(/\.(md|markdown)$/i, '');
    return nameWithoutExt.trim();
  };

  // 处理 Markdown 文件导入
  const handleMarkdownFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 检查文件类型
    if (!file.name.endsWith('.md') && !file.name.endsWith('.markdown')) {
      showToast('请选择 Markdown 文件（.md 或 .markdown）', 'warning');
      return;
    }

    // 保存文件名
    setMarkdownFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setMarkdownContent(text);
      setShowMarkdownPreview(true);
      
      // 如果标题为空，优先使用文件名作为标题
      if (!title.trim()) {
        const fileNameTitle = extractTitleFromFileName(file.name);
        if (fileNameTitle) {
          setTitle(fileNameTitle);
        } else {
          // 如果文件名提取失败，尝试从 Markdown 提取标题
          const extractedTitle = extractTitleFromMarkdown(text);
          if (extractedTitle) {
            setTitle(extractedTitle);
          }
        }
      }
    };
    reader.onerror = () => {
      showToast('读取文件失败，请重试', 'error');
    };
    reader.readAsText(file);

    // 清空文件输入，以便可以重复选择同一文件
    if (markdownFileInputRef.current) {
      markdownFileInputRef.current.value = '';
    }
  };

  // 打开 Markdown 文件选择器
  const handleImportMarkdown = () => {
    markdownFileInputRef.current?.click();
  };

  // 将 Markdown 转换为 HTML 并应用到编辑器
  const handleApplyMarkdown = async () => {
    if (!markdownContent.trim()) {
      showToast('Markdown 内容为空', 'warning');
      return;
    }

    try {
      // 使用 marked 将 Markdown 转换为 HTML
      const htmlContent = await marked(markdownContent, {
        breaks: true, // 支持换行
        gfm: true, // GitHub Flavored Markdown
      });
      
      setContent(htmlContent as string);
      
      // 如果标题为空，使用文件名作为标题（去除扩展名）
      if (!title.trim() && markdownFileName) {
        const fileNameTitle = extractTitleFromFileName(markdownFileName);
        if (fileNameTitle) {
          setTitle(fileNameTitle);
        }
      }
      
      setShowMarkdownPreview(false);
      setMarkdownContent('');
      setMarkdownFileName('');
      
      // 如果摘要为空，从内容生成
      if (!excerpt.trim()) {
        const textContent = markdownContent.replace(/[#*`\[\]]/g, '').trim();
        const generatedExcerpt = textContent.length > 150 
          ? textContent.substring(0, 150) + '...' 
          : textContent;
        setExcerpt(generatedExcerpt);
      }
    } catch (error) {
      console.error('Markdown 转换失败:', error);
      showToast('Markdown 转换失败，请检查内容格式', 'error');
    }
  };

  // 取消 Markdown 导入
  const handleCancelMarkdown = () => {
    setShowMarkdownPreview(false);
    setMarkdownContent('');
    setMarkdownFileName('');
  };

  if (!isDev) {
    return null;
  }

  return (
    <div className="blog-editor-page">
      <div className="blog-editor-container">
        <header className="blog-editor-header">
          <h1 className="blog-editor-title">
            {isEditMode ? '✏️ 编辑文章' : '📝 新建文章'}
          </h1>
          <div className="blog-editor-actions">
            <button className="blog-btn blog-btn-secondary" onClick={handleImportMarkdown}>
              📄 导入 Markdown
            </button>
            <input
              ref={markdownFileInputRef}
              type="file"
              accept=".md,.markdown"
              onChange={handleMarkdownFileSelect}
              style={{ display: 'none' }}
            />
            <button className="blog-btn blog-btn-secondary" onClick={handleExport}>
              📥 导出 JSON
            </button>
            <button className="blog-btn blog-btn-primary" onClick={handleSave}>
              💾 保存文章
            </button>
          </div>
        </header>

        <div className="blog-editor-form">
          <div className="form-group">
            <label>标题 *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入文章标题"
              className="form-input"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>作者</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="作者名称"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>分类</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="文章分类（可选）"
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label>标签（用逗号分隔）</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="例如: React, TypeScript, 前端"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>摘要（可选，留空将自动生成）</label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="文章摘要，留空将根据内容自动生成"
              className="form-textarea"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>正文内容 *</label>
            <div className="quill-wrapper">
              <ReactQuill
                theme="snow"
                value={content}
                onChange={setContent}
                modules={quillModules}
                formats={quillFormats}
                placeholder="开始撰写你的文章..."
              />
            </div>
          </div>
        </div>

        {/* Markdown 预览模态框 */}
        {showMarkdownPreview && (
          <div 
            className="markdown-preview-modal"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleCancelMarkdown();
              }
            }}
          >
            <div className="markdown-preview-container">
              <div className="markdown-preview-header">
                <h2>📄 Markdown 预览</h2>
                <div className="markdown-preview-actions">
                  <div className="preview-mode-switch">
                    <button
                      className={`mode-btn ${previewMode === 'edit' ? 'active' : ''}`}
                      onClick={() => setPreviewMode('edit')}
                      title="仅编辑"
                    >
                      ✏️ 编辑
                    </button>
                    <button
                      className={`mode-btn ${previewMode === 'split' ? 'active' : ''}`}
                      onClick={() => setPreviewMode('split')}
                      title="分屏"
                    >
                      📊 分屏
                    </button>
                    <button
                      className={`mode-btn ${previewMode === 'preview' ? 'active' : ''}`}
                      onClick={() => setPreviewMode('preview')}
                      title="仅预览"
                    >
                      👁️ 预览
                    </button>
                  </div>
                  <div className="preview-buttons">
                    <button className="blog-btn blog-btn-secondary" onClick={handleCancelMarkdown}>
                      取消
                    </button>
                    <button className="blog-btn blog-btn-primary" onClick={handleApplyMarkdown}>
                      应用到编辑器
                    </button>
                  </div>
                </div>
              </div>

              <div className="markdown-preview-content">
                {(previewMode === 'edit' || previewMode === 'split') && (
                  <div className={`markdown-editor-panel ${previewMode === 'split' ? 'split' : 'full'}`}>
                    <div className="panel-header">Markdown 源码</div>
                    <textarea
                      className="markdown-textarea"
                      value={markdownContent}
                      onChange={(e) => setMarkdownContent(e.target.value)}
                      placeholder="Markdown 内容..."
                    />
                  </div>
                )}

                {(previewMode === 'preview' || previewMode === 'split') && (
                  <div className={`markdown-preview-panel ${previewMode === 'split' ? 'split' : 'full'}`}>
                    <div className="panel-header">预览效果</div>
                    <div className="markdown-preview-body">
                      <ReactMarkdown>{markdownContent}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

