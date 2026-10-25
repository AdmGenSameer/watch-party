import { useState, useEffect } from 'react';
import PosterGrid from '../components/PosterGrid/PosterGrid';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { getResumeItems, getFavoriteItems, getImageUrl, formatRunTime } from '../services/jellyfinApi';

export default function Universe() {
  const { serverUrl, userId, token } = useAuthStore();
  const setSelectedMovie = useUIStore(state => state.setSelectedMovie);

  const [resumeItems, setResumeItems] = useState<any[]>([]);
  const [favoriteItems, setFavoriteItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (serverUrl && userId && token) {
      Promise.all([
        getResumeItems(serverUrl, userId, token).catch(() => ({ Items: [] })),
        getFavoriteItems(serverUrl, userId, token).catch(() => ({ Items: [] }))
      ]).then(([resumeData, favoritesData]) => {
        setResumeItems(resumeData.Items || []);
        setFavoriteItems(favoritesData.Items || []);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [serverUrl, userId, token]);

  const handleMovieClick = (movie: any) => {
    setSelectedMovie(movie);
  };

  const formatJellyfinItem = (item: any) => ({
    id: item.Id,
    title: item.Name,
    year: item.ProductionYear,
    rating: item.OfficialRating,
    runtime: formatRunTime(item.RunTimeTicks),
    poster: serverUrl ? getImageUrl(serverUrl, item.Id, 'Primary', 400, undefined, token || '') : '',
    backdrop: serverUrl ? getImageUrl(serverUrl, item.Id, 'Backdrop', 800, undefined, token || '') : '',
    logo: serverUrl && item.ImageTags && item.ImageTags.Logo ? `${serverUrl}/Items/${item.Id}/Images/Logo?quality=90&api_key=${token || ''}` : undefined,
    type: item.Type === 'Series' ? 'series' as const : 'movie' as const,
    overview: item.Overview
  });

  if (loading) {
    return <div style={{ paddingTop: '100px', textAlign: 'center', color: 'white' }}>Loading your universe...</div>;
  }

  const formattedResume = resumeItems.map(formatJellyfinItem);
  const formattedFavorites = favoriteItems.map(formatJellyfinItem);

  return (
    <div style={{ paddingTop: '80px', paddingBottom: '40px', minHeight: '100vh' }}>
      <h1 style={{ marginLeft: '40px', fontSize: '2rem', marginBottom: '20px' }}>My Universe</h1>
      
      {formattedResume.length > 0 ? (
        <PosterGrid 
          title="Continue Watching" 
          items={formattedResume} 
          onMovieClick={handleMovieClick} 
        />
      ) : (
        <div style={{ padding: '20px 40px', color: '#999' }}>
          <h3>Nothing to continue watching.</h3>
          <p>Start a movie or series and it will appear here.</p>
        </div>
      )}
      
      {formattedFavorites.length > 0 ? (
        <PosterGrid 
          title="My Favorites" 
          items={formattedFavorites} 
          onMovieClick={handleMovieClick} 
        />
      ) : (
        <div style={{ padding: '20px 40px', color: '#999', marginTop: '20px' }}>
          <h3>No favorites yet.</h3>
          <p>Mark items with a heart and they will appear here.</p>
        </div>
      )}
    </div>
  );
}
