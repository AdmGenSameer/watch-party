import CollectionCard from './CollectionCard';
import './CollectionGrid.css';

interface CollectionItem {
  id: string;
  title: string;
  backdrop: string;
  itemCount: number;
}

interface CollectionGridProps {
  title: string;
  items: CollectionItem[];
  onCollectionClick?: (collection: CollectionItem) => void;
}

export default function CollectionGrid({ title, items, onCollectionClick }: CollectionGridProps) {
  return (
    <section className="collection-grid-container">
      <h2 className="collection-grid-title">{title}</h2>
      
      <div className="collection-track-wrapper">
        <div className="collection-track">
          {items.map((item) => (
            <div className="collection-item-wrapper" key={item.id}>
              <CollectionCard 
                id={item.id}
                title={item.title}
                backdrop={item.backdrop}
                itemCount={item.itemCount}
                onClick={() => onCollectionClick?.(item)}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
