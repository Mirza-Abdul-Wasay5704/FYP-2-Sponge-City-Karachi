import { useState } from 'react'
import DistrictSelector from './components/DistrictSelector'
import MapViewer from './components/MapViewer'
import DiagnosticPanel from './components/DiagnosticPanel'
import AnalysisDashboard from './components/AnalysisDashboard'
import logo from './assets/sponge_city_khi_logo.png'
import './App.css'

function App() {
  const [selectedDistrict, setSelectedDistrict] = useState('')
  const [showDiagnostic, setShowDiagnostic] = useState(false)
  const [showAnalysis, setShowAnalysis] = useState(false)

  if (showAnalysis) {
    return <AnalysisDashboard onBack={() => setShowAnalysis(false)} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 shadow-lg">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-2 rounded-lg">
                <img src={logo} alt="Sponge City Karachi Logo" className="h-20 w-auto" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Sponge City Karachi</h1>
                <p className="text-gray-400 text-sm mt-1">Interactive district mapping and analysis platform</p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-2 text-gray-400 text-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Karachi, Pakistan</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {!selectedDistrict ? (
          // Landing Page
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
            <div className="text-center mb-12 animate-fadeIn">
              <h2 className="text-4xl font-bold text-white mb-4">
                Explore Karachi's Districts
              </h2>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                Visualize comprehensive geospatial data including topographic indices, 
                road networks, land use patterns, and water resources across Karachi's districts.
              </p>
            </div>

            <div className="w-full max-w-2xl">
              <div className="card mb-8">
                <DistrictSelector onDistrictSelect={setSelectedDistrict} />
              </div>

              {/* TWI Analysis Button */}
              <div className="mt-8">
                <button
                  onClick={() => setShowAnalysis(true)}
                  className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold text-lg rounded-xl shadow-lg transition-all transform hover:scale-[1.02]"
                >
                  🔍  Start TWI Flood-Risk Analysis &amp; Detection
                </button>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 hover:border-blue-500 transition-all duration-300 transform hover:scale-105">
                  <div className="bg-blue-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">GeoTIFF Visualization</h3>
                  <p className="text-gray-400 text-sm">View topographic wetness index and terrain analysis data</p>
                </div>

                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 hover:border-green-500 transition-all duration-300 transform hover:scale-105">
                  <div className="bg-green-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Vector Layers</h3>
                  <p className="text-gray-400 text-sm">Toggle multiple data layers including roads, land use, and waterways</p>
                </div>

                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 hover:border-purple-500 transition-all duration-300 transform hover:scale-105">
                  <div className="bg-purple-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Interactive Maps</h3>
                  <p className="text-gray-400 text-sm">Pan, zoom, and explore detailed geospatial information</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Map View - Full Screen
          <div className="fixed inset-0 top-[100px] animate-fadeIn">
            <div className="absolute top-4 left-4 z-[1000] flex items-center space-x-4">
              <button
                onClick={() => setSelectedDistrict('')}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-800/95 backdrop-blur-sm hover:bg-gray-700 text-white rounded-lg shadow-lg border border-gray-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to Districts</span>
              </button>
              <div className="bg-gray-800/95 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg border border-gray-700">
                <h2 className="text-xl font-bold text-white capitalize">{selectedDistrict} District</h2>
                <p className="text-gray-400 text-xs">Geospatial data visualization</p>
              </div>
            </div>
            <MapViewer district={selectedDistrict} onBack={() => setSelectedDistrict('')} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 mt-12">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-sm">
              © 2025 Sponge City Karachi. Powered by Leaflet, GeoTIFF.js, and React.
            </p>
            <button
              onClick={() => setShowDiagnostic(!showDiagnostic)}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
            >
              {showDiagnostic ? 'Hide' : 'Show'} Diagnostic
            </button>
          </div>
        </div>
      </footer>

      {/* Diagnostic Panel */}
      {showDiagnostic && <DiagnosticPanel />}
    </div>
  )
}

export default App
