import React, { useState, useEffect, useRef } from 'react';
import { Lightbulb, ArrowRight, CheckCircle2, AlertTriangle, Droplets, Mountain, Home, Trees, ShieldAlert, MapPin, Loader2, ChevronDown, Trash2 } from 'lucide-react';

export default function SmartInsightsTab() {
  const [spots, setSpots] = useState([]);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [spotsLoading, setSpotsLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [insightStream, setInsightStream] = useState("");
  const [error, setError] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showClearBtn, setShowClearBtn] = useState(false);
  const contentRef = useRef(null);

  // Secret: clear recommendation from cache
  const handleClearCache = async () => {
    if (!selectedSpot) return;
    try {
      const res = await fetch('/api/clear-recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: selectedSpot.lat, lon: selectedSpot.lon })
      });
      if (res.ok) {
        setInsightStream('');
        setShowClearBtn(false);
        // Update the spot in local state
        setSelectedSpot(prev => ({ ...prev, has_recommendation: false }));
        setSpots(prev => prev.map(s =>
          s.patch === selectedSpot.patch ? { ...s, has_recommendation: false } : s
        ));
      }
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetch('/api/cached-spots')
      .then(res => res.json())
      .then(data => { setSpots(data.spots || []); setSpotsLoading(false); })
      .catch(() => setSpotsLoading(false));
  }, []);

  // Auto-scroll content as it streams
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [insightStream]);

  const handleSelectSpot = (spot) => {
    setSelectedSpot(spot);
    setDropdownOpen(false);
    setInsightStream("");
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!selectedSpot) return;
    setAnalyzing(true);
    setInsightStream("");
    setError(null);
    try {
      const res = await fetch('/api/smart-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: selectedSpot.lat, lon: selectedSpot.lon, patch: selectedSpot.patch })
      });
      if (!res.ok) {
        try { const errData = await res.json(); setError(errData.error || `Server error ${res.status}`); }
        catch { setError(`Server error ${res.status}`); }
        setAnalyzing(false);
        return;
      }
      if (!res.body) throw new Error('No response body');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let boundary = buffer.indexOf('\n\n');
        while (boundary !== -1) {
          const chunkStr = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          if (chunkStr.startsWith('data: ')) {
            const dataStr = chunkStr.replace('data: ', '');
            if (dataStr === '[DONE]') { setAnalyzing(false); return; }
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.text) setInsightStream(prev => prev + parsed.text);
              else if (parsed.error) setError(parsed.error);
            } catch (e) { /* skip */ }
          }
          boundary = buffer.indexOf('\n\n');
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  // Rich markdown renderer with proper visual hierarchy
  const renderMd = (text) => {
    if (!text) return '';
    return text
      // Horizontal rules
      .replace(/---/g, '<hr class="border-gray-700 my-6"/>')
      // Headers  
      .replace(/### (.*?)(\n|$)/g, '<h3 class="text-lg font-bold text-emerald-300 mt-6 mb-3 flex items-center gap-2">▸ $1</h3>')
      .replace(/## (.*?)(\n|$)/g,  '<h2 class="text-xl font-bold text-white mt-8 mb-4 pb-2 border-b border-gray-700/50">$1</h2>')
      .replace(/# (.*?)(\n|$)/g,   '<h1 class="text-2xl font-extrabold text-white mt-8 mb-4">$1</h1>')
      // Bold and italic
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="text-gray-300 italic">$1</em>')
      // Bullet points
      .replace(/^- (.*?)$/gm, '<li class="ml-6 text-gray-200 mb-2 list-disc pl-1">$1</li>')
      // Numbered lists
      .replace(/^\d+\. (.*?)$/gm, '<li class="ml-6 text-gray-200 mb-2 list-decimal pl-1">$1</li>')
      // Newlines
      .replace(/\n\n/g, '<div class="h-4"></div>')
      .replace(/\n/g, '<br/>');
  };

  if (spotsLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <Loader2 className="w-10 h-10 animate-spin text-green-500 mb-4" />
        <p>Loading analyzed hotspots...</p>
      </div>
    );
  }

  if (spots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 px-6">
        <ShieldAlert className="w-16 h-16 mb-4 text-gray-700" />
        <h2 className="text-2xl font-bold text-gray-400 mb-2">No Hotspots Analyzed Yet</h2>
        <p className="text-sm text-gray-600 text-center max-w-md">Please complete the TWI Analysis & Detection Pipeline first to seed cached data.</p>
      </div>
    );
  }

  return (
    <div className="p-5 md:p-6 h-full flex flex-col gap-4 text-gray-200 overflow-hidden">

      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 shrink-0">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-600 tracking-tight flex items-center">
            <Lightbulb className="w-7 h-7 mr-3 text-green-500 shrink-0" />
            Smart Solutions Engine
          </h1>
          <p className="text-gray-500 text-sm mt-1">AI-powered green infrastructure recommendations for flood hotspots.</p>
        </div>

        {/* Spot Dropdown */}
        <div className="relative w-full md:w-80 shrink-0">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full flex items-center justify-between bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-left hover:border-green-500/50 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <MapPin className="w-4 h-4 text-green-400 shrink-0" />
              {selectedSpot ? (
                <p className="text-white font-medium text-sm truncate">{selectedSpot.place_name || `Hotspot #${selectedSpot.patch}`}</p>
              ) : (
                <span className="text-gray-400 text-sm">Choose a hotspot...</span>
              )}
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute top-full mt-1 left-0 right-0 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto custom-scrollbar">
              {spots.map((spot, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectSpot(spot)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-800 transition-colors border-b border-gray-800/50 last:border-0 ${
                    selectedSpot?.patch === spot.patch ? 'bg-green-900/20 border-l-2 border-l-green-500' : ''
                  }`}
                >
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
                    spot.has_recommendation ? 'bg-green-500/20 text-green-400' : 'bg-gray-800 text-gray-400'
                  }`}>
                    {spot.patch || '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-medium truncate">{spot.place_name || `Hotspot #${spot.patch}`}</p>
                    <p className="text-gray-500 text-[11px] truncate">{spot.soil_class || 'Unknown'} · {spot.buildings ?? '?'} bldgs · {spot.elevation != null ? `${spot.elevation}m` : '—'}</p>
                  </div>
                  {spot.has_recommendation && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      {selectedSpot ? (
        <div className="flex gap-5 flex-1 min-h-0 overflow-hidden">

          {/* Left: Context Cards */}
          <div className="w-[280px] shrink-0 flex flex-col gap-2.5 overflow-y-auto custom-scrollbar pr-1">
            <div className="bg-gray-900/60 backdrop-blur border border-gray-800 rounded-2xl p-4">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Location Context</h3>
              <div className="space-y-2">
                {[
                  { icon: <Home className="w-4 h-4 text-blue-400" />, bg: 'bg-blue-500/15', label: 'Place', value: selectedSpot.place_name || 'Not available' },
                  { icon: <Mountain className="w-4 h-4 text-emerald-400" />, bg: 'bg-emerald-500/15', label: 'Elevation', value: selectedSpot.elevation != null ? `${selectedSpot.elevation} meters` : 'N/A' },
                  { icon: <Droplets className="w-4 h-4 text-orange-400" />, bg: 'bg-orange-500/15', label: 'Soil', value: selectedSpot.soil_class ? `${selectedSpot.soil_class} (${selectedSpot.drainage})` : 'N/A' },
                  { icon: <Droplets className="w-4 h-4 text-cyan-400" />, bg: 'bg-cyan-500/15', label: 'Infiltration', value: selectedSpot.infiltration_avg ? `~${selectedSpot.infiltration_avg} mm/hr` : 'N/A' },
                  { icon: <Trees className="w-4 h-4 text-purple-400" />, bg: 'bg-purple-500/15', label: 'Buildings', value: `${selectedSpot.buildings ?? '?'} detected${selectedSpot.building_footprint_pct ? ` (${selectedSpot.building_footprint_pct}%)` : ''}` },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 bg-gray-800/30 p-2.5 rounded-xl border border-gray-700/30">
                    <div className={`p-2 ${item.bg} rounded-lg shrink-0`}>{item.icon}</div>
                    <div className="min-w-0">
                      <p className="text-[9px] text-gray-500 uppercase tracking-wider">{item.label}</p>
                      <p className="font-medium text-white text-[13px] truncate">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: AI Output */}
          <div className="flex-1 min-w-0 flex flex-col bg-gray-900/40 border border-gray-800 rounded-2xl overflow-hidden">
            
            {/* Header bar */}
            <div className="px-5 py-3 bg-gray-800/60 border-b border-gray-700/50 flex justify-between items-center shrink-0">
              <div className="flex items-center space-x-3">
                <span className="relative flex h-2.5 w-2.5">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${analyzing ? 'bg-green-400' : 'bg-gray-500'}`}></span>
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${analyzing ? 'bg-green-500' : 'bg-gray-600'}`}></span>
                </span>
                <span className="font-medium text-sm text-gray-300">AI Consultant</span>
              </div>
              {!insightStream && !analyzing && (
                <button
                  onClick={handleAnalyze}
                  className="bg-green-600 hover:bg-green-500 text-white text-xs font-semibold py-1.5 px-4 rounded-full transition-all shadow-[0_0_12px_rgba(34,197,94,0.3)] flex items-center"
                >
                  {selectedSpot.has_recommendation ? 'View Cached' : 'Generate'}
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </button>
              )}
            </div>

            {/* Scrollable Content */}
            <div ref={contentRef} className="flex-1 overflow-y-auto custom-scrollbar p-5 relative">
              {!insightStream && !analyzing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-15 pointer-events-none">
                  <Lightbulb className="w-16 h-16 mb-3" />
                  <p className="text-base">{selectedSpot.has_recommendation ? 'Click to view cached solution' : 'Press Generate to start...'}</p>
                </div>
              )}

              {error && (
                <div className="bg-red-900/30 border border-red-500/50 p-3 rounded-xl text-red-200 flex items-center mb-4 text-sm">
                  <AlertTriangle className="w-4 h-4 mr-2 shrink-0" /> {error}
                </div>
              )}

              {/* Rendered AI content with proper typography */}
              <article 
                className="text-[15px] sm:text-base text-gray-200 leading-[1.8] max-w-none [&_strong]:text-white"
                dangerouslySetInnerHTML={{__html: renderMd(insightStream)}}
              />

              {analyzing && (
                <div className="flex items-center gap-2 mt-4 text-green-400 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating solution...</span>
                </div>
              )}
            </div>

            {insightStream && (
              <div
                className="px-4 py-2 bg-gray-900/90 border-t border-gray-800 text-[11px] text-gray-500 flex items-center justify-between shrink-0 select-none cursor-default"
                onDoubleClick={() => setShowClearBtn(prev => !prev)}
              >
                <div className="flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-green-600" />
                  Recommendation cached for {selectedSpot.place_name || `Hotspot #${selectedSpot.patch}`}.
                </div>
                {showClearBtn && (
                  <button
                    onClick={handleClearCache}
                    className="ml-3 flex items-center gap-1 text-red-400 hover:text-red-300 text-[10px] bg-red-500/10 hover:bg-red-500/20 px-2 py-0.5 rounded-md transition-all"
                    title="Clear cached recommendation"
                  >
                    <Trash2 className="w-3 h-3" /> Clear
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center opacity-30">
            <MapPin className="w-16 h-16 mx-auto mb-3 text-gray-600" />
            <p className="text-lg text-gray-500">Select a hotspot from the dropdown to begin.</p>
          </div>
        </div>
      )}
    </div>
  );
}
