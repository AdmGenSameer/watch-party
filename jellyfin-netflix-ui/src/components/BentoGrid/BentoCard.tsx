import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/useAuthStore';
import { prefetchItemDetails } from '../../services/jellyfinApi';
import './BentoCard.css';

interface BentoCardProps {
  id: string;
  title: string;
  backdrop: string;
  span: '1x1' | '1x2' | '2x1' | '2x2';
  match?: string;
  rating?: string;
  year?: number;
  isHero?: boolean;
  overview?: string;
  logo?: string;
  onClick?: () => void;
}

export default function BentoCard({ 
  id,
  title, 
  backdrop, 
  span, 
  match, 
  rating, 
  year,
  isHero,
  overview,
  logo,
  onClick
}: BentoCardProps) {
  const { serverUrl } = useAuthStore();
  
  const handleMouseEnter = () => {
    if (serverUrl && useAuthStore.getState().userId && useAuthStore.getState().token) {
      prefetchItemDetails(serverUrl, useAuthStore.getState().userId!, useAuthStore.getState().token!, id, undefined);
    }
  };

  return (
    <motion.div 
      className={`bento-card spatial-glass span-${span}`}
      whileHover={{ scale: 1.02, z: 20 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
    >
      <motion.img layoutId={`poster-${id}`} src={backdrop} alt={title} className="bento-bg" loading="lazy" />
      <div className="bento-vignette"></div>
      
      {isHero ? (
        <div style={{ position: 'relative', zIndex: 1, paddingBottom: '20px' }}>
          {logo ? (
            <img src={logo} alt={title} className="bento-hero-logo" style={{ maxWidth: '400px', maxHeight: '150px', marginBottom: '16px', objectFit: 'contain', filter: 'drop-shadow(0px 4px 10px rgba(0,0,0,0.8))' }} />
          ) : (
            <h1 className="bento-hero-title">{title}</h1>
          )}
          {overview && <p className="bento-hero-overview">{overview}</p>}
          <div style={{ display: 'flex', gap: '16px' }}>
            <a 
              className="btn-primary"
              href={`${serverUrl}/web/index.html#!/details?id=${id}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
            >
              Watch Now
            </a>
            <button className="btn-secondary spatial-glass">More Info</button>
          </div>
        </div>
      ) : (
        <div style={{ position: 'relative', zIndex: 1 }}>
          {logo ? (
            <img src={logo} alt={title} className="bento-logo" style={{ maxWidth: '150px', maxHeight: '60px', marginBottom: '8px', objectFit: 'contain', filter: 'drop-shadow(0px 2px 6px rgba(0,0,0,0.8))', objectPosition: 'left' }} />
          ) : (
            <h3 className="bento-title">{title}</h3>
          )}
          <div className="bento-meta">
            {match && <span className="bento-match">{match} Match</span>}
            {year && <span>{year}</span>}
            {rating && <span className="bento-rating">{rating}</span>}
          </div>
        </div>
      )}
    </motion.div>
  );
}
