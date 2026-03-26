import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, ImageOverlay, useMap } from 'react-leaflet';
import L from 'leaflet';
import * as GeoTIFF from 'geotiff';
import shp from 'shpjs';
import LayerControl from './LayerControl';
import LoadingSpinner from './LoadingSpinner';
import Legend from './Legend';

// Fix for default marker icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

const KORANGI_CENTER = [24.8607, 67.1011]; // Korangi, Karachi coordinates

// Component to handle map bounds and layers
const MapController = ({ geoTiffBounds, geoTiffLayer }) => {
  const map = useMap();

  useEffect(() => {
    if (geoTiffBounds && geoTiffLayer) {
      map.fitBounds(geoTiffBounds);
    } else {
      map.setView(KORANGI_CENTER, 12);
    }
  }, [map, geoTiffBounds, geoTiffLayer]);

  return null;
};

const MapViewer = ({ district }) => {
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState(null);
  const [geoTiffUrl, setGeoTiffUrl] = useState(null);
  const [geoTiffBounds, setGeoTiffBounds] = useState(null);
  const [geoTiffImage, setGeoTiffImage] = useState(null);
  const [layers, setLayers] = useState([]);
  const [geoJsonLayers, setGeoJsonLayers] = useState({});
  const [showBaseMap, setShowBaseMap] = useState(true);

  // Initialize available layers
  useEffect(() => {
    if (district === 'korangi') {
      setLayers([
        {
          id: 'boundary',
          name: 'District Boundary',
          type: 'vector',
          visible: true,
          color: '#3b82f6',
          description: 'Korangi district boundary',
          weight: 3,
          fillOpacity: 0.05,
          alwaysLoad: true,
        },
        {
          id: 'basemap',
          name: 'Base Map',
          type: 'tile',
          visible: true,
          description: 'OpenStreetMap base layer',
        },
        {
          id: 'twi',
          name: 'Flood Risk (TWI)',
          type: 'raster',
          visible: false,
          description: 'Topographic Wetness Index',
        },
        {
          id: 'roads',
          name: 'Roads',
          type: 'vector',
          visible: false,
          color: '#fbbf24',
          description: 'Street and road network',
          weight: 2,
        },
        {
          id: 'landuse',
          name: 'Land Use',
          type: 'vector',
          visible: false,
          color: '#34d399',
          description: 'Land use classification',
          weight: 1,
          fillOpacity: 0.4,
        },
        {
          id: 'waterways',
          name: 'Waterways',
          type: 'vector',
          visible: false,
          color: '#3b82f6',
          description: 'Rivers and channels',
          weight: 2,
        },
        {
          id: 'water',
          name: 'Water Bodies',
          type: 'vector',
          visible: false,
          color: '#1e40af',
          description: 'Lakes and reservoirs',
          weight: 1,
          fillOpacity: 0.6,
        },
        {
          id: 'pois',
          name: 'Points of Interest',
          type: 'vector',
          visible: false,
          color: '#ef4444',
          description: 'Notable locations',
          weight: 1,
        },
        {
          id: 'places',
          name: 'Places',
          type: 'vector',
          visible: false,
          color: '#a78bfa',
          description: 'Named locations',
          weight: 1,
        },
        {
          id: 'pofw',
          name: 'Places of Worship',
          type: 'vector',
          visible: false,
          color: '#f59e0b',
          description: 'Religious sites',
          weight: 1,
        },
        {
          id: 'natural',
          name: 'Natural Features',
          type: 'vector',
          visible: false,
          color: '#10b981',
          description: 'Parks and natural areas',
          weight: 1,
          fillOpacity: 0.3,
        },
      ]);
    }
  }, [district]);

  // Load base layers when Korangi is selected
  useEffect(() => {
    if (district === 'korangi') {
      // Load district boundary first
      loadShapefile('boundary');
      // Preload GeoTIFF in background
      loadGeoTiff();
    } else {
      setGeoTiffImage(null);
      setGeoTiffBounds(null);
      setGeoJsonLayers({});
      setLayers([]);
    }
  }, [district]);

  const loadGeoTiff = async () => {
    setLoading(true);
    setLoadingMessage('Loading flood risk data...');
    setError(null);

    try {
      console.log('Loading GeoTIFF from /Layers/Korangi_TWI.tif');
      
      const response = await fetch('/Layers/Korangi_TWI.tif');
      if (!response.ok) {
        throw new Error(`Failed to fetch GeoTIFF: ${response.status} ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
      const image = await tiff.getImage();
      const bbox = image.getBoundingBox();
      const width = image.getWidth();
      const height = image.getHeight();
      
      console.log('GeoTIFF loaded:', { bbox, width, height });
      
      // Read raster data
      const rasters = await image.readRasters();
      const data = rasters[0]; // First band
      
      // Find min and max values for normalization
      let min = Infinity;
      let max = -Infinity;
      for (let i = 0; i < data.length; i++) {
        if (data[i] !== -9999 && !isNaN(data[i])) { // Skip nodata values
          min = Math.min(min, data[i]);
          max = Math.max(max, data[i]);
        }
      }
      
      console.log('Data range:', { min, max });
      
      // Create canvas to render the GeoTIFF
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      const imageData = ctx.createImageData(width, height);
      
      // Convert data to RGBA with flood risk color scale
      // TWI: High values = water accumulation = FLOOD PRONE (RED)
      // Low values = dry areas = SAFE (BLUE/GREEN)
      for (let i = 0; i < data.length; i++) {
        const value = data[i];
        const pixelIndex = i * 4;
        
        if (value === -9999 || isNaN(value)) {
          // Transparent for nodata
          imageData.data[pixelIndex] = 0;
          imageData.data[pixelIndex + 1] = 0;
          imageData.data[pixelIndex + 2] = 0;
          imageData.data[pixelIndex + 3] = 0;
        } else {
          // Normalize value between 0 and 1
          const normalized = (value - min) / (max - min);
          
          // Flood Risk Color Scale:
          // Blue (safe) -> Green -> Yellow -> Orange -> Red (flood-prone)
          let r, g, b;
          if (normalized < 0.2) {
            // Deep Blue to Light Blue (Very Safe)
            const t = normalized / 0.2;
            r = Math.floor(t * 100);
            g = Math.floor(150 + t * 105);
            b = 255;
          } else if (normalized < 0.4) {
            // Light Blue to Green (Safe)
            const t = (normalized - 0.2) / 0.2;
            r = Math.floor(100 - t * 100);
            g = 255;
            b = Math.floor(255 - t * 155);
          } else if (normalized < 0.6) {
            // Green to Yellow (Moderate Risk)
            const t = (normalized - 0.4) / 0.2;
            r = Math.floor(t * 255);
            g = 255;
            b = Math.floor(100 - t * 100);
          } else if (normalized < 0.8) {
            // Yellow to Orange (High Risk)
            const t = (normalized - 0.6) / 0.2;
            r = 255;
            g = Math.floor(255 - t * 100);
            b = 0;
          } else {
            // Orange to Dark Red (Very High Flood Risk)
            const t = (normalized - 0.8) / 0.2;
            r = Math.floor(255 - t * 50);
            g = Math.floor(155 - t * 155);
            b = 0;
          }
          
          imageData.data[pixelIndex] = r;
          imageData.data[pixelIndex + 1] = g;
          imageData.data[pixelIndex + 2] = b;
          imageData.data[pixelIndex + 3] = 180; // 70% opacity
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      const imageUrl = canvas.toDataURL();
      
      const bounds = [
        [bbox[1], bbox[0]], // Southwest [lat, lng]
        [bbox[3], bbox[2]], // Northeast [lat, lng]
      ];
      
      setGeoTiffBounds(bounds);
      setGeoTiffImage(imageUrl);
      console.log('GeoTIFF rendered successfully');
      
    } catch (err) {
      console.error('Error loading GeoTIFF:', err);
      setError(`Failed to load GeoTIFF: ${err.message}`);
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const loadShapefile = async (layerId) => {
    try {
      const fileMap = {
        boundary: 'new_korangi',
        roads: 'korangi_roads',
        landuse: 'korangi_landuse',
        waterways: 'korangi_waterways',
        water: 'korangi_water',
        pois: 'korangi_pois',
        places: 'korangi_places',
        pofw: 'korangi_pofw',
        natural: 'korangi_natural',
      };

      const fileName = fileMap[layerId];
      if (!fileName) return;

      // Load boundary layer with loading indicator
      if (layerId === 'boundary') {
        setLoading(true);
        setLoadingMessage('Loading district boundary...');
      }

      const shpUrl = `${window.location.origin}/Layers/${fileName}.shp`;
      
      console.log(`Loading shapefile: ${fileName}`);
      
      // Load shapefile using shpjs
      const geojson = await shp(shpUrl);
      
      console.log(`Loaded shapefile ${fileName}:`, geojson);
      
      setGeoJsonLayers(prev => ({
        ...prev,
        [layerId]: geojson
      }));

      if (layerId === 'boundary') {
        setLoading(false);
        setLoadingMessage('');
      }

    } catch (err) {
      console.error(`Error loading shapefile ${layerId}:`, err);
      console.warn(`Failed to load ${layerId} layer. The file may not be accessible.`);
      if (layerId === 'boundary') {
        setLoading(false);
        setLoadingMessage('');
        setError('Failed to load district boundary');
      }
    }
  };

  const handleLayerToggle = (layerId) => {
    setLayers(prev => {
      const newLayers = prev.map(layer => {
        if (layer.id === layerId) {
          // Don't allow toggling off the boundary layer
          if (layer.alwaysLoad && layer.visible) {
            return layer;
          }
          
          const newVisible = !layer.visible;
          
          // Handle base map toggle
          if (layerId === 'basemap') {
            setShowBaseMap(newVisible);
          }
          
          // Load shapefile if it's being enabled and not loaded yet
          if (newVisible && layer.type === 'vector' && !geoJsonLayers[layerId]) {
            loadShapefile(layerId);
          }
          
          console.log(`Toggling layer ${layerId}: ${layer.visible} -> ${newVisible}`);
          return { ...layer, visible: newVisible };
        }
        return layer;
      });
      
      return newLayers;
    });
  };

  const getLayerStyle = (layerId) => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer) return {};

    return {
      color: layer.color || '#3388ff',
      weight: layer.weight !== undefined ? layer.weight : 2,
      opacity: 0.8,
      fillOpacity: layer.fillOpacity !== undefined ? layer.fillOpacity : 0.4,
    };
  };

  if (!district) {
    return null;
  }

  if (district !== 'korangi') {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="card max-w-md text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-xl font-semibold mb-2 text-gray-100">District Data Not Available</h3>
          <p className="text-gray-400">
            Geospatial data is currently only available for Korangi District. 
            Please select Korangi to view the interactive map.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {loading && <LoadingSpinner message={loadingMessage} />}
      
      {error && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-[2000] bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg">
          {error}
        </div>
      )}

      <MapContainer
        center={[24.8546, 67.0388]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
          {/* Base Map Tiles - Toggleable */}
          {showBaseMap && (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          )}

          <MapController geoTiffBounds={geoTiffBounds} geoTiffLayer={geoTiffImage} />

          {/* Render GeoTIFF as ImageOverlay */}
          {geoTiffImage && geoTiffBounds && layers.find(l => l.id === 'twi')?.visible && (
            <ImageOverlay
              url={geoTiffImage}
              bounds={geoTiffBounds}
              opacity={0.7}
            />
          )}

          {/* Render GeoJSON layers */}
          {Object.entries(geoJsonLayers).map(([layerId, geojson]) => {
            const layer = layers.find(l => l.id === layerId);
            if (!layer || !layer.visible) return null;

            return (
              <GeoJSON
                key={layerId}
                data={geojson}
                style={getLayerStyle(layerId)}
              />
            );
          })}
        </MapContainer>

      {/* Layer Control Panel - Top Right */}
      {layers.length > 0 && (
        <div className="absolute top-20 right-4 z-[1000] max-w-sm">
          <LayerControl 
            layers={layers.filter(l => !l.alwaysLoad)} 
            onLayerToggle={handleLayerToggle} 
          />
        </div>
      )}
      
      {/* Legend Panel - Bottom Right */}
      {geoTiffImage && layers.find(l => l.id === 'twi')?.visible && (
        <div className="absolute bottom-4 left-4 z-[1000] max-w-sm">
          <Legend />
        </div>
      )}
    </div>
  );
};

export default MapViewer;
