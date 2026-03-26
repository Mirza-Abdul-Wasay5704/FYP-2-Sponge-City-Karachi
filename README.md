# Sponge City Karachi

## Project Overview

**Sponge City Karachi** is an interactive geospatial analysis platform designed to support urban water management and flood risk assessment in Karachi, Pakistan. The project combines satellite imagery analysis, machine learning, and geospatial data processing to provide district-level insights for building resilient "sponge cities" that efficiently manage stormwater.

### Project Goals
- Analyze topographic wetness index (TWI) for watershed analysis
- Detect land use and land cover (LULC) patterns using satellite imagery
- Identify building locations and urban density through computer vision
- Provide an interactive mapping interface for urban planners and policymakers
- Support evidence-based decision-making for stormwater management infrastructure

---

## Technology Stack

### Backend
- **Framework**: Flask 3.0+ with Flask-CORS
- **Geospatial Processing**: 
  - Rasterio (GeoTIFF reading and processing)
  - NumPy (numerical analysis)
  - Folium (geospatial visualization)
- **Machine Learning**:
  - Ultralytics YOLO v8 (building detection)
  - Roboflow Inference SDK (LULC segmentation)
- **Image Processing**: Pillow (satellite image manipulation)
- **Python Version**: 3.9–3.12 (required for inference-sdk compatibility)

### Frontend
- **Framework**: React 19.2+ with Vite
- **Mapping**: Leaflet 1.9.4 and react-leaflet 5.0.0
- **Styling**: Tailwind CSS 4.1
- **GIS Libraries**:
  - shpjs (Shapefile parsing for district boundaries)
  - geotiff (GeoTIFF parsing for raster data visualization)
- **Build Tool**: Vite (fast bundling and HMR)
- **Code Quality**: ESLint + Tailwind CSS PostCSS

---

## Project Architecture & Flow

### 1. **Data Layer**
- **GeoTIFF Files**: Topographic Wetness Index (TWI) raster data for Korangi district
- **Shapefiles**: District boundaries and geographical features (landuse, water bodies, roads, POIs, etc.)
- **ML Models**:
  - `best.pt`: YOLO v8 model for building detection
  - Roboflow Hosted Model: For LULC classification (road, land, park, vegetation, river, water)
- **Satellite Cache**: Cached Esri World Imagery tiles for performance optimization

### 2. **Backend Processing Pipeline**

#### Endpoints Overview
| Endpoint | Purpose | Output |
|----------|---------|--------|
| `/api/status` | System health check | Model availability status |
| `/api/twi-points` | TWI sampling and analysis | Grid-based TWI statistics and satellite images |
| `/api/analyze-tile` | LULC & building detection | Segmentation masks and object detections |
| `/api/tiles/<district>` | Shapefile serving | GeoJSON district boundaries |

#### Key Processing Functions
1. **Satellite Image Fetching** (`fetch_satellite_image`):
   - Converts lat/lon coordinates to Web Mercator tile indexing
   - Stitches multiple Esri World Imagery tiles (256px each)
   - Creates 640×640 composite images
   - Caches results to optimize repeated queries

2. **TWI Analysis** (`/api/twi-points`):
   - Reads GeoTIFF raster data using Rasterio
   - Calculates grid-based patch statistics (min, max, mean, median, std)
   - Extracts representative coordinates from high/low TWI areas
   - Computes haversine distances for spatial analysis

3. **Satellite Image Analysis**:
   - YOLO Detection: Identifies buildings and structures
   - LULC Segmentation: Classifies land cover types (roads, parks, water, vegetation, etc.)
   - Returns color-coded masks overlaid on satellite imagery

### 3. **Frontend Visualization Pipeline**

#### Component Structure
- **DistrictSelector**: Dropdown to select analysis district
- **MapViewer**: Interactive Leaflet map with:
  - Shapefile layer rendering (district boundaries, roads, water bodies)
  - Satellite imagery overlays
  - Detection/segmentation results visualization
