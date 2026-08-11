export interface BlogArticleMeta {
  title: string;
  slug: string;
  publishDate: string;
  updatedDate?: string;
  author: string;
  categories: string[];
  tags: string[];
  excerpt: string;
  status: 'draft' | 'published';
  legacyUrl?: string;
}

export interface BlogArticle extends BlogArticleMeta {
  content: string;
}
