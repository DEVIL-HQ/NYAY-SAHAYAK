import React from 'react';
import { TRANSLATIONS, HELPLINES } from '../constants';
import { Language } from '../types';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface DisplayBoardProps {
  language: Language;
}

const DisplayBoard: React.FC<DisplayBoardProps> = ({ language }) => {
  const t = TRANSLATIONS[language].emergency;

  // Mock location for Jaipur (centered based on previous context)
  const centerPosition: [number, number] = [26.9124, 75.7873];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-2">
          <h2 className="text-xl font-black text-red-600 uppercase tracking-tight">
            {t.modal_title}
          </h2>
          <button
            className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
            onClick={() => window.history.back()} // Simple back navigation or use a prop to close
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Map Section */}
        <div className="px-6 py-2">
          <div className="w-full h-48 rounded-[1.5rem] overflow-hidden shadow-inner border border-slate-200 relative z-0">
            <MapContainer center={centerPosition} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={centerPosition}>
                <Popup>
                  You are here.
                </Popup>
              </Marker>
              {/* Mock User Location Marker Style */}
              <div className="leaflet-bottom leaflet-right m-2">
                <div className="bg-white px-3 py-1 rounded-lg shadow text-[10px] font-bold text-slate-600">
                  📍 Jaipur, Rajasthan
                </div>
              </div>
            </MapContainer>
          </div>
        </div>

        {/* SOS Button Section */}
        <div className="px-6 py-6 flex flex-col items-center justify-center space-y-4">
          <div className="relative group cursor-pointer">
            <div className="absolute inset-0 bg-red-100 rounded-[2rem] animate-ping opacity-75"></div>
            <div className="relative bg-white border border-slate-100 rounded-[2rem] p-8 shadow-xl w-64 flex flex-col items-center space-y-3 z-10 hover:scale-105 transition-transform">
              <div className="text-4xl animate-bounce">🚨</div>
              <div className="text-center">
                <h3 className="text-lg font-black text-slate-900 uppercase leading-none tracking-tight">
                  {t.btn_call_police}
                </h3>
                <span className="text-[10px] font-bold text-white bg-red-400 px-2 py-0.5 rounded-full mt-2 inline-block">
                  GPS: Jaipur
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Helpline Grid */}
        <div className="bg-slate-50 flex-1 p-6 rounded-t-[2.5rem] border-t border-slate-100 overflow-y-auto">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-4 px-2">
            {t.helpline_title}
          </h4>

          <div className="grid grid-cols-2 gap-3">
            {HELPLINES.map((helpline) => (
              <a
                key={helpline.id}
                href={`tel:${helpline.number}`} // Make it clickable
                className="flex items-center p-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-black hover:shadow-md transition-all group"
              >
                <span className="text-2xl mr-3 group-hover:scale-110 transition-transform">{helpline.icon}</span>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase leading-tight group-hover:text-black transition-colors">
                    {t.helplines[helpline.id as keyof typeof t.helplines]}
                  </span>
                  <span className="text-sm font-black text-slate-900 leading-none">
                    {helpline.number}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default DisplayBoard;