- **LayerControl**: Toggle visibility of different data layers
- **Legend**: Display color meanings for LULC classes
- **DiagnosticPanel**: System status and model availability
- **AnalysisDashboard**: Detailed analytics and statistics
- **LoadingSpinner**: UX feedback during data processing

#### Data Flow
```
District Selection → Fetch Boundaries → Render Map → Initiate Analysis 
→ Send Tile Request to Backend → Process with ML Models → Return Results 
→ Overlay on Map → Display Statistics
```

---

## Installation & Setup

### Prerequisites
- Python 3.9–3.12 (for backend)
- Node.js 16+ (for frontend)
- pip or conda (Python package manager)
- npm or yarn (Node.js package manager)

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create and activate virtual environment:**
   ```bash
   python -m venv venv
   ```
   
   **Windows (PowerShell):**
   ```powershell
   .\venv\Scripts\Activate.ps1
   ```
   
   **Windows (Command Prompt):**
   ```cmd
   venv\Scripts\activate.bat
   ```
   
   **macOS/Linux:**
   ```bash
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the server:**
   ```bash
   python app.py
   ```
   - Backend will run on `http://localhost:5000`
   - CORS is enabled for frontend communication

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```
   - Frontend will run on `http://localhost:5173` (Vite default)

### Running the Full Application

**Option 1: Two separate terminals**
- Terminal 1: `cd backend && .\venv\Scripts\Activate.ps1 && python app.py`
- Terminal 2: `cd frontend && npm run dev`

**Option 2: Single integrated terminal**
- Run both commands concurrently or in background

**Access the application:**
- Open browser and navigate to `http://localhost:5173`
- Backend API is available at `http://localhost:5000`

---

## Key Features

### Current Implementation
✅ Interactive district selection and mapping  
✅ Satellite imagery fetching and caching  
✅ TWI (Topographic Wetness Index) analysis with statistical summaries  
✅ YOLO-based building detection  
✅ Roboflow LULC segmentation (road, water, vegetation, parks, etc.)  
✅ Color-coded visualization of detection results  
✅ Shapefile rendering for district boundaries and geographic features  
✅ Multi-layer mapping with Leaflet  

### Extensibility
- Modular backend API design allows easy addition of new analysis endpoints
- Frontend component architecture supports new visualization types
- ML models can be swapped or updated (Roboflow hosted model URL configurable)
- Satellite imagery provider can be changed (currently Esri World Imagery)

---

## Project Structure

```
FYP-1-Sponge-City-Karachi/
├── backend/
│   ├── app.py                 # Flask API server
│   ├── requirements.txt       # Python dependencies
│   ├── prepare_data.py        # Data preparation utility
│   ├── analyze_twi.py         # TWI analysis utilities
│   ├── detect_stats.py        # Detection statistics
│   ├── get_coord.py           # Coordinate utilities
│   ├── data/
│   │   └── Korangi_TWI.tif    # TWI raster data
│   ├── models/
│   │   └── best.pt            # YOLO v8 building detection model
│   └── sat_cache/             # Cached satellite imagery
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Main application component
│   │   ├── main.jsx           # React entry point
│   │   ├── App.css            # Application styles
│   │   ├── index.css          # Global styles
│   │   └── components/
│   │       ├── MapViewer.jsx
│   │       ├── DistrictSelector.jsx
│   │       ├── AnalysisDashboard.jsx
│   │       ├── DiagnosticPanel.jsx
│   │       ├── LayerControl.jsx
│   │       ├── Legend.jsx
│   │       └── LoadingSpinner.jsx
│   ├── public/
│   │   ├── Layers/            # Shapefiles (district data)
│   │   └── test.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── eslint.config.js
│
├── .gitignore                 # Git ignore rules (root level)
└── README.md
```

---

## Configuration & Environment Variables

