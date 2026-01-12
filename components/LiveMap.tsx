import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default Leaflet markers in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icons
const UserIcon = new L.DivIcon({
    className: 'bg-transparent',
    html: '<div style="background-color: #2563eb; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(37,99,235,0.5);"></div><div style="background-color: #2563eb; opacity: 0.2; width: 60px; height: 60px; border-radius: 50%; position: absolute; top: -18px; left: -18px; animation: pulse 2s infinite;"></div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
});

const PoliceIcon = new L.DivIcon({
    className: 'bg-transparent',
    html: '<div style="font-size: 24px;">👮</div>',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

const HospitalIcon = new L.DivIcon({
    className: 'bg-transparent',
    html: '<div style="font-size: 24px;">🏥</div>',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

interface POI {
    lat: number;
    lon: number;
    name: string;
    type: 'police' | 'hospital';
}

function ChangeView({ center }: { center: [number, number] }) {
    const map = useMap();
    map.flyTo(center, 14);
    return null;
}

const LiveMap: React.FC<{ onLocationFound?: (lat: number, lng: number) => void }> = ({ onLocationFound }) => {
    const [position, setPosition] = useState<[number, number] | null>(null);
    const [pois, setPois] = useState<POI[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords;
                    setPosition([latitude, longitude]);
                    if (onLocationFound) onLocationFound(latitude, longitude); // Callback to parent
                    fetchNearbyPOIs(latitude, longitude);
                    setLoading(false);
                },
                (err) => {
                    console.error("Geolocation error:", err);
                    setLoading(false);
                    // Fallback to New Delhi for demo if blocked
                    const fallback: [number, number] = [28.6139, 77.2090];
                    setPosition(fallback);
                    fetchNearbyPOIs(fallback[0], fallback[1]);
                }
            );
        }
    }, []);

    const fetchNearbyPOIs = async (lat: number, lon: number) => {
        // Overpass API query for hospitals and police stations within 3km
        const query = `
            [out:json];
            (
              node["amenity"="police"](around:3000,${lat},${lon});
              node["amenity"="hospital"](around:3000,${lat},${lon});
            );
            out body;
        `;
        const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

        try {
            const response = await fetch(url);
            const data = await response.json();
            const newPois: POI[] = data.elements.map((el: any) => ({
                lat: el.lat,
                lon: el.lon,
                name: el.tags.name || (el.tags.amenity === 'police' ? 'Police Station' : 'Hospital'),
                type: el.tags.amenity
            }));
            setPois(newPois);
        } catch (error) {
            console.error("Error fetching POIs:", error);
        }
    };

    if (loading) {
        return <div className="h-64 w-full bg-slate-100 flex items-center justify-center rounded-2xl animate-pulse"><span className="text-slate-400 font-bold uppercase tracking-widest">Locating...</span></div>;
    }

    if (!position) return null;

    return (
        <div className="h-64 w-full rounded-2xl overflow-hidden shadow-inner border border-slate-200 relative z-0">
            <style>{`
                @keyframes pulse {
                    0% { transform: scale(0.5); opacity: 0; }
                    50% { opacity: 0.2; }
                    100% { transform: scale(1.2); opacity: 0; }
                }
                .leaflet-container {
                    width: 100%;
                    height: 100%;
                    z-index: 0;
                }
            `}</style>
            <MapContainer center={position} zoom={13} scrollWheelZoom={false}>
                <ChangeView center={position} />
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={position} icon={UserIcon}>
                    <Popup>You are here</Popup>
                </Marker>

                {pois.map((poi, idx) => (
                    <Marker key={idx} position={[poi.lat, poi.lon]} icon={poi.type === 'police' ? PoliceIcon : HospitalIcon}>
                        <Popup>
                            <div className="text-xs font-bold">
                                <div className="uppercase text-slate-500 mb-1">{poi.type}</div>
                                {poi.name}
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            <div className="absolute bottom-2 right-2 bg-white/90 p-2 rounded-lg text-[10px] font-bold shadow-sm z-[400] backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    <span>👮 Police</span>
                    <span>🏥 Hospital</span>
                </div>
            </div>
        </div>
    );
};

export default LiveMap;
