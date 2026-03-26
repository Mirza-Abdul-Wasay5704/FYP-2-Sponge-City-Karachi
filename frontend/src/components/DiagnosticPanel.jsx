import React, { useState } from 'react';

const DiagnosticPanel = () => {
  const [results, setResults] = useState([]);
  const [testing, setTesting] = useState(false);

  const addResult = (message, isSuccess) => {
    setResults(prev => [...prev, { message, isSuccess, timestamp: new Date().toISOString() }]);
  };

  const testFileAccess = async () => {
    setTesting(true);
    setResults([]);

    // Test GeoTIFF
    try {
      addResult('Testing GeoTIFF file...', null);
      const response = await fetch('/Layers/Korangi_TWI.tif');
      if (response.ok) {
        const blob = await response.blob();
        addResult(`✓ GeoTIFF accessible (${(blob.size / 1024 / 1024).toFixed(2)} MB)`, true);
      } else {
        addResult(`✗ GeoTIFF HTTP ${response.status}: ${response.statusText}`, false);
      }
    } catch (error) {
      addResult(`✗ GeoTIFF Error: ${error.message}`, false);
    }

    // Test Shapefiles
    const shapefiles = [
      'korangi_roads',
      'korangi_landuse',
      'korangi_waterways'
    ];

    for (const name of shapefiles) {
      try {
        addResult(`Testing ${name}.shp...`, null);
        const response = await fetch(`/Layers/${name}.shp`);
        if (response.ok) {
          const blob = await response.blob();
          addResult(`✓ ${name}.shp (${(blob.size / 1024).toFixed(2)} KB)`, true);
        } else {
          addResult(`✗ ${name}.shp HTTP ${response.status}`, false);
        }
      } catch (error) {
        addResult(`✗ ${name}.shp Error: ${error.message}`, false);
      }
    }

    // Test shpjs library
    try {
      addResult('Testing shpjs library...', null);
      const shp = await import('shpjs');
      addResult('✓ shpjs library loaded', true);
    } catch (error) {
      addResult(`✗ shpjs library error: ${error.message}`, false);
    }

    // Test geotiff library
    try {
      addResult('Testing geotiff library...', null);
      const GeoTIFF = await import('geotiff');
      addResult('✓ GeoTIFF library loaded', true);
    } catch (error) {
      addResult(`✗ GeoTIFF library error: ${error.message}`, false);
    }

    setTesting(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-[3000] bg-gray-800 border border-gray-700 rounded-lg shadow-2xl max-w-md max-h-96 overflow-hidden">
      <div className="p-4 bg-gray-900 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white">File Access Diagnostic</h3>
      </div>
      <div className="p-4 overflow-y-auto max-h-64">
        {results.length === 0 && !testing && (
          <p className="text-gray-400 text-sm">Click "Run Tests" to check file accessibility</p>
        )}
        {results.map((result, index) => (
          <div
            key={index}
            className={`text-sm py-1 ${
              result.isSuccess === null
                ? 'text-gray-400'
                : result.isSuccess
                ? 'text-green-400'
                : 'text-red-400'
            }`}
          >
            {result.message}
          </div>
        ))}
        {testing && <div className="text-yellow-400 text-sm">Running tests...</div>}
      </div>
      <div className="p-4 bg-gray-900 border-t border-gray-700">
        <button
          onClick={testFileAccess}
          disabled={testing}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
        >
          {testing ? 'Testing...' : 'Run Tests'}
        </button>
      </div>
    </div>
  );
};

export default DiagnosticPanel;
