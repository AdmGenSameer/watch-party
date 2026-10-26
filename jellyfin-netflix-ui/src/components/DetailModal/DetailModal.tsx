import { motion, AnimatePresence } from 'framer-motion';
import { Play, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PosterCard from '../PosterGrid/PosterCard';
import { useAuthStore } from '../../store/useAuthStore';
import { useWatchPartyStore } from '../../store/useWatchPartyStore';
import { getItemDetails, getSimilarItems, getEpisodes, getImageUrl, formatRunTime, detailsCache } from '../../services/jellyfinApi';
import './DetailModal.css';

export interface MovieData {
  id: string;
  title: string;
  type: 'movie' | 'series' | 'collection';
  year?: number;
  overview?: string;
  rating?: string;
  runtime?: string;
  backdrop: string;
  poster: string;
  logo?: string;
  isHero?: boolean;
  span?: '1x1' | '1x2' | '2x1' | '2x2';
}

interface DetailModalProps {
  movie: MovieData | null;
  onClose: () => void;
}

export default function DetailModal({ movie, onClose }: DetailModalProps) {
  const navigate = useNavigate();
  const { serverUrl, userId, token } = useAuthStore();
  const createRoom = useWatchPartyStore(state => state.createRoom);
  
  const [cast, setCast] = useState<any[]>([]);
  const [similar, setSimilar] = useState<any[]>([]);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [collectionItems, setCollectionItems] = useState<any[]>([]);
  const [details, setDetails] = useState<any>(null);

  const handleStartParty = async () => {
    if (!movie) return;
    const room = await createRoom({
      id: movie.id,
      title: movie.title,
      type: movie.type === 'series' ? 'series' : 'movie',
      year: movie.year,
      backdrop: movie.backdrop,
      poster: movie.poster,
      overview: movie.overview,
      streamUrl: serverUrl && token ? `${serverUrl}/Videos/${movie.id}/master.m3u8?MediaSourceId=${movie.id}&DeviceId=tokoshan-web&PlaySessionId=wp_${movie.id}&VideoCodec=h264&AudioCodec=aac,mp3&VideoBitrate=12000000&AudioBitrate=320000&TranscodingMaxAudioChannels=2&SegmentContainer=ts&MinSegments=1&BreakOnNonKeyFrames=True&api_key=${token}` : undefined
    });
    onClose();
    navigate(`/party/${room.id}`);
  };

  useEffect(() => {
    if (!movie || !serverUrl || !userId || !token) return;

    if (movie.type === 'collection') {
      import('../../services/jellyfinApi').then(({ getCollectionItems }) => {
        getCollectionItems(serverUrl, userId, token, movie.id)
          .then(data => setCollectionItems(data.Items || []))
          .catch(console.error);
      });
      return;
    }

    // Check cache first for instant load
    const cached = detailsCache[movie.id];
    if (cached && cached.details) {
      setDetails(cached.details);
      if (cached.details.People) {
        setCast(cached.details.People.filter((p: any) => p.Type === 'Actor').slice(0, 15));
      }
      setSimilar(cached.similar);
      setEpisodes(cached.episodes);
      return;
    }

    // Fetch deep details (cast, crew, genres, studios) if not cached
    getItemDetails(serverUrl, userId, token, movie.id)
      .then(data => {
        setDetails(data);
        if (data.People) {
          const actors = data.People.filter((p: any) => p.Type === 'Actor').slice(0, 15);
          setCast(actors);
        }
      })
      .catch(console.error);

    // Fetch similar items
    getSimilarItems(serverUrl, userId, token, movie.id)
      .then(data => setSimilar(data.Items || []))
      .catch(console.error);

    // Fetch episodes if it's a TV series
    if (movie.type === 'series') {
      getEpisodes(serverUrl, userId, token, movie.id)
        .then(data => setEpisodes(data.Items || []))
        .catch(console.error);
    }
  }, [movie, serverUrl, userId, token]);
  
  if (!movie) return null;

  const backdropImage = movie.backdrop || movie.poster || '';
  const posterImage = movie.poster || movie.backdrop || '';
  const displayOverview = details?.Overview || movie.overview || 'A fantastic journey awaits. This title currently does not have a detailed synopsis available.';
  
  const isSeries = movie.type === 'series';

  const directors = details?.People?.filter((p: any) => p.Type === 'Director')?.map((p: any) => p.Name).join(', ') || '';
  const writers = details?.People?.filter((p: any) => p.Type === 'Writer')?.map((p: any) => p.Name).join(', ') || '';
  const genres = details?.Genres?.join(', ') || '';
  const studios = details?.Studios?.map((s: any) => s.Name).join(', ') || '';
  const tags = details?.Tags?.join(', ') || '';

  return (
    <AnimatePresence>
      <motion.div 
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div 
          className="spatial-modal"
          initial={{ scale: 0.95, y: 30, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 30, opacity: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 400, mass: 0.8 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="modal-close" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          {/* Background Layer */}
          <div className="modal-backdrop-container">
            <img src={backdropImage} alt={movie.title} className="modal-backdrop-img" />
            <div className="modal-vignette"></div>
          </div>

          {/* Main Layout (Jellyfin Style 2-Column) */}
          <div className="modal-main-content">
            {/* Left Column - Poster */}
            <div className="modal-poster-col">
              <div className="modal-poster-wrapper">
                <motion.img 
                  layoutId={`poster-${movie.id}`} 
                  src={posterImage} 
                  alt={movie.title} 
                  className="modal-main-poster"
                  transition={{ type: "spring", damping: 20, stiffness: 400, mass: 0.8 }}
                />
                <a 
                  className="modal-poster-play"
                  href={`${serverUrl}/web/index.html#!/details?id=${movie.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}
                >
                  <Play size={48} fill="white" />
                </a>
              </div>
            </div>

            {/* Right Column - Meta Data */}
            <div className="modal-meta-col">
              {movie.logo ? (
                <img src={movie.logo} alt={movie.title} className="modal-title-logo" style={{ maxWidth: '300px', maxHeight: '100px', marginBottom: '16px', objectFit: 'contain', filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.8))', objectPosition: 'left' }} />
              ) : (
                <h1 className="modal-title">{movie.title}</h1>
              )}
              
              <div className="modal-quick-meta">
                {isSeries ? <span>Series</span> : null}
                {movie.year && <span>{movie.year}</span>}
                {movie.rating && <span className="meta-rating">{movie.rating}</span>}
                {movie.runtime && <span>{movie.runtime}</span>}
                <span className="modal-hd">HD</span>
              </div>

              <div className="modal-actions">
                <button className="btn-detail-party" onClick={handleStartParty} title="Start a Watch Party with friends">
                  <Sparkles size={16} />
                  <span>Watch Party</span>
                </button>
                <button className="btn-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                </button>
                <button className="btn-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                    <line x1="7" y1="2" x2="7" y2="22"></line>
                    <line x1="17" y1="2" x2="17" y2="22"></line>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <line x1="2" y1="7" x2="7" y2="7"></line>
                    <line x1="2" y1="17" x2="7" y2="17"></line>
                    <line x1="17" y1="17" x2="22" y2="17"></line>
                    <line x1="17" y1="7" x2="22" y2="7"></line>
                  </svg>
                </button>
                <button className="btn-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </button>
              </div>

              {isSeries ? (
                // --- TV SERIES EPISODES LIST ---
                <div className="episodes-list">
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Episodes</h3>
                  {episodes.map(ep => (
                    <div key={ep.Id} className="episode-card">
                      <div className="episode-thumbnail-container">
                        <img 
                          src={serverUrl ? getImageUrl(serverUrl, ep.Id, 'Primary', 400, undefined, token || '') : ''} 
                          alt={ep.Name} 
                          className="episode-thumbnail" 
                        />
                        <a 
                          className="episode-play-overlay"
                          href={`${serverUrl}/web/index.html#!/details?id=${ep.Id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'white' }}
                        >
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                          </svg>
                        </a>
                      </div>

                      <div className="episode-details">
                        <div className="episode-header">
                          <div>
                            <div className="episode-title">{ep.IndexNumber ? `${ep.IndexNumber}. ` : ''}{ep.Name}</div>
                            <div className="episode-meta">
                              <span>{formatRunTime(ep.RunTimeTicks)}</span>
                              {ep.OfficialRating && <span style={{ color: '#fbbf24' }}>★ {ep.OfficialRating}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="episode-overview">
                          {ep.Overview}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // --- MOVIE METADATA ---
                <>
                  <div className="modal-tech-specs">
                    {details?.MediaSources?.[0] && (
                      <>
                        <span className="spec-label">Video</span>
                        <span>{details.MediaSources[0].VideoType} {details.MediaSources[0].MediaStreams?.find((s:any) => s.Type === 'Video')?.DisplayTitle || ''}</span>
                        
                        <span className="spec-label">Container</span>
                        <span>{details.MediaSources[0].Container}</span>
                      </>
                    )}
                  </div>

                  <div className="modal-overview">
                    {displayOverview}
                  </div>

                  <div className="modal-deep-meta">
                    {tags && (
                      <div>
                        <span className="meta-row-label">Tags</span>
                        <span className="meta-row-value" style={{ fontSize: '0.85rem' }}>{tags}</span>
                      </div>
                    )}
                    {genres && (
                      <div>
                        <span className="meta-row-label">Genres</span>
                        <span className="meta-row-value">{genres}</span>
                      </div>
                    )}
                    {directors && (
                      <div>
                        <span className="meta-row-label">Director</span>
                        <span className="meta-row-value">{directors}</span>
                      </div>
                    )}
                    {writers && (
                      <div>
                        <span className="meta-row-label">Writers</span>
                        <span className="meta-row-value">{writers}</span>
                      </div>
                    )}
                    {studios && (
                      <div>
                        <span className="meta-row-label">Studios</span>
                        <span className="meta-row-value">{studios}</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {movie.type === 'collection' && collectionItems.length > 0 && (
            <div className="modal-horizontal-section">
              <h3>Items in Collection</h3>
              <div className="modal-scroll-row">
                {collectionItems.map(item => (
                  <PosterCard 
                    key={item.Id}
                    id={item.Id}
                    title={item.Name}
                    poster={serverUrl ? getImageUrl(serverUrl, item.Id, 'Primary', 400) : ''}
                    year={item.ProductionYear}
                    rating={item.OfficialRating}
                    type={item.Type === 'Series' ? 'series' : 'movie'}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Cast & Crew Section */}
          {movie.type !== 'collection' && cast.length > 0 && (
            <div className="modal-horizontal-section">
              <h2 className="section-title">Cast & Crew</h2>
              <div className="scroll-track">
                {cast.map(person => (
                  <div key={person.Id} className="cast-card">
                    <div className="cast-img-container">
                      <img 
                        src={serverUrl && person.PrimaryImageTag ? `${serverUrl}/Items/${person.Id}/Images/Primary?tag=${person.PrimaryImageTag}&maxWidth=200` : 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=200&h=200&fit=crop&auto=format'} 
                        alt={person.Name} 
                        className="cast-img" 
                      />
                    </div>
                    <div>
                      <div className="cast-name">{person.Name}</div>
                      <div className="cast-role">{person.Role ? `as ${person.Role}` : ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* More Like This Section */}
          {movie.type !== 'collection' && similar.length > 0 && (
            <div className="modal-horizontal-section">
              <h3>More Like This</h3>
              <div className="modal-scroll-row">
                {similar.map(item => (
                  <PosterCard 
                    key={item.Id}
                    id={item.Id}
                    title={item.Name}
                    poster={serverUrl ? getImageUrl(serverUrl, item.Id, 'Primary', 400) : ''}
                    year={item.ProductionYear}
                    rating={item.OfficialRating}
                    type={item.Type === 'Series' ? 'series' : 'movie'}
                  />
                ))}
              </div>
            </div>
          )}

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
