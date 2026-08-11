export interface BlogArticle {
  id: string;
  title: string;
  content: string; // HTML 内容
  excerpt?: string; // 摘要
  author?: string;
  publishDate: string; // ISO 日期字符串
  tags: string[];
  category?: string;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
}

export interface BlogFilters {
  tag?: string;
  category?: string;
  search?: string;
}

