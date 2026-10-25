import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar/Navbar';
import DetailModal from './components/DetailModal/DetailModal';
import Login from './components/Login/Login';
import { useAuthStore } from './store/useAuthStore';
import { useUIStore } from './store/useUIStore';
import { watchPartyService } from './services/watchPartyService';
import { BENTO_DATA } from './data/mockData';
import Home from './pages/Home';
import Movies from './pages/Movies';
import Series from './pages/Series';
import Universe from './pages/Universe';
import WatchPartyLobby from './components/WatchParty/WatchPartyLobby';
import WatchPartyTheater from './components/WatchParty/WatchPartyTheater';
import './App.css';

function App() {
  const location = useLocation();
  const token = useAuthStore(state => state.token);
  const serverUrl = useAuthStore(state => state.serverUrl);
  const logout = useAuthStore(state => state.clearAuth);
  
  const selectedMovie = useUIStore(state => state.selectedMovie);
  const setSelectedMovie = useUIStore(state => state.setSelectedMovie);

  // Initialize WatchParty real-time service
  useEffect(() => {
    watchPartyService.initServer(serverUrl, token);
  }, [serverUrl, token]);

  if (!token) {
    return <Login />;
  }

  const closeModal = () => {
    setSelectedMovie(null);
  };

  const isTheaterMode = location.pathname.startsWith('/party/') && location.pathname !== '/party';

  return (
    <div className="app-container">
      {/* Toast Notifications */}
      <Toaster 
        position="bottom-center" 
        toastOptions={{ 
          style: { 
            background: '#18181b', 
            color: '#fff', 
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            borderRadius: '10px',
            fontSize: '0.9rem'
          } 
        }} 
      />

      {/* Spatial Environment Layer */}
      {!isTheaterMode && (
        <div 
          className="spatial-environment" 
          style={{ backgroundImage: `url(${BENTO_DATA[0].backdrop})` }}
        />
      )}
      
      {/* Navigation Bar */}
      {!isTheaterMode && <Navbar onLogout={logout} />}

      {/* Main Glassmorphism UI Layer */}
      <main className={`app-content ${isTheaterMode ? 'theater-mode' : ''}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/movies" element={<Movies />} />
          <Route path="/series" element={<Series />} />
          <Route path="/universe" element={<Universe />} />
          <Route path="/party" element={<WatchPartyLobby />} />
          <Route path="/party/:roomId" element={<WatchPartyTheater />} />
        </Routes>
      </main>

      {/* Detail Modal Overlay */}
      <DetailModal movie={selectedMovie} onClose={closeModal} />
    </div>
  );
}

export default App;