### Backend
- **Flask Configuration**: Defaults to `http://localhost:5000`
- **CORS Settings**: Configured to allow frontend requests
- **Model Paths**: 
  - TWI data: `backend/data/Korangi_TWI.tif`
  - YOLO model: `backend/models/best.pt`
  - Roboflow API: Available if `inference-sdk` installed
- **Cache Directory**: `backend/sat_cache/` (auto-created)

### Frontend
- **Backend API Base**: Configured to connect to `http://localhost:5000`
- **Map Defaults**: Centered on Karachi coordinates
- **Tile Zoom Level**: Default zoom 17 for satellite imagery

---

## Geospatial Data Reference

### Available Shapefiles (Korangi District)
- `korangi_landuse.shp`: Land use classification
- `korangi_natural.shp`: Natural features
- `korangi_places.shp`: Named places and landmarks
- `korangi_pofw.shp`: Places of worship
- `korangi_pois.shp`: Points of interest
- `korangi_roads.shp`: Road network
- `korangi_water.shp`: Water bodies
- `korangi_waterways.shp`: Streams and waterways
- `new_korangi.shp`: Updated district boundary

### LULC Color Scheme
| Class | RGB | Meaning |
|-------|-----|---------|
| Road | (160, 32, 240) | Purple - Paved roads |
| Land | (139, 69, 19) | Brown - Bare land |
| Park | (0, 200, 0) | Green - Parks and recreation |
| Vegetation | (0, 150, 0) | Dark Green - Dense vegetation |
| River | (0, 0, 255) | Blue - Major water bodies |
| Water | (0, 191, 255) | Light Blue - Water features |

---

## ML Model Details

### Building Detection (YOLO v8)
- **Model**: `best.pt` (trained custom YOLO v8)
- **Input**: 640×640 RGB satellite imagery
- **Output**: Bounding boxes with confidence scores
- **Purpose**: Identify buildings and structures for urban density analysis

### LULC Segmentation (Roboflow)
- **Model**: Hosted on Roboflow platform
- **Input**: 640×640 RGB satellite imagery
- **Output**: Pixel-level classification masks (6 classes)
- **Purpose**: Land cover type identification for urban planning

### TWI Analysis (Raster Processing)
- **Data**: GeoTIFF raster (1-band elevation-derived)
- **Processing**: NumPy-based statistical analysis
- **Output**: Grid-based statistics and high/low TWI coordinates
- **Purpose**: Identify areas prone to water accumulation and flooding

---

## Build & Deployment

### Frontend Build
```bash
cd frontend
npm run build
```
Generates optimized production build in `frontend/dist/`

### Lint & Code Quality
```bash
cd frontend
npm run lint
```
Runs ESLint to check code quality

### Testing (Future Enhancement)
Currently no automated tests configured. Recommended: Vitest + React Testing Library

---

## Troubleshooting

### Backend Issues
- **Models not loading**: Ensure `best.pt` exists in `backend/models/` and inference-sdk is installed
- **TWI data missing**: Check `backend/data/Korangi_TWI.tif` exists
- **CORS errors**: Backend Flask app has CORS enabled; verify frontend URL is correct

### Frontend Issues
- **Map not loading**: Ensure backend is running on `localhost:5000`
- **Shapefiles not rendering**: Check `public/Layers/` files exist
- **Build errors**: Try `npm install` again or clear `node_modules/`

### Virtual Environment Issues
- **Python not found**: Ensure Python 3.9+ is installed
- **Dependency conflicts**: Try creating a fresh venv and reinstalling

---

## Future Enhancements

- [ ] Backend API caching layer for repeated queries
- [ ] WebSocket support for real-time streaming analysis
- [ ] Time-series satellite imagery comparison
- [ ] 3D terrain visualization
- [ ] Mobile-responsive UI improvements
- [ ] User authentication and project saving
- [ ] Advanced flood risk modeling
- [ ] Integration with IoT sensor data
- [ ] Automated report generation

---

## Contributors & Attribution

