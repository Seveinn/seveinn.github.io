import { Helmet } from 'react-helmet-async';
import { Translation } from '@/types/translation';
import './styles.css';

// 测试数据（已注释）
// const translations: Translation[] = [
//   {
//     id: '1',
//     title: '深入理解计算机系统',
//     originalTitle: 'Computer Systems: A Programmer\'s Perspective',
//     author: 'Randal E. Bryant & David R. O\'Hallaron',
//     language: '英语',
//     status: 'completed',
//     description: '这是一本经典的计算机系统教材，深入浅出地讲解了计算机系统的工作原理。',
//     coverPlaceholder: 'BOOK_COVER_1.jpg',
//     readUrl: '#',
//     tags: ['#技术', '#计算机科学', '#系统'],
//     translateDate: '2024-01',
//   },
//   {
//     id: '2',
//     title: '轻小说：异世界转生记',
//     originalTitle: '異世界転生記',
//     author: '某某作者',
//     language: '日语',
//     status: 'ongoing',
//     description: '一部轻松有趣的异世界转生轻小说，讲述主角在异世界的冒险故事。',
//     coverPlaceholder: 'LIGHT_NOVEL_COVER.png',
//     readUrl: '#',
//     tags: ['#轻小说', '#异世界', '#冒险'],
//     translateDate: '2024-03',
//   },
//   {
//     id: '3',
//     title: '游戏文本：像素冒险',
//     originalTitle: 'Pixel Adventure',
//     author: 'Game Studio',
//     language: '英语',
//     status: 'published',
//     description: '一款独立游戏的完整文本翻译，包括对话、UI文本和剧情描述。',
//     coverPlaceholder: 'GAME_TEXT_COVER.jpg',
//     readUrl: '#',
//     tags: ['#游戏', '#文本翻译', '#独立游戏'],
//     translateDate: '2023-12',
//   },
//   {
//     id: '4',
//     title: '技术文档：React最佳实践',
//     originalTitle: 'React Best Practices',
//     author: 'Tech Community',
//     language: '英语',
//     status: 'completed',
//     description: 'React框架的最佳实践指南，涵盖性能优化、代码组织和团队协作等方面。',
//     coverPlaceholder: 'DOC_COVER.png',
//     readUrl: '#',
//     tags: ['#技术', '#React', '#前端'],
//     translateDate: '2024-02',
//   },
// ];

const translations: Translation[] = [];

const getStatusLabel = (status: Translation['status']) => {
  const statusMap = {
    ongoing: { text: '进行中', color: 'var(--secondary)' },
    completed: { text: '已完成', color: 'var(--highlight)' },
    published: { text: '已发布', color: 'var(--primary)' },
  };
  return statusMap[status];
};

const getLanguageColor = (language: string) => {
  const colorMap: Record<string, string> = {
    '日语': 'var(--accent)',
    '英语': 'var(--primary)',
    '韩语': 'var(--highlight)',
  };
  return colorMap[language] || 'var(--text-sub)';
};

export default function Translations() {
  return (
    <div className="translations-page">
      <Helmet>
        <title>翻译作品 | Seveinn</title>
        <meta
          name="description"
          content="Seveinn 的文学与游戏文本翻译作品集。"
        />
        <link rel="canonical" href="https://fairycode.tech/translations" />
      </Helmet>
      <div className="translations-container">
        <header className="translations-header">
          <h1 className="translations-title">📚 翻译作品</h1>
          <div className="translations-subtitle">
            &lt;Translate&gt; 用文字连接世界 &lt;/Translate&gt;
          </div>
        </header>
        
        <div className="translations-grid">
          {translations.map((translation) => {
            const statusInfo = getStatusLabel(translation.status);
            const languageColor = getLanguageColor(translation.language);

            return (
              <div key={translation.id} className="translation-card">
                <div className="translation-card-header">
                  <div className="translation-dot red"></div>
                  <div className="translation-dot yellow"></div>
                  <div className="translation-dot green"></div>
                </div>
                <div className="translation-card-content">
                  {/* 书名 */}
                  <h2 className="translation-title">{translation.title}</h2>
                  <p className="translation-original-title">{translation.originalTitle}</p>

                  {/* 作者 */}
                  <div className="author-info">
                    <span className="author-label">作者：</span>
                    <span className="author-name">{translation.author}</span>
                  </div>

                  {/* 标签区域 - 第一行：语言和状态 */}
                  <div className="tags tags-primary">
                    <span
                      className="tag tag-language"
                      style={{ backgroundColor: `${languageColor}20`, color: languageColor }}
                    >
                      {translation.language}
                    </span>
                    <span
                      className="tag tag-status"
                      style={{ backgroundColor: `${statusInfo.color}20`, color: statusInfo.color }}
                    >
                      {statusInfo.text}
                    </span>
                  </div>

                  {/* 标签区域 - 第二行：其他标签 */}
                  <div className="tags tags-secondary">
                    {translation.tags.map((tag, index) => (
                      <span key={index} className="tag">
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* 简介 */}
                  <p className="translation-description">{translation.description}</p>

                  {/* 翻译日期 */}
                  {translation.translateDate && (
                    <div className="translate-date">
                      翻译时间：{translation.translateDate}
                    </div>
                  )}

                  {/* 操作按钮 */}
                  {translation.readUrl && translation.readUrl !== '#' ? (
                    <a
                      href={translation.readUrl}
                      className="translation-view-btn"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      📖 在线阅读
                    </a>
                  ) : (
                    <button className="translation-view-btn" disabled>
                      {translation.status === 'ongoing' ? '🚧 翻译中...' : '📖 即将上线'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


