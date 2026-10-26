import { useState, useEffect, useRef } from 'react';
import { Search, Bell, X, Tv } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';
import { getUserViews, searchItems } from '../../services/jellyfinApi';
import './Navbar.css';

interface NavbarProps {
  onLogout?: () => void;
}

export default function Navbar({ onLogout }: NavbarProps) {
  const { serverUrl, token, userId } = useAuthStore();
  const setSelectedMovie = useUIStore(state => state.setSelectedMovie);
  
  const [hasMovies, setHasMovies] = useState(false);
  const [hasSeries, setHasSeries] = useState(false);
  
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  const searchRef = useRef<HTMLDivElement>(null);

  // Fetch views to dynamically show Movies/Series links
  useEffect(() => {
    if (serverUrl && userId && token) {
      getUserViews(serverUrl, userId, token)
        .then(data => {
          const items = data.Items || [];
          setHasMovies(items.some((item: any) => item.CollectionType === 'movies'));
          setHasSeries(items.some((item: any) => item.CollectionType === 'tvshows'));
        })
        .catch(console.error);
    }
  }, [serverUrl, userId, token]);

  // Debounced search
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      if (serverUrl && userId && token) {
        searchItems(serverUrl, userId, token, searchTerm)
          .then(data => {
            setSearchResults(data.Items || []);
          })
          .catch(console.error);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchTerm, serverUrl, userId, token]);

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchResultClick = (item: any) => {
    const movieData = {
      id: item.Id,
      title: item.Name,
      type: item.Type === 'Series' ? 'series' : 'movie' as 'series'|'movie',
      year: item.ProductionYear,
      overview: item.Overview,
      poster: serverUrl ? `${serverUrl}/Items/${item.Id}/Images/Primary?quality=90` : '',
      backdrop: serverUrl ? `${serverUrl}/Items/${item.Id}/Images/Backdrop?quality=90` : '',
    };
    setSelectedMovie(movieData);
    setSearchOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="spatial-navbar-container">
      <nav className="spatial-pill spatial-glass">
        <div className="nav-brand">TOKOSHAN</div>
        
        <div className="nav-links">
          <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Home</NavLink>
          {hasMovies && <NavLink to="/movies" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Movies</NavLink>}
          {hasSeries && <NavLink to="/series" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Series</NavLink>}
          <NavLink to="/universe" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>My Universe</NavLink>
          <NavLink to="/party" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Watch Party
          </NavLink>
          <a 
            href="/web/index.html" 
            target="_top" 
            className="nav-link jellyfin-nav-link" 
            title="Return to Jellyfin Web"
          >
            <Tv size={15} />
            <span>Jellyfin</span>
          </a>
        </div>
        
        <div className="nav-actions">
          <div className={`search-container ${searchOpen ? 'open' : ''}`} ref={searchRef}>
            <Search className="nav-icon search-icon" size={20} onClick={() => setSearchOpen(true)} />
            {searchOpen && (
              <>
                <input 
                  type="text" 
                  className="search-input" 
                  placeholder="Search movies, series..." 
                  autoFocus
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <X className="nav-icon close-search" size={16} onClick={() => { setSearchOpen(false); setSearchTerm(''); }} />
                
                {searchResults.length > 0 && (
                  <div className="search-dropdown spatial-glass">
                    {searchResults.map(result => (
                      <div key={result.Id} className="search-result-item" onClick={() => handleSearchResultClick(result)}>
                        {serverUrl && result.ImageTags && result.ImageTags.Primary && (
                          <img src={`${serverUrl}/Items/${result.Id}/Images/Primary?quality=90&maxHeight=100`} alt={result.Name} />
                        )}
                        <div className="search-result-info">
                          <div className="search-result-title">{result.Name}</div>
                          <div className="search-result-meta">{result.ProductionYear} • {result.Type}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <Bell className="nav-icon" size={20} />
          <button className="nav-profile-btn" onClick={onLogout} title="Logout">
            <img 
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=100&h=100&fit=crop" 
              alt="Profile" 
              className="nav-avatar"
            />
          </button>
        </div>
      </nav>
    </div>
  );
}
