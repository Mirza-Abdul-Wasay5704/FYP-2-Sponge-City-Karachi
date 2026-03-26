import React, { useState, useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Polygon, CircleMarker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'

const LULC_HEX = {
  road:       '#a020f0',
  land:       '#8b4513',
  park:       '#00c800',
  vegetation: '#009600',
  river:      '#0000ff',
  water:      '#00bfff',
}

/* Auto-fit map bounds when patches arrive */
function FitBounds({ patches }) {
  const map = useMap()
  useEffect(() => {
    if (patches?.length) {
      const coords = patches.flatMap(p => p.corners.map(c => [c[0], c[1]]))
      map.fitBounds(L.latLngBounds(coords), { padding: [30, 30] })
    }
  }, [patches, map])
  return null
}

export default function AnalysisDashboard({ onBack }) {
  const [patches, setPatches]     = useState(9)
  const [radius, setRadius]       = useState(2)
  const [loading, setLoading]     = useState(false)
  const [twiData, setTwiData]     = useState(null)
  const [detections, setDetections] = useState({})
  const [detecting, setDetecting] = useState(false)
  const [progress, setProgress]   = useState({ done: 0, total: 0 })
  const [apiStatus, setApiStatus] = useState(null)
  const [error, setError]         = useState(null)

  useEffect(() => {
    fetch('/api/status')
      .then(r => r.json()).then(setApiStatus)
      .catch(() => setApiStatus({ error: true }))
  }, [])

  /* ── TWI Analysis ─────────────────────────────────────── */
  async function handleAnalyze() {
    setLoading(true); setError(null); setDetections({})
    try {
      const res = await fetch(`/api/twi-points?patches=${patches}&radius=${radius}`)
      if (!res.ok) throw new Error((await res.json()).error || res.statusText)
      setTwiData(await res.json())
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  /* ── Detection on all points ──────────────────────────── */
  async function handleDetectAll() {
    if (!twiData) return
    setDetecting(true)
    const pts = twiData.points
    setProgress({ done: 0, total: pts.length })
    for (let i = 0; i < pts.length; i++) {
      try {
        const res = await fetch('/api/detect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pts[i]),
        })
        const result = await res.json()
        setDetections(prev => ({ ...prev, [pts[i].patch]: result }))
      } catch (e) {
        setDetections(prev => ({ ...prev, [pts[i].patch]: { error: e.message } }))
      }
      setProgress({ done: i + 1, total: pts.length })
    }
    setDetecting(false)
  }

  /* ── Aggregate stats ──────────────────────────────────── */
  const aggregate = useMemo(() => {
    const vals = Object.values(detections).filter(d => !d.error)
    if (!vals.length) return null
    const totalBld = vals.reduce((s, d) => s + (d.buildings || 0), 0)
    const lulcAgg = {}
    vals.forEach(d => {
      Object.entries(d.lulc || {}).forEach(([cls, v]) => {
        if (!lulcAgg[cls]) lulcAgg[cls] = { total: 0, count: 0 }
        lulcAgg[cls].total += v.area_pct
        lulcAgg[cls].count += 1
      })
    })
    const lulcAvg = {}
    Object.entries(lulcAgg).forEach(([cls, v]) => {
      lulcAvg[cls] = Math.round(v.total / v.count * 100) / 100
    })
    return { totalBuildings: totalBld, avgBuildings: Math.round(totalBld / vals.length), lulcAvg, pointsProcessed: vals.length }
  }, [detections])

  const allDetected = twiData && Object.keys(detections).length === twiData.points.length

  /* ── Render ───────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">

      {/* Header */}
      <header className="bg-gray-800/80 backdrop-blur border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
              </svg>
              Back
            </button>
            <div>
              <h1 className="text-2xl font-bold">Sponge City Karachi</h1>
              <p className="text-gray-400 text-xs">TWI Flood-Risk Analysis &amp; Land-Cover Detection</p>
            </div>
          </div>
          {apiStatus && !apiStatus.error && (
            <div className="hidden md:flex items-center gap-3 text-xs">
              <span className={apiStatus.twi_available ? 'text-green-400' : 'text-red-400'}>
                {apiStatus.twi_available ? '●' : '○'} TWI
              </span>
              <span className={apiStatus.roboflow_available ? 'text-green-400' : 'text-yellow-400'}>
                {apiStatus.roboflow_available ? '●' : '○'} LULC
              </span>
              <span className={apiStatus.yolo_available ? 'text-green-400' : 'text-yellow-400'}>
                {apiStatus.yolo_available ? '●' : '○'} YOLO
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">

        {/* API not reachable */}
        {apiStatus?.error && (
          <div className="bg-red-900/40 border border-red-500/50 rounded-xl p-6 text-center">
            <p className="text-red-300 font-semibold text-lg mb-2">Backend not reachable</p>
            <code className="bg-gray-900 px-4 py-2 rounded text-sm text-gray-300 block max-w-lg mx-auto">
              cd scripts &amp;&amp; python app.py
            </code>
          </div>
        )}

        {/* ─── Configuration ─────────────────────────────── */}
        <section className="bg-gray-800/60 backdrop-blur rounded-xl border border-gray-700 p-6">
          <h2 className="text-lg font-semibold mb-4">Configuration</h2>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-gray-400 text-xs mb-1">Number of Patches</label>
              <input type="number" min={1} max={100} value={patches}
                onChange={e => setPatches(Math.max(1, +e.target.value))}
                className="w-28 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"/>
            </div>
            <div>
              <label className="block text-gray-400 text-xs mb-1">Min Distance (km)</label>
              <input type="number" min={0} step={0.1} value={radius}
                onChange={e => setRadius(Math.max(0, +e.target.value))}
                className="w-28 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"/>
            </div>
            <button onClick={handleAnalyze} disabled={loading || apiStatus?.error}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 rounded-lg font-semibold disabled:opacity-40 transition-all">
              {loading ? 'Analyzing…' : 'Analyze TWI'}
            </button>
          </div>
          {error && <p className="mt-3 text-red-400 text-sm">{error}</p>}
        </section>

        {/* ─── Map + Stats ───────────────────────────────── */}
        {twiData && (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Map */}
            <div className="lg:col-span-2 bg-gray-800/60 backdrop-blur rounded-xl border border-gray-700 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
                <h3 className="font-semibold">Patch Map — {twiData.grid.rows}×{twiData.grid.cols} grid</h3>
                <span className="text-xs text-gray-400">{twiData.points.length} points</span>
              </div>
              <div style={{ height: 500 }}>
                <MapContainer center={[24.84, 67.14]} zoom={12}
                  style={{ height: '100%', width: '100%' }}
                  className="rounded-b-xl">
                  <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    attribution="&copy; Esri"/>
                  <FitBounds patches={twiData.patches}/>
                  {twiData.patches.map(p => (
                    <Polygon key={p.id}
                      positions={p.corners.map(c => [c[0], c[1]])}
                      pathOptions={{ color: '#3b82f6', weight: 2, fill: false }}/>
                  ))}
                  {twiData.points.map(pt => (
                    <CircleMarker key={pt.patch}
                      center={[pt.lat, pt.lon]}
                      radius={8}
                      pathOptions={{ fillColor: '#ef4444', fillOpacity: 0.85, color: '#fff', weight: 2 }}>
                      <Popup>
                        <div className="text-sm">
                          <strong>Patch {pt.patch}</strong><br/>
                          TWI: {pt.max_twi}<br/>
                          {pt.lat.toFixed(6)}, {pt.lon.toFixed(6)}
                        </div>
                      </Popup>
                    </CircleMarker>
                  ))}
                </MapContainer>
              </div>
            </div>

            {/* Stats + Points */}
            <div className="space-y-4">

              {/* TWI Stats card */}
              <div className="bg-gray-800/60 backdrop-blur rounded-xl border border-gray-700 p-5">
                <h3 className="font-semibold mb-3">TWI Statistics</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {Object.entries(twiData.twiStats).map(([k, v]) => (
                    <div key={k} className="bg-gray-700/50 rounded-lg px-3 py-2">
                      <span className="text-gray-400 text-xs uppercase">{k}</span>
                      <p className="text-lg font-mono font-bold">{v}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Points table */}
              <div className="bg-gray-800/60 backdrop-blur rounded-xl border border-gray-700 p-5 max-h-[260px] overflow-y-auto custom-scrollbar">
                <h3 className="font-semibold mb-3">Analysis Points</h3>
                <table className="w-full text-xs">
                  <thead className="text-gray-400">
                    <tr><th className="text-left pb-2">Patch</th><th className="text-right pb-2">TWI</th><th className="text-right pb-2">Lat</th><th className="text-right pb-2">Lon</th></tr>
                  </thead>
                  <tbody>
                    {twiData.points.map(pt => (
                      <tr key={pt.patch} className="border-t border-gray-700/50">
                        <td className="py-1.5 font-bold">{pt.patch}</td>
                        <td className="text-right font-mono text-red-400">{pt.max_twi}</td>
                        <td className="text-right font-mono text-gray-300">{pt.lat.toFixed(4)}</td>
                        <td className="text-right font-mono text-gray-300">{pt.lon.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Detect button */}
              <button onClick={handleDetectAll}
                disabled={detecting || apiStatus?.error}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-xl font-bold disabled:opacity-40 transition-all text-sm">
                {detecting
                  ? `Detecting ${progress.done} / ${progress.total} …`
                  : allDetected
                    ? '✔ Detection Complete — Run Again?'
                    : '🔍  Run Detection on All Points'}
              </button>
              {detecting && (
                <div className="w-full bg-gray-700 rounded-full h-1.5">
                  <div className="bg-gradient-to-r from-orange-500 to-red-500 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}/>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ─── Detection Results ─────────────────────────── */}
        {twiData && Object.keys(detections).length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4">Detection Results</h2>

            {/* Aggregate summary */}
            {aggregate && allDetected && (
              <div className="bg-gray-800/60 backdrop-blur rounded-xl border border-blue-500/30 p-5 mb-6">
                <h3 className="font-semibold text-blue-400 mb-3">Aggregate Summary — {aggregate.pointsProcessed} points</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="bg-gray-700/50 rounded-lg px-4 py-3">
                    <span className="text-gray-400 text-xs">Total Buildings</span>
                    <p className="text-2xl font-bold text-orange-400">{aggregate.totalBuildings}</p>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg px-4 py-3">
                    <span className="text-gray-400 text-xs">Avg Buildings / Point</span>
                    <p className="text-2xl font-bold text-orange-300">{aggregate.avgBuildings}</p>
                  </div>
                  {Object.entries(aggregate.lulcAvg).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([cls, pct]) => (
                    <div key={cls} className="bg-gray-700/50 rounded-lg px-4 py-3">
                      <span className="text-gray-400 text-xs capitalize">Avg {cls}</span>
                      <p className="text-2xl font-bold" style={{ color: LULC_HEX[cls] || '#888' }}>{pct}%</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Per-point cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {twiData.points.map(pt => {
                const det = detections[pt.patch]
                const isWaiting = detecting && !det
                return (
                  <div key={pt.patch}
                    className="bg-gray-800/60 backdrop-blur rounded-xl border border-gray-700 overflow-hidden flex flex-col">

                    {/* Card header */}
                    <div className="px-4 py-3 border-b border-gray-700 flex justify-between items-center">
                      <span className="font-bold">Patch {pt.patch}</span>
                      <span className="text-red-400 font-mono text-sm">TWI {pt.max_twi}</span>
                    </div>

                    {isWaiting ? (
                      <div className="flex-1 flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin"/>
                      </div>
                    ) : det?.error ? (
                      <div className="p-4 text-red-400 text-sm">{det.error}</div>
                    ) : det ? (
                      <>
                        {/* Satellite image (annotated) */}
                        {det.image && (
                          <img src={`data:image/jpeg;base64,${det.image}`}
                            alt={`Patch ${pt.patch}`}
                            className="w-full aspect-square object-cover"/>
                        )}

                        <div className="p-4 space-y-3 flex-1">
                          {/* Coordinates */}
                          <p className="text-xs text-gray-400 font-mono">
                            {pt.lat.toFixed(6)}, {pt.lon.toFixed(6)}
                          </p>

                          {/* LULC */}
                          {Object.keys(det.lulc || {}).length > 0 ? (
                            <div className="space-y-1.5">
                              <span className="text-xs text-gray-400 font-semibold uppercase">Land Cover</span>
                              {Object.entries(det.lulc).sort((a,b) => b[1].area_pct - a[1].area_pct).map(([cls, v]) => (
                                <div key={cls}>
                                  <div className="flex justify-between text-xs mb-0.5">
                                    <span className="capitalize">{cls} <span className="text-gray-500">({v.segments})</span></span>
                                    <span className="font-mono">{v.area_pct}%</span>
                                  </div>
                                  <div className="h-1.5 bg-gray-700 rounded-full">
                                    <div className="h-1.5 rounded-full" style={{
                                      width: `${Math.min(v.area_pct, 100)}%`,
                                      backgroundColor: LULC_HEX[cls] || '#888',
                                    }}/>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : det.lulc_error ? (
                            <p className="text-xs text-yellow-500">LULC: {det.lulc_error}</p>
                          ) : null}

                          {/* Buildings */}
                          <div className="pt-2 border-t border-gray-700 flex items-center gap-2">
                            <span className="text-orange-400 text-lg">🏢</span>
                            <span className="font-bold">{det.buildings}</span>
                            <span className="text-gray-400 text-xs">buildings detected</span>
                          </div>
                          {det.building_stats && (
                            <p className="text-xs text-gray-400 font-mono">
                              Footprint {det.building_stats.total_footprint_pct}% of image
                            </p>
                          )}
                          {det.building_error && (
                            <p className="text-xs text-yellow-500">Buildings: {det.building_error}</p>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 flex items-center justify-center py-8 text-gray-500 text-sm">
                        Awaiting detection
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

      </main>
    </div>
  )
}
