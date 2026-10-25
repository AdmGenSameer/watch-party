import PosterCard from './PosterCard';
import './PosterGrid.css';

interface PosterData {
  id: string;
  title: string;
  poster: string;
  year?: number;
  rating?: string;
}

interface PosterGridProps {
  title: string;
  items: PosterData[];
  onMovieClick?: (movie: PosterData) => void;
}

export default function PosterGrid({ title, items, onMovieClick }: PosterGridProps) {
  return (
    <div className="poster-grid-container">
      <h2 className="poster-grid-title">{title}</h2>
      <div className="poster-grid">
        {items.map((item) => (
          <PosterCard 
            key={item.id}
            id={item.id}
            title={item.title}
            poster={item.poster}
            year={item.year}
            rating={item.rating}
            onClick={() => onMovieClick?.(item)}
          />
        ))}
      </div>
    </div>
  );
}
