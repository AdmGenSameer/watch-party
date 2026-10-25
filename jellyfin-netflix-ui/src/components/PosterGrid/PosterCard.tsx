import { motion, useMotionValue, useTransform } from 'framer-motion';
import React from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { prefetchItemDetails } from '../../services/jellyfinApi';
import './PosterCard.css';

interface PosterCardProps {
  id: string;
  title: string;
  poster: string;
  year?: number;
  rating?: string;
  type?: 'movie' | 'series';
  onClick?: () => void;
}

export default function PosterCard({ id, title, poster, year, rating, type, onClick }: PosterCardProps) {
  const { serverUrl, userId, token } = useAuthStore();
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);

  const rotateX = useTransform(y, [0, 1], [10, -10]);
  const rotateY = useTransform(x, [0, 1], [-10, 10]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width);
    y.set((e.clientY - rect.top) / rect.height);
  };

  const handleMouseLeave = () => {
    x.set(0.5);
    y.set(0.5);
  };

  const handleMouseEnter = () => {
    if (serverUrl && userId && token) {
      prefetchItemDetails(serverUrl, userId, token, id, type);
    }
  };

  return (
    <motion.div 
      className="spatial-poster spatial-glass"
      style={{ rotateX, rotateY, perspective: 1000 }}
      whileHover={{ scale: 1.08, z: 50 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <motion.img layoutId={`poster-${id}`} src={poster} alt={title} className="poster-img" loading="lazy" />
      <div className="poster-vignette"></div>
      
      <div className="poster-info">
        <h4 className="poster-title">{title}</h4>
        <div className="poster-meta">
          {year && <span>{year}</span>}
          {rating && <span className="poster-rating">{rating}</span>}
        </div>
      </div>
    </motion.div>
  );
}
