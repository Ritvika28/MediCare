import { LeafletMap } from './maps/LeafletMap';

export function NearbyHospitalMap({ userLat, userLng, hospitals = [] }) {
  return (
    <LeafletMap 
      userLat={userLat} 
      userLng={userLng} 
      items={hospitals} 
      category="hospital" 
    />
  );
}

