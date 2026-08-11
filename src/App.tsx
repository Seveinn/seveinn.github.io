import { Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Toast from './components/Toast';
import Home from './pages/Home';
import Translations from './pages/Translations';
import Experiments from './pages/Experiments';
import { blogRoutes } from './modules/blog/routes';
import './App.css';

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
          {blogRoutes}
        </Routes>
      </main>
      <Toast />
    </div>
  );
}
