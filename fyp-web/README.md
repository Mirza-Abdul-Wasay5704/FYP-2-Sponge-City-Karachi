# Karachi GeoSpatial Viewer

A modern React web application for visualizing geospatial data across Karachi's districts, featuring interactive maps, GeoTIFF visualization, and shapefile layer controls.

## Features

- 🗺️ **Interactive District Selection** - Choose from 7 Karachi districts
- 📊 **GeoTIFF Visualization** - View topographic wetness index (TWI) raster data
- 🛣️ **Vector Layers** - Toggle multiple shapefile layers (roads, land use, waterways, POIs, etc.)
- 🎨 **Modern Dark Theme** - Professional UI with smooth animations
- 📱 **Responsive Design** - Works on desktop and mobile devices

## Tech Stack

- **Frontend**: React 19 with Vite
- **Styling**: Tailwind CSS
- **Maps**: Leaflet & React-Leaflet
- **Geospatial**: geotiff.js, shpjs
- **Backend**: Python 3.13

## Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Open browser** at `http://localhost:5173`

## Available Districts

✅ **Korangi District** - Complete with GeoTIFF and shapefiles
- Karachi District (South)
- Gulshan District (East)
- Nazimabad District (Central)
- Orangi District (West)
- Malir District
- Keamari District

## Development

- `npm run dev` - Start dev server
- `npm run build` - Build for production
- `npm run preview` - Preview build
- `npm run lint` - Run linter

## Credits

Built with React, Leaflet, Tailwind CSS, GeoTIFF.js, and shpjs.

© 2025 Karachi GeoSpatial Viewer

## Quick Start

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
