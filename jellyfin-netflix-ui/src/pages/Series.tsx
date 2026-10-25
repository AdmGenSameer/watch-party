import { useState, useEffect } from 'react';
import PosterGrid from '../components/PosterGrid/PosterGrid';
import { useUIStore } from '../store/useUIStore';
import { useAuthStore } from '../store/useAuthStore';
import { getItemsByGenre, getImageUrl, formatRunTime } from '../services/jellyfinApi';

export default function Series() {
  const { serverUrl, userId, token } = useAuthStore();
  const setSelectedMovie = useUIStore(state => state.setSelectedMovie);

  const [dramaItems, setDramaItems] = useState<any[]>([]);
  const [comedyItems, setComedyItems] = useState<any[]>([]);
  const [sciFiItems, setSciFiItems] = useState<any[]>([]);

  useEffect(() => {
    if (serverUrl && userId && token) {
      getItemsByGenre(serverUrl, userId, token, 'Drama', 'Series')
        .then(data => setDramaItems(data.Items || []))
        .catch(console.error);

      getItemsByGenre(serverUrl, userId, token, 'Comedy', 'Series')
        .then(data => setComedyItems(data.Items || []))
        .catch(console.error);

      getItemsByGenre(serverUrl, userId, token, 'Sci-Fi', 'Series')
        .then(data => setSciFiItems(data.Items || []))
        .catch(console.error);
    }
  }, [serverUrl, userId, token]);

  const formatItem = (item: any) => ({
    id: item.Id,
    title: item.Name,
    type: 'series' as const,
    year: item.ProductionYear,
    overview: item.Overview,
    rating: item.OfficialRating,
    runtime: formatRunTime(item.RunTimeTicks),
    backdrop: serverUrl ? getImageUrl(serverUrl, item.Id, 'Backdrop', 800) : '',
    poster: serverUrl ? getImageUrl(serverUrl, item.Id, 'Primary', 400) : '',
    logo: serverUrl && item.ImageTags && item.ImageTags.Logo ? `${serverUrl}/Items/${item.Id}/Images/Logo?quality=90` : undefined,
  });

  const handleMovieClick = (item: any) => {
    setSelectedMovie(formatItem(item));
  };

  return (
    <div style={{ paddingTop: '80px', paddingBottom: '40px', minHeight: '100vh' }}>
      <h1 style={{ padding: '0 4vw', fontSize: '2rem', fontWeight: 600, textShadow: '0 2px 4px rgba(0,0,0,0.5)', marginBottom: '20px' }}>TV Series</h1>

      {dramaItems.length > 0 && (
        <PosterGrid title="Drama Series" items={dramaItems.map(item => formatItem(item))} onMovieClick={handleMovieClick} />
      )}

      {comedyItems.length > 0 && (
        <PosterGrid title="Comedy Series" items={comedyItems.map(item => formatItem(item))} onMovieClick={handleMovieClick} />
      )}
      
      {sciFiItems.length > 0 && (
        <PosterGrid title="Sci-Fi & Fantasy Series" items={sciFiItems.map(item => formatItem(item))} onMovieClick={handleMovieClick} />
      )}
    </div>
  );
}
