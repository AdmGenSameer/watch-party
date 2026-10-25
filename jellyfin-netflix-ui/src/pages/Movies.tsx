import { useState, useEffect } from 'react';
import PosterGrid from '../components/PosterGrid/PosterGrid';
import CollectionGrid from '../components/PosterGrid/CollectionGrid';
import { useUIStore } from '../store/useUIStore';
import { useAuthStore } from '../store/useAuthStore';
import { getItemsByGenre, getCollections, getImageUrl, formatRunTime } from '../services/jellyfinApi';

export default function Movies() {
  const { serverUrl, userId, token } = useAuthStore();
  const setSelectedMovie = useUIStore(state => state.setSelectedMovie);

  const [sciFiItems, setSciFiItems] = useState<any[]>([]);
  const [actionItems, setActionItems] = useState<any[]>([]);
  const [comedyItems, setComedyItems] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);

  useEffect(() => {
    if (serverUrl && userId && token) {
      getItemsByGenre(serverUrl, userId, token, 'Sci-Fi', 'Movie')
        .then(data => setSciFiItems(data.Items || []))
        .catch(console.error);

      getItemsByGenre(serverUrl, userId, token, 'Action', 'Movie')
        .then(data => setActionItems(data.Items || []))
        .catch(console.error);

      getItemsByGenre(serverUrl, userId, token, 'Comedy', 'Movie')
        .then(data => setComedyItems(data.Items || []))
        .catch(console.error);

      getCollections(serverUrl, userId, token)
        .then(data => setCollections(data.Items || []))
        .catch(console.error);
    }
  }, [serverUrl, userId, token]);

  const formatItem = (item: any) => ({
    id: item.Id,
    title: item.Name,
    type: 'movie' as const,
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

  const handleCollectionClick = (collection: any) => {
    console.log('Collection clicked:', collection);
  };

  const formattedCollections = collections.map(c => ({
    id: c.Id,
    title: c.Name,
    itemCount: c.ChildCount || 0,
    backdrop: serverUrl ? getImageUrl(serverUrl, c.Id, 'Primary', 600) : ''
  }));

  return (
    <>
      <div style={{ paddingTop: '80px', paddingBottom: '20px' }}>
        <h1 style={{ padding: '0 4vw', fontSize: '2rem', fontWeight: 600, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>Movies</h1>
      </div>

      {formattedCollections.length > 0 && (
        <CollectionGrid title="Movie Collections" items={formattedCollections} onCollectionClick={handleCollectionClick} />
      )}

      {actionItems.length > 0 && (
        <PosterGrid title="Action Movies" items={actionItems.map(item => formatItem(item))} onMovieClick={handleMovieClick} />
      )}
      
      {sciFiItems.length > 0 && (
        <PosterGrid title="Sci-Fi Movies" items={sciFiItems.map(item => formatItem(item))} onMovieClick={handleMovieClick} />
      )}

      {comedyItems.length > 0 && (
        <PosterGrid title="Comedy Movies" items={comedyItems.map(item => formatItem(item))} onMovieClick={handleMovieClick} />
      )}
    </>
  );
}
