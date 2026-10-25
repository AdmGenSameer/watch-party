import { useState, useEffect } from 'react';
import BentoCard from '../components/BentoGrid/BentoCard';
import PosterGrid from '../components/PosterGrid/PosterGrid';
import CollectionGrid from '../components/PosterGrid/CollectionGrid';
import { useUIStore } from '../store/useUIStore';
import { useAuthStore } from '../store/useAuthStore';
import { getLatestMedia, getItemsByGenre, getCollections, getImageUrl, formatRunTime } from '../services/jellyfinApi';

export default function Home() {
  const { serverUrl, userId, token } = useAuthStore();
  const setSelectedMovie = useUIStore(state => state.setSelectedMovie);

  const [latestItems, setLatestItems] = useState<any[]>([]);
  const [sciFiItems, setSciFiItems] = useState<any[]>([]);
  const [actionItems, setActionItems] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);

  useEffect(() => {
    if (serverUrl && userId && token) {
      getLatestMedia(serverUrl, userId, token)
        .then(data => {
          const items = Array.isArray(data) ? data : ((data as any)?.Items || []);
          setLatestItems(items);
        })
        .catch(console.error);

      getItemsByGenre(serverUrl, userId, token, 'Sci-Fi')
        .then(data => setSciFiItems(data.Items || []))
        .catch(console.error);

      getItemsByGenre(serverUrl, userId, token, 'Action')
        .then(data => setActionItems(data.Items || []))
        .catch(console.error);

      getCollections(serverUrl, userId, token)
        .then(data => setCollections(data.Items || []))
        .catch(console.error);
    }
  }, [serverUrl, userId, token]);

  const formatItem = (item: any, isHero: boolean = false, span: '1x1'|'1x2'|'2x1'|'2x2' = '1x1') => ({
    id: item.Id,
    title: item.Name,
    type: item.Type === 'Series' ? 'series' as const : 'movie' as const,
    year: item.ProductionYear,
    overview: item.Overview,
    rating: item.OfficialRating,
    runtime: formatRunTime(item.RunTimeTicks),
    backdrop: serverUrl ? getImageUrl(serverUrl, item.Id, 'Backdrop', 800, undefined, token || '') : '',
    poster: serverUrl ? getImageUrl(serverUrl, item.Id, 'Primary', 400, undefined, token || '') : '',
    logo: serverUrl && item.ImageTags && item.ImageTags.Logo ? `${serverUrl}/Items/${item.Id}/Images/Logo?quality=90&api_key=${token || ''}` : undefined,
    isHero,
    span
  });

  const handleMovieClick = (item: any) => {
    setSelectedMovie(formatItem(item));
  };

  const handleCollectionClick = (collection: any) => {
    setSelectedMovie({
      id: collection.id,
      title: collection.title,
      type: 'collection',
      backdrop: collection.backdrop,
      poster: collection.backdrop,
      year: undefined,
      rating: undefined,
      overview: undefined,
      runtime: undefined
    });
  };

  const bentoSpans = ['2x2', '1x2', '1x1', '1x1'] as const;
  const bentoItems = latestItems.slice(0, 4).map((item, index) => formatItem(item, index === 0, bentoSpans[index]));

  const formattedCollections = collections.map(c => ({
    id: c.Id,
    title: c.Name,
    itemCount: c.ChildCount || 0,
    backdrop: serverUrl ? getImageUrl(serverUrl, c.Id, 'Primary', 600, undefined, token || '') : '' // Collections usually only have Primary images
  }));

  return (
    <>
      {bentoItems.length > 0 && (
        <div className="bento-grid">
          {bentoItems.map((item) => (
            <BentoCard 
              key={item.id}
              id={item.id}
              title={item.title}
              backdrop={item.backdrop}
              span={item.span as '1x1' | '1x2' | '2x1' | '2x2'}
              year={item.year}
              rating={item.rating}
              isHero={item.isHero}
              overview={item.overview}
              logo={item.logo}
              onClick={() => handleMovieClick(item)}
            />
          ))}
        </div>
      )}
      
      {formattedCollections.length > 0 && (
        <CollectionGrid title="Curated Collections" items={formattedCollections} onCollectionClick={handleCollectionClick} />
      )}

      {latestItems.length > 4 && (
        <PosterGrid title="Recently Added" items={latestItems.slice(4).map(item => formatItem(item))} onMovieClick={handleMovieClick} />
      )}
      
      {actionItems.length > 0 && (
        <PosterGrid title="Action & Adventure" items={actionItems.map(item => formatItem(item))} onMovieClick={handleMovieClick} />
      )}

      {sciFiItems.length > 0 && (
        <PosterGrid title="Sci-Fi & Fantasy" items={sciFiItems.map(item => formatItem(item))} onMovieClick={handleMovieClick} />
      )}
    </>
  );
}
