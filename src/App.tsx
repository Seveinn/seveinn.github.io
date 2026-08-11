import { Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Toast from './components/Toast';
import Home from './pages/Home';
import Translations from './pages/Translations';
import Experiments from './pages/Experiments';
import Blog from './pages/Blog';
import Article from './pages/Blog/Article';
import Editor from './pages/Blog/Editor';
import './App.css';

const isDev = import.meta.env.DEV;

export default function App() {
  return (
    <div className="app-layout">
      <header className="app-header">
        <Navigation />
      </header>
      <main className="app-body">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/translations" element={<Translations />} />
          <Route path="/experiments" element={<Experiments />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/article/:id" element={<Article />} />
          {isDev && <Route path="/blog/editor" element={<Editor />} />}
          {isDev && <Route path="/blog/editor/:id" element={<Editor />} />}
        </Routes>
      </main>
      <Toast />
    </div>
  );
}