**Project**: FYP-1 Sponge City Karachi  
**Institution**: [Your University]  
**Advisor**: [Advisor Name]  

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) file for details.

---

# Context Prompt For AI

## Purpose & Motivation

**Project Name**: Sponge City Karachi  
**Domain**: Urban Water Management, Geospatial Analysis, ML-Powered Urban Planning  
**Target Users**: Urban planners, environmental scientists, municipal engineers, policymakers in Karachi  
**Problem Statement**: Karachi faces recurring flooding and inadequate stormwater management. This platform provides data-driven insights for implementing "sponge city" principles—urban infrastructure designed to absorb, store, and reuse stormwater. By analyzing topographic, land use, and building density patterns, stakeholders can identify optimal locations for green infrastructure, retention ponds, and permeable surfaces.

---

## Core Technical Architecture

### Three-Tier Application Model
1. **Data Layer**: Geospatial rasters (GeoTIFF), vector shapefiles, ML models
2. **Processing Layer**: Flask REST API with Python data science stack
3. **Presentation Layer**: React/Leaflet interactive web mapping interface

### Key Technologies to Know
- **GIS/Geospatial**: Rasterio (raster I/O), Shapefile parsing, coordinate transformations (Haversine, Web Mercator)
- **ML/CV**: YOLO v8 (object detection), Roboflow (segmentation), NumPy array operations
- **Web Stack**: Flask (Python backend), React (JavaScript frontend), Leaflet (mapping library)
- **Data Formats**: GeoTIFF (raster), Shapefile (vector), JSON (API), PNG/JPEG (imagery)

---

## Critical Project Context

### Analysis Pipeline Breakdown

#### 1. **District Selection & Initialization**
- User selects a district (currently Korangi)
- Frontend fetches district boundary shapefile from `public/Layers/`
- Leaflet renders district polygon on map

#### 2. **Satellite Imagery Retrieval**
- Given lat/lon coordinate, backend converts to Web Mercator tile indices
- Fetches 3×3 grid of 256×256 tiles from Esri World Imagery
- Stitches tiles into 640×640 composite image
- **Caches result** in `backend/sat_cache/` with key format: `{lat}_{lon}_z{zoom}.jpg`
- Returns cached image on subsequent requests (optimization)

#### 3. **TWI (Topographic Wetness Index) Analysis**
- Location: `backend/data/Korangi_TWI.tif` (geospatial raster)
- Endpoint: `/api/twi-points` accepts query params: `patches` (grid count), `radius` (km filtering)
- Processing:
  - Reads GeoTIFF into NumPy array
  - Divides area into N² grid patches (e.g., 3×3, 4×3 for better aspect ratio)
  - Calculates statistics per patch: min, max, mean, median, std-dev
  - Identifies "representative" cells (high and low TWI)
  - Returns coordinates of these cells + satellite image
- Output: Used to identify flood-prone areas (high TWI = water accumulation prone)

#### 4. **Building Detection (YOLO)**
- Endpoint: `/api/analyze-tile` sends 640×640 satellite image to YOLO model
- Model: `backend/models/best.pt` (custom-trained YOLO v8)
- Output: Bounding boxes with confidence, class labels, pixel coordinates
- Visualization: Frontend renders boxes as overlays on satellite map
- Purpose: Urban density mapping, infrastructure planning

#### 5. **LULC Segmentation (Land Use/Land Cover)**
- Endpoint: `/api/analyze-tile` also sends image to Roboflow hosted model
- Classes: road, land, park, vegetation, river, water
- Output: Pixel-level class predictions (segmentation mask)
- Visualization: Color-coded overlay (see color scheme in README)
- Purpose: Understand urban structure, green space identification, water boundary detection

#### 6. **Result Visualization**
- Frontend overlays all results on base map
- Layer control allows toggling visibility
- Legend shows color meanings
- Analysis dashboard displays statistics and insights

---

## Data Flow Diagrams

