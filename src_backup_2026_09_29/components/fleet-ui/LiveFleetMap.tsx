import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface FleetMapDrone {
  id: string;
  model?: string;
  status: string;
  battery?: number;
  current_city?: string;
  lat?: number;
  lng?: number;
  assigned_order?: string | null;
}

const STATUS_DOT_COLOR: Record<string, string> = {
  idle: '#059669',
  'en-route': '#2563eb',
  assigned: '#4f46e5',
  charging: '#d97706',
  'on-hold': '#d97706',
  maintenance: '#ea580c',
  returning: '#2563eb',
  offline: '#94a3b8',
};

function droneIcon(status: string, hasOrder: boolean) {
  const color = STATUS_DOT_COLOR[status] || '#94a3b8';
  const html = `
    <div style="position:relative;width:18px;height:18px;">
      ${hasOrder ? `<span style="position:absolute;inset:-6px;border-radius:9999px;background:${color}22;"></span>` : ''}
      <span style="position:absolute;inset:0;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(15,23,42,0.35);"></span>
    </div>`;
  return L.divIcon({ html, className: '', iconSize: [18, 18], iconAnchor: [9, 9] });
}

/** Keeps the map framed on the current fleet without fighting user pan/zoom on every poll. */
const FitOnce: React.FC<{ points: [number, number][] }> = ({ points }) => {
  const map = useMap();
  const fitted = React.useRef(false);
  React.useEffect(() => {
    if (fitted.current || points.length === 0) return;
    fitted.current = true;
    if (points.length === 1) {
      map.setView(points[0], 13);
    } else {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
    }
  }, [points, map]);
  return null;
};

interface LiveFleetMapProps {
  fleet: FleetMapDrone[];
  onSelect?: (drone: FleetMapDrone) => void;
  heightClassName?: string;
}

export const LiveFleetMap: React.FC<LiveFleetMapProps> = ({ fleet, onSelect, heightClassName = 'h-[420px] lg:h-[560px]' }) => {
  const located = useMemo(() => fleet.filter(d => typeof d.lat === 'number' && typeof d.lng === 'number'), [fleet]);
  const points = useMemo<[number, number][]>(() => located.map(d => [d.lat as number, d.lng as number]), [located]);
  const center: [number, number] = points[0] || [28.5355, 77.391]; // Noida fallback, real fleet hub city

  if (located.length === 0) {
    return (
      <div className={`if-card if-map-wrap flex items-center justify-center text-center px-6 ${heightClassName}`}>
        <p className="text-xs text-[var(--if-muted)]">No live position telemetry available for the current fleet.</p>
      </div>
    );
  }

  return (
    <div className={`if-card if-map-wrap overflow-hidden ${heightClassName}`}>
      <MapContainer center={center} zoom={12} scrollWheelZoom style={{ width: '100%', height: '100%' }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitOnce points={points} />
        {located.map(d => (
          <Marker
            key={d.id}
            position={[d.lat as number, d.lng as number]}
            icon={droneIcon(d.status, Boolean(d.assigned_order))}
            eventHandlers={{ click: () => onSelect?.(d) }}
          >
            <Popup>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, minWidth: 140 }}>
                <div style={{ fontWeight: 700 }}>{d.id}</div>
                <div style={{ color: '#64748b' }}>{d.model}</div>
                <div style={{ marginTop: 4, textTransform: 'capitalize' }}>{d.status.replace(/-/g, ' ')}</div>
                {typeof d.battery === 'number' && <div>Battery: {d.battery}%</div>}
                {d.current_city && <div>{d.current_city}</div>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default LiveFleetMap;
