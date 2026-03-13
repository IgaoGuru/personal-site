import PlacesGrid from './PlacesGrid';
import { gridObjects } from '../data/places';

interface PlacesPageProps {
  isDev?: boolean;
}

export default function PlacesPage({ isDev = false }: PlacesPageProps) {
  return (
    <PlacesGrid 
      initialObjects={gridObjects} 
      isDev={isDev}
    />
  );
}