### Frontend-to-Backend Communication
```
Frontend                          Backend
  ↓                                 ↓
React Component          →         Flask Route
  (District Choice)
       ↓                            ↓
State Management         ←        JSON Response
  (Selected District)
       ↓                            ↓
MapViewer Component      ←    GeoJSON Boundary
  (Renders Boundary)
       ↓                            ↓
User Clicks "Analyze"    →    /api/twi-points
  (Coordinates)
       ↓                            ↓
             Loading Spinner
       ↓                            ↓
AnalysisDashboard        ←    Statistics + Image
  (Displays Results)
```

---

## Key Dependencies & Why They Matter

| Dependency | Layer | Purpose | Critical? |
|------------|-------|---------|-----------|
| Flask | Backend | REST API server | ✅ Yes |
| Rasterio | Backend | Read GeoTIFF files (TWI data) | ✅ Yes |
| YOLO (Ultralytics) | Backend | Building detection model | ✅ Yes |
| Roboflow SDK | Backend | LULC segmentation model | ⚠️ Optional (graceful fallback) |
| NumPy | Backend | Raster data manipulation | ✅ Yes |
| Pillow | Backend | Image composition/cropping | ✅ Yes |
| React | Frontend | UI framework | ✅ Yes |
| Leaflet | Frontend | Map rendering | ✅ Yes |
| shpjs | Frontend | Shapefile parsing in browser | ✅ Yes |
| geotiff | Frontend | GeoTIFF parsing (raster viz) | ⚠️ Optional (alternative: server-render) |

---

## Important File Locations & Their Roles

| File/Folder | Purpose | Critical Data |
|----------|---------|----------------|
| `backend/app.py` | Flask server definition, all API routes | Main processing logic |
| `backend/data/Korangi_TWI.tif` | Topographic wetness index raster | Primary geospatial dataset |
| `backend/models/best.pt` | YOLO building detection model | ML model weights |
| `backend/sat_cache/` | Cached satellite tiles | Performance optimization |
| `frontend/src/components/MapViewer.jsx` | Main map UI component | Map rendering & interaction |
| `frontend/public/Layers/` | Shapefiles (district boundaries, roads, etc.) | Geospatial vector data |
| `frontend/src/components/AnalysisDashboard.jsx` | Results display & statistics | Analytics UI |
| `.gitignore` | Root-level (protects both backend/frontend) | Excludes venv, node_modules, __pycache__ |

---

## Important Implementation Details

### Coordinate Systems
- **Map Display**: Leaflet uses WGS84 (EPSG:4326) - lat/lon
- **Tile Indexing**: Web Mercator (EPSG:3857) - x/y tiles
- **Raster Data**: Defined by GeoTIFF transform (affine matrix) - converts pixel coords to lat/lon
- **Haversine Calculation**: For distance filtering (great circle distance on Earth)

### Performance Optimizations
- **Satellite Image Caching**: Results stored locally to avoid repeated downloads
- **Tile Grid Calculation**: Optimized grid aspect ratio for better patch representation
- **Lazy Model Loading**: YOLO/Roboflow only loaded if requested (graceful degradation)
- **CORS Enabled**: Prevents cross-origin issues between frontend (5173) and backend (5000)

### Error Handling
- Missing models don't crash backend (status endpoint reports availability)
- Bad shapefile data gracefully renders partial results
- Network timeout on Esri tiles → attempts fallback or returns cached version
- Invalid coordinates → validation before processing

---

## Current Capabilities & Known Limitations

### What Works Well
✅ District boundary visualization  
✅ Satellite imagery fetching & caching  
✅ TWI grid analysis with statistics  
✅ Building detection visualization  
✅ LULC segmentation with color coding  
✅ Interactive Leaflet map with layer controls  

### Known Limitations / Future Opportunities
❌ No user authentication  
❌ No time-series analysis (single snapshot approach)  
❌ Limited to Korangi district (can extend to other districts by adding shapefiles)  
❌ YOLO/Roboflow model performance not quantified (no validation metrics in code)  
❌ No IoT sensor integration  
❌ No report generation or export features  
❌ No automated testing suite  
❌ No 3D visualization (only 2D map)  

