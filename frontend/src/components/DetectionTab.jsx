import React, { useState, useMemo, useEffect } from 'react';

const LULC_HEX = {
  road:       '#a020f0',
  land:       '#8b4513',
  park:       '#00c800',
  vegetation: '#009600',
  river:      '#0000ff',
  water:      '#00bfff',
};

const DRAINAGE_COLORS = {
  'Excellent':     { color: '#22c55e', bg: 'bg-green-500/20',  border: 'border-green-500/30' },
  'Good':          { color: '#4ade80', bg: 'bg-green-400/20',  border: 'border-green-400/30' },
  'Moderate-Good': { color: '#a3e635', bg: 'bg-lime-400/20',   border: 'border-lime-400/30' },
  'Moderate':      { color: '#facc15', bg: 'bg-yellow-400/20', border: 'border-yellow-400/30' },
  'Moderate-Poor': { color: '#fb923c', bg: 'bg-orange-400/20', border: 'border-orange-400/30' },
  'Poor':          { color: '#f87171', bg: 'bg-red-400/20',    border: 'border-red-400/30' },
  'Very Poor':     { color: '#ef4444', bg: 'bg-red-500/20',    border: 'border-red-500/30' },
};

export default function DetectionTab({ twiData, onBack, detections, setDetections, selectedPatch, setSelectedPatch }) {
  const [detecting, setDetecting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const pts = twiData?.points || [];
  const allDetected = pts.length > 0 && Object.keys(detections).length === pts.length;

  useEffect(() => {
    // If we have detections and no selected patch, select the first one.
    if (Object.keys(detections).length > 0 && !selectedPatch) {
      setSelectedPatch(pts[0]?.patch);
    }
  }, [detections, selectedPatch, pts]);

  async function handleDetectAll(resetData = false) {
    if (!twiData) return;
    setDetecting(true);
    setProgress({ done: 0, total: pts.length });
    
    let newDetections = resetData ? {} : { ...detections };

    for (let i = 0; i < pts.length; i++) {
      const pt = pts[i];
      // Skip if already detected successfully
      if (newDetections[pt.patch] && !newDetections[pt.patch].error) {
        setProgress({ done: i + 1, total: pts.length });
        continue;
      }

      try {
        const res = await fetch('/api/detect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pt),
        });
        const result = await res.json();
        newDetections[pt.patch] = result;
        setDetections({ ...newDetections });
      } catch (e) {
        newDetections[pt.patch] = { error: e.message };
        setDetections({ ...newDetections });
      }
      setProgress({ done: i + 1, total: pts.length });
    }
    setDetecting(false);
    if (pts.length > 0 && (!selectedPatch || resetData)) {
      setSelectedPatch(pts[0].patch);
    }
  }

  async function handleRerun() {
    try {
      // Clear cache on the backend
      await fetch('/api/clear-cache', { method: 'POST' });
      // Reset local state
      setDetections({});
      // Start detection again with empty detections
      handleDetectAll(true);
    } catch (e) {
      console.error('Failed to rerun detection:', e);
    }
  }

  const aggregate = useMemo(() => {
    const vals = Object.values(detections).filter(d => !d.error);
    if (!vals.length) return null;
    const totalBld = vals.reduce((s, d) => s + (d.buildings || 0), 0);
    const lulcAgg = {};
    vals.forEach(d => {
      Object.entries(d.lulc || {}).forEach(([cls, v]) => {
        if (!lulcAgg[cls]) lulcAgg[cls] = { total: 0, count: 0 };
        lulcAgg[cls].total += v.area_pct;
        lulcAgg[cls].count += 1;
      });
    });
    const lulcAvg = {};
    Object.entries(lulcAgg).forEach(([cls, v]) => {
      lulcAvg[cls] = Math.round(v.total / v.count * 100) / 100;
    });
    return { totalBuildings: totalBld, avgBuildings: Math.round(totalBld / vals.length), lulcAvg, pointsProcessed: vals.length };
  }, [detections]);

  if (!twiData) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-gray-500 animate-fadeIn">
        <svg className="w-24 h-24 mb-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xl">No TWI data available.</p>
        <p className="text-sm mt-2">Please go back to the TWI Analysis tab and run an analysis first.</p>
        <button onClick={onBack} className="mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
          Go to TWI Analysis
        </button>
      </div>
    );
  }

  const selectedDet = selectedPatch ? detections[selectedPatch] : null;
  const currentPt = pts.find(p => p.patch === selectedPatch);

  return (
    <div className="flex flex-col h-full text-white bg-gray-950">
      
      {/* Top Header: Actions & Aggregate Stats */}
      <div className="bg-gray-900 border-b border-gray-800 p-6 flex-shrink-0 z-10 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold">Detection Pipeline</h2>
            <p className="text-sm text-gray-300">YOLO Building Detection & Roboflow LULC</p>
          </div>
        <div className="flex items-center gap-3">
          <button onClick={handleDetectAll} disabled={detecting}
            className={`px-6 py-2.5 rounded-lg font-bold shadow-lg transition-all flex items-center ${
              allDetected && !detecting ? 'bg-green-600/30 text-green-400 border border-green-500/50' : 
              'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white'
            }`}>
            {detecting ? `Detecting ${progress.done} / ${progress.total}...` : allDetected ? '✓ Detection Complete' : 'Run Detection on All Spots'}
          </button>
          {allDetected && (
            <button onClick={handleRerun} disabled={detecting}
              className="px-4 py-2.5 rounded-lg font-semibold text-sm bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-200 transition-all flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Re-run (Clear Cache)
            </button>
          )}
        </div>
        </div>

        {detecting && (
          <div className="w-full bg-gray-800 rounded-full h-1.5 mb-4 overflow-hidden border border-gray-700">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(249,115,22,0.8)]"
              style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}/>
          </div>
        )}

        {aggregate && (
          <div className="flex flex-wrap gap-4 mt-2 animate-fadeIn">
            <div className="bg-gray-800/80 rounded-lg px-4 py-3 border border-gray-700 flex-1 min-w-[150px]">
              <span className="text-gray-400 text-[11px] uppercase block mb-1">Total Buildings</span>
              <span className="text-2xl font-bold text-orange-400">{aggregate.totalBuildings}</span>
            </div>
            <div className="bg-gray-800/80 rounded-lg px-4 py-3 border border-gray-700 flex-1 min-w-[150px]">
              <span className="text-gray-400 text-[11px] uppercase block mb-1">Avg Bld/Spot</span>
              <span className="text-2xl font-bold text-orange-300">{aggregate.avgBuildings}</span>
            </div>
            {Object.entries(aggregate.lulcAvg).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([cls, pct]) => (
              <div key={cls} className="bg-gray-800/80 rounded-lg px-4 py-3 border border-gray-700 flex-1 min-w-[150px]">
                <span className="text-gray-400 text-[11px] uppercase block mb-1">Avg {cls}</span>
                <span className="text-2xl font-bold" style={{ color: LULC_HEX[cls] || '#888' }}>{pct}%</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Side: Spot List */}
        <div className="w-72 bg-gray-900 overflow-y-auto border-r border-gray-800 custom-scrollbar z-0 relative shadow-2xl">
          <div className="p-4 grid gap-2">
            {pts.map((pt, idx) => {
              const det = detections[pt.patch];
              const isSelected = selectedPatch === pt.patch;
              
              return (
                <button 
                  key={pt.patch}
                  onClick={() => setSelectedPatch(pt.patch)}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                    isSelected 
                      ? 'bg-blue-600/10 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                      : 'bg-gray-800 border-gray-700 hover:border-gray-500 hover:bg-gray-700/50'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className={`font-bold ${isSelected ? 'text-blue-400' : 'text-gray-200'}`}>Spot {idx + 1}</span>
                    <span className="text-xs text-red-400 font-mono">TWI: {pt.max_twi}</span>
                  </div>
                  
                  {det ? (
                    det.error ? (
                      <span className="text-xs text-red-500">Error rendering</span>
                    ) : (
                      <div className="text-xs text-gray-400 font-mono flex items-center gap-2">
                        <span className="flex items-center text-orange-400"><span className="text-[10px] mr-1">🏢</span>{det.buildings}</span>
                        <span className="text-gray-600">|</span>
                        <span>{Object.keys(det.lulc || {}).length} zones</span>
                      </div>
                    )
                  ) : (
                    <span className="text-[11px] text-gray-400 italic">Pending...</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Focus View */}
        <div className="flex-1 bg-[#050510] relative overflow-y-auto custom-scrollbar p-6">
          {!selectedPatch ? (
            <div className="flex items-center justify-center h-full text-gray-600">
              Select a spot from the list to view details
            </div>
          ) : !selectedDet ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 animate-pulse">
               <div className="w-16 h-16 border-4 border-gray-700 border-t-orange-500 rounded-full animate-spin mb-4"></div>
               <p>Awaiting detection for Spot {pts.findIndex(p => p.patch === selectedPatch) + 1}</p>
            </div>
          ) : selectedDet.error ? (
            <div className="flex items-center justify-center h-full text-red-400 p-8 text-center bg-red-900/20 border border-red-500/30 rounded-xl m-6">
               <p>{selectedDet.error}</p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
               
               {/* Annotated Image */}
               <div className="bg-gray-900 rounded-2xl border border-gray-800 p-2 shadow-2xl">
                 {(selectedDet.image_path || selectedDet.image) && (
                   <img src={selectedDet.image_path || `data:image/jpeg;base64,${selectedDet.image}`} alt={`Detection for patch ${selectedPatch}`} className="w-full rounded-xl object-contain"/>
                 )}
               </div>

               {/* Details Grid */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Building Information */}
                  <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 shadow-xl">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-300 mb-4 flex items-center">
                      <span className="mr-2">🏢</span> Infrastructure Detect
                    </h3>
                    <div className="flex items-end gap-3 mb-4">
                      <span className="text-5xl font-bold text-orange-400">{selectedDet.buildings}</span>
                      <span className="text-sm text-gray-300 mb-1">buildings found</span>
                    </div>
                    {selectedDet.building_stats && (
                      <div className="bg-gray-800 rounded-lg p-4 text-sm font-mono text-gray-300">
                        <div className="flex justify-between mb-2"><span>Total Footprint:</span> <span className="text-white">{selectedDet.building_stats.total_footprint_pct}%</span></div>
                        <div className="flex justify-between mb-2"><span>Avg Area:</span> <span className="text-white">{selectedDet.building_stats.avg_area_pct}%</span></div>
                        <div className="flex justify-between"><span>Largest BLD:</span> <span className="text-white">{selectedDet.building_stats.largest_pct}%</span></div>
                      </div>
                    )}
                    {selectedDet.building_error && (
                      <p className="text-xs text-yellow-500 mt-2">{selectedDet.building_error}</p>
                    )}
                  </div>

                  {/* LULC Information */}
                  <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 shadow-xl">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-300 mb-4 flex items-center">
                      <span className="mr-2">🌍</span> Land Use & Cover
                    </h3>
                    
                    {Object.keys(selectedDet.lulc || {}).length > 0 ? (
                      <div className="space-y-4">
                        {Object.entries(selectedDet.lulc).sort((a,b) => b[1].area_pct - a[1].area_pct).map(([cls, v]) => (
                          <div key={cls}>
                            <div className="flex justify-between text-sm mb-1.5">
                              <span className="capitalize font-medium text-gray-200">{cls} <span className="text-gray-400 text-xs ml-1">({v.segments} areas)</span></span>
                              <span className="font-mono text-white">{v.area_pct}%</span>
                            </div>
                            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-1000" style={{
                                width: `${Math.min(v.area_pct, 100)}%`,
                                backgroundColor: LULC_HEX[cls] || '#888',
                              }}/>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : selectedDet.lulc_error ? (
                      <p className="text-xs text-yellow-500">{selectedDet.lulc_error}</p>
                    ) : (
                      <p className="text-gray-500 text-sm">No land cover data available.</p>
                    )}
                  </div>

               </div>

                  {/* Soil Classification */}
                  {selectedDet.soil && (
                    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 shadow-xl md:col-span-2">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-300 mb-5 flex items-center">
                        <span className="mr-2">🪨</span> Soil Classification & Infiltration
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {/* Primary Soil Type */}
                        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                          <div className="text-xs text-gray-400 uppercase mb-2">Primary Soil Type</div>
                          <div className="text-2xl font-bold text-amber-400 mb-1">{selectedDet.soil.primary_class}</div>
                          <p className="text-sm text-gray-300">{selectedDet.soil.description}</p>
                        </div>
                        
                        {/* Infiltration Rate Gauge */}
                        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                          <div className="text-xs text-gray-400 uppercase mb-2">Infiltration Rate</div>
                          <div className="flex items-end gap-2 mb-3">
                            <span className="text-3xl font-bold text-cyan-400">{selectedDet.soil.infiltration_avg}</span>
                            <span className="text-sm text-gray-400 mb-1">mm/hr</span>
                          </div>
                          {/* Visual gauge bar */}
                          <div className="relative h-3 bg-gray-700 rounded-full overflow-hidden">
                            <div className="absolute inset-0 flex">
                              <div className="h-full bg-red-500" style={{width: '8%'}}></div>
                              <div className="h-full bg-orange-500" style={{width: '12%'}}></div>
                              <div className="h-full bg-yellow-400" style={{width: '20%'}}></div>
                              <div className="h-full bg-green-400" style={{width: '25%'}}></div>
                              <div className="h-full bg-cyan-400" style={{width: '35%'}}></div>
                            </div>
                            {/* Marker for current value */}
                            <div className="absolute top-0 h-full w-0.5 bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]" 
                              style={{left: `${Math.min((selectedDet.soil.infiltration_avg / 50) * 100, 100)}%`}}></div>
                          </div>
                          <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                            <span>0</span><span>Low</span><span>Moderate</span><span>High</span><span>50+</span>
                          </div>
                          <div className="text-xs text-gray-400 mt-2 font-mono">
                            Range: {selectedDet.soil.infiltration_min} – {selectedDet.soil.infiltration_max} mm/hr
                          </div>
                        </div>

                        {/* Drainage Rating */}
                        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                          <div className="text-xs text-gray-400 uppercase mb-2">Drainage Rating</div>
                          {(() => {
                            const d = DRAINAGE_COLORS[selectedDet.soil.drainage] || DRAINAGE_COLORS['Moderate'];
                            return (
                              <>
                                <div className={`inline-block px-3 py-1.5 rounded-lg text-sm font-bold mb-3 ${d.bg} ${d.border} border`}
                                  style={{color: d.color}}
                                >
                                  {selectedDet.soil.drainage}
                                </div>
                                <div className="text-sm text-gray-300">
                                  {selectedDet.soil.drainage === 'Very Poor' || selectedDet.soil.drainage === 'Poor'
                                    ? '⚠️ High flood risk — soil absorbs very little rainwater'
                                    : selectedDet.soil.drainage === 'Moderate' || selectedDet.soil.drainage === 'Moderate-Poor'
                                    ? '⚡ Moderate flood risk — limited absorption capacity'
                                    : '✅ Lower flood risk — soil can absorb significant rainfall'}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Soil Probability Distribution */}
                      {selectedDet.soil.probabilities?.length > 0 && (
                        <div className="mt-5 bg-gray-800 rounded-xl p-5 border border-gray-700">
                          <div className="text-xs text-gray-400 uppercase mb-3">Soil Classification Probability</div>
                          <div className="space-y-2">
                            {selectedDet.soil.probabilities.map(([cls, prob], i) => (
                              <div key={cls} className="flex items-center gap-3">
                                <span className="text-sm text-gray-300 w-28 shrink-0">{cls}</span>
                                <div className="flex-1 h-2.5 bg-gray-700 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full transition-all duration-1000"
                                    style={{
                                      width: `${prob}%`,
                                      backgroundColor: i === 0 ? '#fbbf24' : i === 1 ? '#a78bfa' : '#6b7280',
                                    }}/>
                                </div>
                                <span className="text-xs text-gray-400 font-mono w-10 text-right">{prob}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {selectedDet.soil_error && (
                    <div className="md:col-span-2 text-xs text-yellow-500 bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
                      Soil data: {selectedDet.soil_error}
                    </div>
                  )}
               
               {/* Location Info */}
               <div className="text-center text-xs text-gray-400 pt-4">
                 Coordinates: {currentPt.lat.toFixed(6)}, {currentPt.lon.toFixed(6)} • Max TWI: {currentPt.max_twi}
               </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
