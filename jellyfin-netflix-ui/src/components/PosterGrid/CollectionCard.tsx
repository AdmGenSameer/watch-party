import { motion, useMotionValue, useTransform } from 'framer-motion';
import React from 'react';
import './CollectionCard.css';

interface CollectionCardProps {
  id: string;
  title: string;
  backdrop: string;
  itemCount: number;
  onClick?: () => void;
}

export default function CollectionCard({ title, backdrop, itemCount, onClick }: CollectionCardProps) {
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);

  const rotateX = useTransform(y, [0, 1], [5, -5]);
  const rotateY = useTransform(x, [0, 1], [-5, 5]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width);
    y.set((e.clientY - rect.top) / rect.height);
  };

  const handleMouseLeave = () => {
    x.set(0.5);
    y.set(0.5);
  };

  return (
    <motion.div 
      className="collection-card spatial-glass"
      style={{ rotateX, rotateY, perspective: 1000 }}
      whileHover={{ scale: 1.05, z: 40 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="collection-backdrop-wrapper">
        <img src={backdrop} alt={title} className="collection-img" loading="lazy" />
        <div className="collection-gradient"></div>
      </div>
      
      <div className="collection-content">
        <h3 className="collection-title">{title}</h3>
        <span className="collection-badge">{itemCount} Movies</span>
      </div>
    </motion.div>
  );
}
