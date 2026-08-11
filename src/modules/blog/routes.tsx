import { Route } from 'react-router-dom';
import BlogListPage from './pages/BlogListPage';
import BlogArticlePage from './pages/BlogArticlePage';

export const blogRoutes = [
  <Route key="blog-list" path="/blog" element={<BlogListPage />} />,
  <Route key="blog-article" path="/blog/:slug" element={<BlogArticlePage />} />,
];
