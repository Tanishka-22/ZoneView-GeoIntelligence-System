import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons — bundlers break Leaflet's default icon paths
const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface MapLocation {
  id: string;
  name: string;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
}

export function IndiaLocationsMap({ locations }: { locations: MapLocation[] }) {
  const navigate = useNavigate();

  const validLocations = locations.filter(
    (l) => l.latitude != null && l.longitude != null,
  );

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200" style={{ height: 420 }}>
      <MapContainer
        center={[22.9734, 78.6569]} // geographic center of India
        zoom={5}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {validLocations.map((loc) => (
          <Marker
            key={loc.id}
            position={[loc.latitude!, loc.longitude!]}
            icon={markerIcon}
            eventHandlers={{
              click: () => navigate(`/locations/${loc.id}`),
            }}
          >
            <Popup>
              <div className="text-sm font-semibold">{loc.name}</div>
              <div className="text-xs text-gray-500 mb-1">{loc.state}</div>
              <button
                onClick={() => navigate(`/locations/${loc.id}`)}
                className="text-xs text-blue-600 font-medium"
              >
                View details →
              </button>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}