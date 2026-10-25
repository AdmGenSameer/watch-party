import { create } from 'zustand';
import { type MovieData } from '../components/DetailModal/DetailModal';

interface UIState {
  selectedMovie: MovieData | null;
  setSelectedMovie: (movie: MovieData | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedMovie: null,
  setSelectedMovie: (movie) => set({ selectedMovie: movie }),
}));
