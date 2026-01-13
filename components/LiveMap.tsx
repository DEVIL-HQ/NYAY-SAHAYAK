import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, Tooltip } from 'react-leaflet';
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
    className: 'custom-div-icon',
    html: `
        <div class="marker-pin-outer bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]">
            <div class="marker-pin-inner bg-white">
                <span style="font-size: 14px;">👮</span>
            </div>
            <div class="marker-arrow border-t-blue-600"></div>
        </div>
    `,
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -40]
});

const HospitalIcon = new L.DivIcon({
    className: 'custom-div-icon',
    html: `
        <div class="marker-pin-outer bg-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.4)]">
            <div class="marker-pin-inner bg-white">
                <span style="font-size: 14px;">🏥</span>
            </div>
            <div class="marker-arrow border-t-emerald-600"></div>
        </div>
    `,
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -40]
});

interface POI {
    lat: number;
    lon: number;
    name: string;
    type: 'police' | 'hospital';
}

function MapController({ center, selectedPoi, userPos }: { center: [number, number], selectedPoi: POI | null, userPos: [number, number] }) {
    const map = useMap();

    useEffect(() => {
        // Fix for gray area - force recalculate of map container size
        setTimeout(() => {
            map.invalidateSize();
        }, 300);
    }, [map]);

    useEffect(() => {
        if (selectedPoi) {
            map.flyTo([selectedPoi.lat, selectedPoi.lon], 15);
        } else {
            map.flyTo(center, 14);
        }
    }, [center, selectedPoi, map]);

    return null;
}

const LiveMap: React.FC<{ onLocationFound?: (lat: number, lng: number) => void }> = ({ onLocationFound }) => {
    const [position, setPosition] = useState<[number, number] | null>(null);
    const [pois, setPois] = useState<POI[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPoi, setSelectedPoi] = useState<POI | null>(null);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords;
                    setPosition([latitude, longitude]);
                    if (onLocationFound) onLocationFound(latitude, longitude);
                    fetchNearbyPOIs(latitude, longitude);
                    setLoading(false);
                },
                (err) => {
                    console.error("Geolocation error:", err);
                    setLoading(false);
                    const fallback: [number, number] = [28.6139, 77.2090];
                    setPosition(fallback);
                    fetchNearbyPOIs(fallback[0], fallback[1]);
                }
            );
        } else {
            console.error("Geolocation not supported");
            setLoading(false);
            const fallback: [number, number] = [28.6139, 77.2090];
            setPosition(fallback);
            fetchNearbyPOIs(fallback[0], fallback[1]);
        }
    }, []);

    const fetchNearbyPOIs = async (lat: number, lon: number) => {
        // Overpass API query for hospitals and police stations within 3km
        const query = `
            [out:json][timeout:30];
            (
              node["amenity"~"police|hospital|clinic|doctors|dentist|pharmacy"](around:10000,${lat},${lon});
              way["amenity"~"police|hospital|clinic|doctors|dentist|pharmacy"](around:10000,${lat},${lon});
              relation["amenity"~"police|hospital|clinic|doctors|dentist|pharmacy"](around:10000,${lat},${lon});
              node["healthcare"~"hospital|clinic|centre|health_post"](around:10000,${lat},${lon});
              way["healthcare"~"hospital|clinic|centre|health_post"](around:10000,${lat},${lon});
              node["emergency"~"yes"](around:10000,${lat},${lon});
            );
            out center;
        `;
        const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

        try {
            const response = await fetch(url);
            const data = await response.json();
            const newPois: POI[] = data.elements.map((el: any) => {
                const isArea = el.type !== 'node';
                return {
                    lat: isArea ? el.center.lat : el.lat,
                    lon: isArea ? el.center.lon : el.lon,
                    name: el.tags.name || (el.tags.amenity === 'police' ? 'Police Station' : 'Hospital'),
                    type: el.tags.amenity
                };
            });
            setPois(newPois);
        } catch (error) {
            console.error("Error fetching POIs:", error);
        }
    };

    if (loading) {
        return <div className="h-full w-full min-h-[400px] bg-slate-100 flex items-center justify-center rounded-2xl animate-pulse"><span className="text-slate-400 font-bold uppercase tracking-widest">Locating...</span></div>;
    }

    if (!position) return null;

    return (
        <div className="h-full w-full rounded-2xl overflow-hidden shadow-inner border border-slate-200 relative z-0 flex flex-col">
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
                .marker-pin-outer {
                    width: 30px;
                    height: 30px;
                    border-radius: 50% 50% 50% 0;
                    transform: rotate(-45deg);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                }
                .marker-pin-inner {
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    transform: rotate(45deg);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .marker-arrow {
                    position: absolute;
                    bottom: -8px;
                    left: 0;
                    width: 0;
                    height: 0;
                    border-left: 15px solid transparent;
                    border-right: 15px solid transparent;
                    border-top: 15px solid;
                    transform: rotate(45deg);
                    transform-origin: top left;
                }
            `}</style>
            <div className="absolute inset-0 z-0 bg-slate-200">
                <MapContainer center={position} zoom={13} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                    <MapController center={position} selectedPoi={selectedPoi} userPos={position} />
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={position} icon={UserIcon} eventHandlers={{ click: () => setSelectedPoi(null) }}>
                        <Popup>You are here</Popup>
                    </Marker>

                    {pois.map((poi, idx) => (
                        <Marker
                            key={idx}
                            position={[poi.lat, poi.lon]}
                            icon={poi.type === 'police' ? PoliceIcon : HospitalIcon}
                            eventHandlers={{
                                click: () => setSelectedPoi(poi)
                            }}
                        >
                            <Tooltip permanent direction="top" offset={[0, -40]} className="bg-white/90 border-0 shadow-lg rounded-full px-3 py-1 text-[10px] font-black uppercase text-slate-800 backdrop-blur-sm ring-1 ring-black/5">
                                {poi.name}
                            </Tooltip>
                            <Popup>
                                <div className="p-1">
                                    <div className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">
                                        {poi.type === 'police' ? '🚔 Police Station' : '🏥 Medical Center'}
                                    </div>
                                    <div className="text-sm font-black text-slate-900 leading-tight mb-2">
                                        {poi.name}
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${poi.lat},${poi.lon}`)}
                                            className="text-[10px] font-bold bg-blue-600 text-white px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 hover:bg-blue-700 transition-colors"
                                        >
                                            🚀 Open in Navigation
                                        </button>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    ))}

                    {selectedPoi && (
                        <Polyline
                            positions={[position, [selectedPoi.lat, selectedPoi.lon]]}
                            pathOptions={{
                                color: '#3b82f6',
                                weight: 6,
                                dashArray: '12, 12',
                                lineCap: 'round',
                                opacity: 0.8,
                                shadowColor: '#3b82f6',
                                shadowBlur: 15
                            } as any}
                        />
                    )}
                </MapContainer>
            </div>

            <button
                onClick={() => position && fetchNearbyPOIs(position[0], position[1])}
                className="absolute top-2 right-2 bg-white/90 p-2 rounded-lg text-slate-600 hover:text-blue-600 transition-colors shadow-sm z-[400] backdrop-blur-sm border border-slate-200 flex items-center gap-2"
                title="Refresh Markers"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3" /></svg>
                {pois.length > 0 && <span className="text-[8px] font-black bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">{pois.length} FOUND</span>}
            </button>
        </div>
    );
};

export default LiveMap;