---

## Development Workflow for AI/LLM Context

When contributing or extending this project, an AI assistant should:

1. **Understand the domain**: Urban water management, sponge city principles, flood mitigation
2. **Know the architecture**: Frontend (React/Leaflet) ↔ Backend (Flask/YOLO/Rasterio) ↔ Data (shapefiles, GeoTIFFs, models)
3. **Check dependencies**: Always verify which packages are installed before suggesting new imports
4. **Consider geospatial transforms**: Lat/lon ↔ pixel coordinates ↔ map projection
5. **Test end-to-end**: Changes might affect either frontend visualization or backend API
6. **Maintain backward compatibility**: Avoid breaking existing API endpoints
7. **Document assumptions**: Coordinate systems, file locations, model availability
8. **Consider caching**: Backend results can be cached; frontend may need invalidation strategies
9. **Be aware of ML model limits**: YOLO/Roboflow are inference-only (no retraining in this codebase)
10. **Reference geospatial best practices**: Use standard projections, validate coordinates, handle nodata properly

---

## Example Enhancement Scenarios

### Scenario 1: Add Time-Series Analysis
- **What to do**: Implement `/api/twi-timeseries` endpoint that fetches satellite imagery from multiple dates
- **Geospatial considerations**: Different satellite providers have different coverage schedules
- **Frontend changes**: Add date picker, animation controls to MapViewer
- **Data storage**: Consider storing historical results or linking to satellite archives

### Scenario 2: Integrate IoT Sensor Data
- **What to do**: Add `/api/sensor-readings` endpoint that accepts lat/lon/timestamp/water-level
- **Backend**: Store in database (SQLite or PostgreSQL), correlate with TWI predictions
- **Frontend**: Display sensor locations as markers, show real-time water levels
- **AI context needed**: Database schema design, real-time data validation

### Scenario 3: Improve Building Detection Accuracy
- **What to do**: Fine-tune YOLO model with Karachi-specific training data
- **Current limitation**: `best.pt` model accuracy unknown; no retraining script exists
- **Recommendation**: Add `backend/train_yolo.py` for model retraining pipeline
- **Validation**: Implement `/api/validate-detections` endpoint for manual labeling feedback

### Scenario 4: Add Report Generation
- **What to do**: Create `/api/generate-report` endpoint that produces PDF/GeoJSON exports
- **Frontend**: Add "Download Report" button to AnalysisDashboard
- **Libraries**: Use `reportlab` or `jinja2` for PDF generation
- **Data**: Include TWI statistics, LULC percentages, building counts, recommendations

---

## Testing & Validation Approach

### Backend Testing
- Test API endpoints with sample coordinates
- Validate GeoTIFF reading against known TWI values
- Mock Roboflow/YOLO if unavailable during dev
- Check satellite image cache hits/misses

### Frontend Testing
- Verify shapefile rendering with district boundaries
- Test layer toggle functionality
- Simulate network delays (mock API responses)
- Check responsive design on mobile

### End-to-End Validation
- Full workflow: District selection → Analysis → Visualization
- Coordinate boundary checking (ensure queries within district bounds)
- Model availability status reporting

---

## Questions for Clarification (If Extending)

Before making major changes, ask:
1. Should changes maintain backward compatibility with existing API?
2. Are new datasets being added (vector/raster)?
3. Do new features require database persistence?
4. Will new ML models be added or existing ones fine-tuned?
5. Should results be cached indefinitely or invalidated after time?
6. Is user authentication needed for new features?
7. What geographic areas should be supported (currently Korangi; expand?)?
8. Are there performance constraints (response times, memory usage)?

---

**This context document should be the starting point for any AI/LLM assistance on this project. It encapsulates the motivation, architecture, data flow, technical decisions, and extension opportunities.**
