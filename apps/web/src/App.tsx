import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage.js';
import { PlayBotPage } from './pages/PlayBotPage.js';
import { PlayPvPPage } from './pages/PlayPvPPage.js';
import { PlayLocalPage } from './pages/PlayLocalPage.js';
import { HowToPlayPage } from './pages/HowToPlayPage.js';
import { ToastContainer } from './components/Toast.js';
import { BOT_ONLY } from './config.js';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/play/bot" element={<PlayBotPage />} />
        <Route path="/play/local" element={<PlayLocalPage />} />
        <Route path="/rules" element={<HowToPlayPage />} />
        {BOT_ONLY ? (
          <Route path="/play/pvp/*" element={<Navigate to="/" replace />} />
        ) : (
          <>
            <Route path="/play/pvp" element={<PlayPvPPage />} />
            <Route path="/play/pvp/:roomId" element={<PlayPvPPage />} />
          </>
        )}
      </Routes>
      <ToastContainer />
    </HashRouter>
  );
}
