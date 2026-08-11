import type { BlogArticle, BlogArticleMeta } from '../types';

const INDEX_URL = '/data/blog/index.json';
const articleUrl = (slug: string) => `/data/blog/articles/${encodeURIComponent(slug)}.json`;

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function listArticleMeta(): Promise<BlogArticleMeta[]> {
  const articles = await fetchJson<BlogArticleMeta[]>(INDEX_URL);
  return articles
    .filter((article) => import.meta.env.DEV || article.status === 'published')
    .sort(
      (a, b) =>
        new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
    );
}

export async function getArticleBySlug(slug: string): Promise<BlogArticle | null> {
  try {
    const article = await fetchJson<BlogArticle>(articleUrl(slug));
    if (!import.meta.env.DEV && article.status !== 'published') {
      return null;
    }
    return article;
  } catch {
    return null;
  }
}
