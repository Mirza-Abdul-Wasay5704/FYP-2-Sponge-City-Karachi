import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

/* Auto-fit map bounds when patches arrive */
function FitBounds({ patches }) {
  const map = useMap();
  useEffect(() => {
    if (patches?.length) {
      const coords = patches.flatMap(p => p.corners.map(c => [c[0], c[1]]));
      map.fitBounds(L.latLngBounds(coords), { padding: [30, 30] });
    }
  }, [patches, map]);
  return null;
}

export default function TwiAnalysisTab({ district, twiData, setTwiData, onProceed }) {
  const [patches, setPatches] = useState(9);
  const [radius, setRadius] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showConfig, setShowConfig] = useState(false);

  async function handleAnalyze() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/twi-points?patches=${patches}&radius=${radius}`);
      if (!res.ok) throw new Error((await res.json()).error || res.statusText);
      setTwiData(await res.json());
    } catch (e) { 
      setError(e.message); 
    }
    setLoading(false);
  }

  return (
    <div className="flex h-full text-white">
      {/* Left Sidebar: Controls & Stats */}
      <div className="w-1/3 min-w-[320px] max-w-sm bg-gray-900 border-r border-gray-800 flex flex-col shadow-xl z-10 relative">
        <div className="p-6 border-b border-gray-800">
          <h2 
            className="text-xl font-bold mb-1 cursor-pointer select-none" 
            onDoubleClick={() => setShowConfig(prev => !prev)}
            title="Double-click to toggle advanced configuration"
          >
            TWI Analysis
          </h2>
          <p className="text-sm text-gray-300 mb-6">Identify top flood-prone locations based on Topographic Wetness Index.</p>
          
          <div className="space-y-4">
            {showConfig && (
              <>
                <div>
                  <label className="block text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">Number of Patches</label>
                  <input type="number" min={1} max={100} value={patches}
                    onChange={e => setPatches(Math.max(1, +e.target.value))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"/>
                </div>
                <div>
                  <label className="block text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">Min Distance (km)</label>
                  <input type="number" min={0} step={0.1} value={radius}
                    onChange={e => setRadius(Math.max(0, +e.target.value))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"/>
                </div>
              </>
            )}
            
            <button onClick={handleAnalyze} disabled={loading}
              className="w-full mt-2 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-lg font-semibold text-white shadow-lg disabled:opacity-50 transition-all flex justify-center items-center">
              {loading ? (
                 <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                 </svg>
              ) : 'Run TWI Analysis'}
            </button>
            {error && <p className="text-red-400 text-sm mt-2 p-2 bg-red-900/40 rounded-lg border border-red-500/50">{error}</p>}
          </div>
        </div>

        {/* Stats Section (Appears after analysis) */}
        {twiData && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            
            <div>
               <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-300 mb-3">Overall TWI Stats</h3>
               <div className="grid grid-cols-2 gap-3">
                 {Object.entries(twiData.twiStats).map(([k, v]) => (
                   <div key={k} className="bg-gray-800 rounded-lg p-3 border border-gray-700/50">
                     <span className="text-gray-400 text-[11px] uppercase block mb-1">{k}</span>
                     <span className="text-white font-mono font-bold text-lg">{v}</span>
                   </div>
                 ))}
               </div>
            </div>

            <div>
               <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-300 mb-3 flex justify-between items-center">
                 Identified Hotspots
                 <span className="bg-red-500/20 text-red-400 text-xs px-2 py-1 rounded-md">{twiData.points.length} locations</span>
               </h3>
               
               <div className="space-y-2">
                 {twiData.points.map((pt, idx) => (
                   <div key={pt.patch} className="bg-gray-800 rounded-lg p-3 border border-gray-700/50 flex justify-between items-center group hover:bg-gray-700 transition-colors">
                     <div>
                       <div className="font-bold text-gray-200">Spot {idx + 1}</div>
                       <div className="text-[11px] text-gray-400 font-mono mt-0.5">{pt.lat.toFixed(4)}, {pt.lon.toFixed(4)}</div>
                     </div>
                     <div className="text-right">
                       <div className="text-xs text-gray-400 uppercase">Max TWI</div>
                       <div className="text-red-400 font-mono font-bold">{pt.max_twi}</div>
                     </div>
                   </div>
                 ))}
               </div>
            </div>

            <button onClick={onProceed}
              className="w-full py-3 mt-6 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 rounded-lg font-bold text-white shadow-lg shadow-red-500/20 transition-all flex justify-center items-center group">
              Proceed to Detection
              <svg className="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>

          </div>
        )}
      </div>

      {/* Right Content: Map */}
      <div className="flex-1 relative bg-gray-950">
        {twiData ? (
          <MapContainer center={[24.84, 67.14]} zoom={12} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="&copy; Esri"
            />
            <FitBounds patches={twiData.patches}/>
            {twiData.patches.map(p => (
              <Polygon key={p.id}
                positions={p.corners.map(c => [c[0], c[1]])}
                pathOptions={{ color: '#3b82f6', weight: 2, fill: true, fillOpacity: 0.1 }}/>
            ))}
            {twiData.points.map((pt, idx) => (
              <CircleMarker key={pt.patch}
                center={[pt.lat, pt.lon]}
                radius={8}
                pathOptions={{ fillColor: '#ef4444', fillOpacity: 0.9, color: '#fff', weight: 2 }}>
                <Popup>
                  <div className="text-sm">
                    <strong>Spot {idx + 1}</strong><br/>
                    Max TWI: {pt.max_twi}<br/>
                    {pt.lat.toFixed(6)}, {pt.lon.toFixed(6)}
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center text-gray-500">
            <svg className="w-24 h-24 mb-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <p className="text-xl text-gray-300">Waiting for TWI Configuration...</p>
            <p className="text-sm mt-2 text-gray-400">Adjust parameters on the left and run analysis to populate map.</p>
          </div>
        )}
      </div>
    </div>
  );
}
