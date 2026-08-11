export interface Translation {
  id: string;
  title: string;              // 中文书名
  originalTitle: string;      // 原书名
  author: string;             // 作者
  language: string;           // 原文语言
  status: 'ongoing' | 'completed' | 'published';  // 状态
  description: string;        // 简介
  coverImage?: string;        // 封面图片URL
  coverPlaceholder: string;   // 封面占位符文本
  readUrl?: string;           // 阅读链接
  tags: string[];             // 标签
  translateDate?: string;     // 翻译日期
}


