"""
Sponge City Karachi — Flask API Backend
Serves TWI analysis and LULC / building detection endpoints.
"""

import logging
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import json
import hashlib
import rasterio
import numpy as np
import math
import os
import io
import base64
from PIL import Image, ImageDraw
from collections import defaultdict
import requests as http_requests
import pandas as pd
from google import genai
from google.genai import types
import random
from dotenv import load_dotenv

load_dotenv()

# ── Logging Setup ─────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger('SpongeCity')

app = Flask(__name__)
CORS(app)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TWI_PATH = os.path.join(SCRIPT_DIR, "data", "Korangi_TWI.tif")
YOLO_MODEL_PATH = os.path.join(SCRIPT_DIR, "models", "best.pt")
CACHE_DIR = os.path.join(SCRIPT_DIR, "sat_cache")
DETECT_CACHE_DIR = os.path.join(SCRIPT_DIR, "detect_cache")
os.makedirs(CACHE_DIR, exist_ok=True)
os.makedirs(DETECT_CACHE_DIR, exist_ok=True)

# ── Optional heavy dependencies ──────────────────────────────────────────────
HAS_ROBOFLOW = False
HAS_YOLO = False
try:
    from inference_sdk import InferenceHTTPClient
    HAS_ROBOFLOW = True
except ImportError:
    pass
try:
    from ultralytics import YOLO
    HAS_YOLO = True
except ImportError:
    pass

LULC_COLORS = {
    "road":       (160,  32, 240),
    "land":       (139,  69,  19),
    "park":       (  0, 200,   0),
    "vegetation": (  0, 150,   0),
    "river":      (  0,   0, 255),
    "water":      (  0, 191, 255),
}
LULC_OPACITY = 0.45

# ── Soil type to infiltration rate mapping (mm/hr) ───────────────────────────
SOIL_INFILTRATION = {
    "Acrisols":     {"rate": (5, 15),   "desc": "Acid soils with clay accumulation", "drainage": "Moderate"},
    "Alisols":      {"rate": (3, 10),   "desc": "Aluminium-rich acid soils", "drainage": "Moderate-Poor"},
    "Andosols":     {"rate": (30, 80),  "desc": "Volcanic ash soils, very porous", "drainage": "Excellent"},
    "Arenosols":    {"rate": (50, 120), "desc": "Sandy soils, very fast drainage", "drainage": "Excellent"},
    "Calcisols":    {"rate": (5, 15),   "desc": "Calcium carbonate-rich arid soils", "drainage": "Moderate"},
    "Cambisols":    {"rate": (10, 25),  "desc": "Young developing soils", "drainage": "Good"},
    "Chernozems":   {"rate": (10, 30),  "desc": "Dark, humus-rich grassland soils", "drainage": "Good"},
    "Cryosols":     {"rate": (1, 5),    "desc": "Permafrost soils", "drainage": "Very Poor"},
    "Durisols":     {"rate": (2, 8),    "desc": "Hardpan cemented soils", "drainage": "Poor"},
    "Ferralsols":   {"rate": (15, 40),  "desc": "Deeply weathered tropical soils", "drainage": "Good"},
    "Fluvisols":    {"rate": (10, 25),  "desc": "River/floodplain deposit soils", "drainage": "Moderate-Good"},
    "Gleysols":     {"rate": (1, 5),    "desc": "Waterlogged, saturated soils", "drainage": "Very Poor"},
    "Gypsisols":    {"rate": (5, 15),   "desc": "Gypsum-rich desert soils", "drainage": "Moderate"},
    "Histosols":    {"rate": (2, 10),   "desc": "Organic/peat soils", "drainage": "Poor"},
    "Kastanozems":  {"rate": (8, 20),   "desc": "Chestnut-colored steppe soils", "drainage": "Moderate-Good"},
    "Leptosols":    {"rate": (5, 15),   "desc": "Very thin soils over hard rock", "drainage": "Moderate"},
    "Lixisols":     {"rate": (5, 15),   "desc": "Weathered soils with clay", "drainage": "Moderate"},
    "Luvisols":     {"rate": (5, 15),   "desc": "Fertile soils with clay migration", "drainage": "Moderate"},
    "Nitisols":     {"rate": (15, 35),  "desc": "Deep red tropical clay soils", "drainage": "Good"},
    "Phaeozems":    {"rate": (10, 25),  "desc": "Dark, organic-rich prairie soils", "drainage": "Good"},
    "Planosols":    {"rate": (1, 5),    "desc": "Stagnic soils with abrupt clay", "drainage": "Very Poor"},
    "Plinthosols":  {"rate": (3, 10),   "desc": "Iron-rich hardening soils", "drainage": "Poor"},
    "Podzols":      {"rate": (15, 40),  "desc": "Sandy acidic forest soils", "drainage": "Good"},
    "Regosols":     {"rate": (15, 35),  "desc": "Unconsolidated loose material", "drainage": "Good"},
    "Solonchaks":   {"rate": (2, 8),    "desc": "Salt-rich coastal/arid soils", "drainage": "Poor"},
    "Solonetz":     {"rate": (1, 5),    "desc": "Sodium-rich, impermeable soils", "drainage": "Very Poor"},
    "Stagnosols":   {"rate": (1, 5),    "desc": "Periodically waterlogged soils", "drainage": "Very Poor"},
    "Umbrisols":    {"rate": (10, 25),  "desc": "Acid, dark topsoil mountain soils", "drainage": "Good"},
    "Vertisols":    {"rate": (1, 5),    "desc": "Heavy swelling/shrinking clay", "drainage": "Very Poor"},
}

# ── API Keys & Gemini Settings ──────────────────────────────────────────────
GEMINI_API_KEYS = [k.strip() for k in os.getenv("GEMINI_API_KEYS", "").split(",") if k.strip()]
GEOAPIFY_API_KEY = os.getenv("GEOAPIFY_API_KEY", "")
ROBOFLOW_API_KEY = os.getenv("ROBOFLOW_API_KEY", "bOsI0YAMQAReoiyOEOSK")

def get_genai_client():
    """Rotate keys to prevent quota exhaustion."""
    if not GEMINI_API_KEYS:
        raise Exception("No Gemini API keys configured in .env")
    key = random.choice(GEMINI_API_KEYS)
    logger.info(f"Using Gemini key ending in ...{key[-6:]}")
    return genai.Client(api_key=key)

SYSTEM_INSTRUCTION = """
You are a highly specialized Climate & Urban Flooding Expert Assistant exclusively for Karachi, Pakistan.
Your sole purpose is to answer questions related to Karachi's weather, rain, urban flooding, climate change impacts, forecasting, and soil infiltration.

RULES:
1. ONLY answer queries directly related to Karachi's climate, weather, or flooding.
2. If the user asks about ANYTHING ELSE (e.g. general knowledge, coding, cooking, politics, other cities), YOU MUST REFUSE TO ANSWER and politely redirect them to ask about Karachi's climate.
3. Use the provided context (Historical data features, cached detection data showing soil types, built environments, and flooding risks) to back your answers.
4. Keep answers concise, factual, and formatted beautifully using markdown.
"""

CSV_PATH = os.path.join(SCRIPT_DIR, "data", "Karachi_25Years_Full_ML_Ready.csv")

# ── Utilities ─────────────────────────────────────────────────────────────────
def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    return 2 * R * math.asin(math.sqrt(a))


def lat_lon_to_tile(lat, lon, zoom):
    lat_rad = math.radians(lat)
    n = 2 ** zoom
    x = int((lon + 180.0) / 360.0 * n)
    y = int((1.0 - math.log(math.tan(lat_rad) + 1.0 / math.cos(lat_rad))
             / math.pi) / 2.0 * n)
    return x, y
print("")

def fetch_satellite_image(lat, lon, zoom=17, grid_size=3):
    """Fetch Esri World Imagery tiles and stitch into a 640×640 image."""
    cache_key = f"{lat:.6f}_{lon:.6f}_z{zoom}"
    cache_path = os.path.join(CACHE_DIR, f"{cache_key}.jpg")
    if os.path.exists(cache_path):
        return Image.open(cache_path), cache_path

    cx, cy = lat_lon_to_tile(lat, lon, zoom)
    half = grid_size // 2
    canvas = Image.new("RGB", (grid_size * 256, grid_size * 256))
    headers = {"User-Agent": "SpongeCityKarachi/1.0"}

    for dy in range(-half, half + 1):
        for dx in range(-half, half + 1):
            url = (f"https://server.arcgisonline.com/ArcGIS/rest/services/"
                   f"World_Imagery/MapServer/tile/{zoom}/{cy + dy}/{cx + dx}")
            try:
                resp = http_requests.get(url, timeout=15, headers=headers)
                if resp.status_code == 200:
                    tile = Image.open(io.BytesIO(resp.content))
                    canvas.paste(tile, ((dx + half) * 256, (dy + half) * 256))
            except Exception:
                pass

    w, h = canvas.size
    left, top = (w - 640) // 2, (h - 640) // 2
    cropped = canvas.crop((left, top, left + 640, top + 640))
    cropped.save(cache_path, "JPEG", quality=90)
    return cropped, cache_path


# ── Routes ────────────────────────────────────────────────────────────────────
@app.route("/api/status")
def status():
    return jsonify({
        "twi_available": os.path.exists(TWI_PATH),
        "roboflow_available": HAS_ROBOFLOW,
        "yolo_available": HAS_YOLO,
        "yolo_model_exists": os.path.exists(YOLO_MODEL_PATH),
    })


@app.route("/api/clear-cache", methods=["POST"])
def clear_cache():
    """Clear detection cache so pipeline can be re-run with updated models."""
    import glob
    count = 0
    for f in glob.glob(os.path.join(DETECT_CACHE_DIR, "*.json")):
        try:
            os.remove(f)
            count += 1
        except Exception:
            pass
    return jsonify({"cleared": count})


@app.route("/api/twi-points")
def twi_points():
    num_patches = int(request.args.get("patches", 9))
    min_radius_km = float(request.args.get("radius", 1.0))

    if num_patches < 1 or num_patches > 100:
        return jsonify({"error": "Patches must be 1-100"}), 400

    # Best square-ish grid
    best_r, best_c = 1, num_patches
    for r in range(1, num_patches + 1):
        if num_patches % r == 0:
            c = num_patches // r
            if abs(r - c) < abs(best_r - best_c):
                best_r, best_c = r, c
    grid_rows, grid_cols = best_r, best_c

    with rasterio.open(TWI_PATH) as src:
        twi_data = src.read(1)
        nodata = src.nodata
        transform = src.transform
        height, width = twi_data.shape

        twi_masked = (np.where(twi_data == nodata, np.nan, twi_data)
                      if nodata is not None else twi_data.astype(float))

        valid = twi_masked[~np.isnan(twi_masked)]
        twi_stats = {
            "min":    round(float(np.min(valid)), 4),
            "max":    round(float(np.max(valid)), 4),
            "mean":   round(float(np.mean(valid)), 4),
            "median": round(float(np.median(valid)), 4),
            "std":    round(float(np.std(valid)), 4),
        }

        patch_h = height // grid_rows
        patch_w = width  // grid_cols
        used_h  = patch_h * grid_rows
        used_w  = patch_w * grid_cols
        twi_trimmed = twi_masked[:used_h, :used_w]

        def px2ll(r, c):
            x, y = rasterio.transform.xy(transform, r, c)
            return y, x  # lat, lon

        patch_candidates = []
        patch_polygons   = []

        for pr in range(grid_rows):
            for pc in range(grid_cols):
                rs, re = pr * patch_h, (pr + 1) * patch_h
                cs, ce = pc * patch_w, (pc + 1) * patch_w
                patch = twi_trimmed[rs:re, cs:ce]
                if np.all(np.isnan(patch)):
                    continue

                vm = ~np.isnan(patch)
                vv = patch[vm]
                vr, vc = np.where(vm)
                order = np.argsort(vv)[::-1]
                sorted_px = list(zip(vv[order].tolist(),
                                     (vr[order] + rs).tolist(),
                                     (vc[order] + cs).tolist()))

                pid = pr * grid_cols + pc + 1
                patch_candidates.append((pid, sorted_px))

                tl = px2ll(rs, cs)
                tr = px2ll(rs, ce - 1)
                br = px2ll(re - 1, ce - 1)
                bl = px2ll(re - 1, cs)
                patch_polygons.append({
                    "id": pid,
                    "corners": [list(tl), list(tr), list(br), list(bl), list(tl)],
                })

        # Greedy selection with distance constraint
        patch_candidates.sort(key=lambda x: x[1][0][0], reverse=True)
        kept = []

        def far_enough(lat, lon):
            return all(haversine_km(lat, lon, k["lat"], k["lon"]) >= min_radius_km
                       for k in kept)

        for pid, pixels in patch_candidates:
            for val, row, col in pixels:
                lat, lon = px2ll(int(row), int(col))
                if far_enough(lat, lon):
                    kept.append({"patch": pid,
                                 "max_twi": round(float(val), 4),
                                 "lat": round(lat, 6),
                                 "lon": round(lon, 6)})
                    break

    return jsonify({
        "grid":       {"rows": grid_rows, "cols": grid_cols},
        "rasterSize": {"height": height, "width": width},
        "patchSize":  {"height": patch_h, "width": patch_w},
        "points":     kept,
        "patches":    patch_polygons,
        "twiStats":   twi_stats,
    })


@app.route("/api/detect", methods=["POST"])
def detect():
    data = request.json
    lat, lon = float(data["lat"]), float(data["lon"])
    patch_id = data.get("patch", 0)
    logger.info(f"[DETECT] Starting for patch {patch_id} at ({lat}, {lon})")

    # ── Check detection cache ─────────────────────────────────────────────
    cache_key = f"patch_{patch_id}_{lat:.6f}_{lon:.6f}"
    cache_path = os.path.join(DETECT_CACHE_DIR, f"{cache_key}.json")
    if os.path.exists(cache_path):
        try:
            with open(cache_path, "r") as f:
                cached = json.load(f)
            cached["patch"] = patch_id
            cached["cached"] = True
            logger.info(f"[DETECT] Returning cached result for patch {patch_id}")
            return jsonify(cached)
        except Exception as e:
            logger.warning(f"[DETECT] Corrupted cache for {cache_key}: {e}")

    result = {"patch": patch_id, "lat": lat, "lon": lon,
              "lulc": {}, "buildings": 0, "building_stats": None,
              "lulc_error": None, "building_error": None,
              "image": None, "satellite_image": None,
              "soil": None, "soil_error": None}

    # 1 — Satellite image
    try:
        sat_img, img_path = fetch_satellite_image(lat, lon)
    except Exception as e:
        result["image_error"] = str(e)
        return jsonify(result)

    img_w, img_h = sat_img.size
    total_px = img_w * img_h

    # Prepare annotated image
    annotated = sat_img.copy().convert("RGBA")
    overlay   = Image.new("RGBA", (img_w, img_h), (0, 0, 0, 0))
    draw_ov   = ImageDraw.Draw(overlay)

    # 2 — LULC via Roboflow
    if HAS_ROBOFLOW:
        try:
            client = InferenceHTTPClient(
                api_url="https://serverless.roboflow.com",
                api_key=ROBOFLOW_API_KEY,
            )
            lulc_raw = client.run_workflow(
                workspace_name="detect-it",
                workflow_id="general-segmentation-api-12",
                images={"image": img_path},
                parameters={"classes": "road, land, park, vegetation, river"},
                use_cache=True,
            )
            predictions = (
                lulc_raw[0].get("predictions", {}).get("predictions", [])
                or lulc_raw[0].get("predictions", [])
                or lulc_raw[0].get("output", {}).get("predictions", [])
            )

            union_mask   = defaultdict(lambda: np.zeros((img_h, img_w), np.uint8))
            class_counts = defaultdict(int)

            for pred in predictions:
                label  = pred.get("class", "unknown").lower().strip()
                points = pred.get("points", [])
                if not points:
                    continue
                rgb   = LULC_COLORS.get(label, (128, 128, 128))
                alpha = int(255 * LULC_OPACITY)
                poly  = [(int(p["x"]), int(p["y"])) for p in points]
                draw_ov.polygon(poly, fill=(*rgb, alpha), outline=(*rgb, 200))

                m = Image.new("L", (img_w, img_h), 0)
                ImageDraw.Draw(m).polygon(poly, fill=255)
                ma = np.array(m)
                union_mask[label] = np.maximum(union_mask[label], ma)
                class_counts[label] += 1

            lulc = {}
            for cls, mask in union_mask.items():
                area = int((mask > 0).sum())
                lulc[cls] = {"area_pct": round(area / total_px * 100, 2),
                             "segments": class_counts[cls]}
            result["lulc"] = lulc

        except Exception as e:
            result["lulc_error"] = str(e)
    else:
        result["lulc_error"] = "Roboflow SDK not installed (pip install inference-sdk)"

    annotated = Image.alpha_composite(annotated, overlay)

    # 3 — Buildings via YOLO
    if HAS_YOLO and os.path.exists(YOLO_MODEL_PATH):
        try:
            yolo     = YOLO(YOLO_MODEL_PATH)
            yolo_res = yolo.predict(source=img_path, conf=0.03, iou=0.30,
                                    imgsz=640, verbose=False)
            boxes     = yolo_res[0].boxes
            bld_count = len(boxes)
            result["buildings"] = bld_count

            draw_ann = ImageDraw.Draw(annotated)
            bld_areas = []

            for i in range(bld_count):
                x1, y1, x2, y2 = map(int, boxes[i].xyxy[0].tolist())
                if yolo_res[0].masks is not None:
                    mask = yolo_res[0].masks[i].data[0].cpu().numpy()
                    mp   = Image.fromarray((mask * 255).astype(np.uint8))
                    mp   = mp.resize((img_w, img_h))
                    ma   = np.array(mp)
                    bld_areas.append(int((ma > 127).sum()))
                    bo = np.zeros((img_h, img_w, 4), dtype=np.uint8)
                    bo[ma > 127] = (255, 140, 0, 90)
                    annotated = Image.alpha_composite(annotated,
                                                      Image.fromarray(bo, "RGBA"))
                    draw_ann = ImageDraw.Draw(annotated)
                else:
                    bld_areas.append((x2 - x1) * (y2 - y1))
                draw_ann.rectangle([x1, y1, x2, y2], outline=(255, 200, 0, 255), width=2)

            if bld_areas:
                result["building_stats"] = {
                    "total_footprint_pct": round(sum(bld_areas) / total_px * 100, 2),
                    "avg_area_pct":  round(float(np.mean(bld_areas)) / total_px * 100, 4),
                    "largest_pct":   round(max(bld_areas) / total_px * 100, 4),
                    "smallest_pct":  round(min(bld_areas) / total_px * 100, 4),
                }
        except Exception as e:
            result["building_error"] = str(e)
    else:
        result["building_error"] = "YOLO not available (pip install ultralytics)"

    # 4 — Encode images
    ann_rgb = annotated.convert("RGB")
    buf = io.BytesIO()
    ann_rgb.save(buf, format="JPEG", quality=85)
    result["image"] = base64.b64encode(buf.getvalue()).decode()

    # Save physical images for lighter JSON cache
    ann_path = os.path.join(DETECT_CACHE_DIR, f"{cache_key}_annotated.jpg")
    sat_path = os.path.join(DETECT_CACHE_DIR, f"{cache_key}_satellite.jpg")
    ann_rgb.save(ann_path, format="JPEG", quality=85)
    
    # Using RGB is needed to save JPEG without transparency
    sat_img.convert("RGB").save(sat_path, format="JPEG", quality=85)

    result["image_path"] = f"/api/cache-image/{cache_key}_annotated.jpg"
    result["satellite_image_path"] = f"/api/cache-image/{cache_key}_satellite.jpg"

    # 5 — Soil classification via SoilGrids
    try:
        soil_url = (
            f"https://rest.isric.org/soilgrids/v2.0/classification/query"
            f"?lon={lon}&lat={lat}&number_classes=5"
        )
        soil_resp = http_requests.get(soil_url, timeout=15)
        if soil_resp.status_code == 200:
            soil_json = soil_resp.json()
            primary_class = soil_json.get("wrb_class_name", "Unknown")
            probabilities = soil_json.get("wrb_class_probability", [])

            # Map to infiltration rate
            soil_info = SOIL_INFILTRATION.get(primary_class, {
                "rate": (5, 15), "desc": "Unknown soil classification", "drainage": "Unknown"
            })
            avg_rate = round((soil_info["rate"][0] + soil_info["rate"][1]) / 2, 1)

            result["soil"] = {
                "primary_class": primary_class,
                "probabilities": probabilities,
                "description": soil_info["desc"],
                "drainage": soil_info["drainage"],
                "infiltration_min": soil_info["rate"][0],
                "infiltration_max": soil_info["rate"][1],
                "infiltration_avg": avg_rate,
            }
        else:
            result["soil_error"] = f"SoilGrids HTTP {soil_resp.status_code}"
    except Exception as e:
        result["soil_error"] = str(e)

    # 6 — Elevation & Geocoding Constraints
    try:
        elev_url = f"https://api.open-meteo.com/v1/elevation?latitude={lat}&longitude={lon}"
        elev_resp = http_requests.get(elev_url, timeout=10)
        if elev_resp.status_code == 200:
            result["elevation"] = elev_resp.json().get("elevation", [None])[0]
            logger.info(f"[DETECT] Elevation: {result['elevation']}m")
        else:
            result["elevation_error"] = str(elev_resp.status_code)
            logger.warning(f"[DETECT] Elevation API returned {elev_resp.status_code}")
    except Exception as e:
        result["elevation_error"] = str(e)
        logger.error(f"[DETECT] Elevation error: {e}")
        
    try:
        if GEOAPIFY_API_KEY:
            geo_url = f"https://api.geoapify.com/v1/geocode/reverse?lat={lat}&lon={lon}&apiKey={GEOAPIFY_API_KEY}"
            geo_resp = http_requests.get(geo_url, timeout=10)
            if geo_resp.status_code == 200:
                features = geo_resp.json().get("features", [])
                if features:
                    props = features[0].get("properties", {})
                    result["place_name"] = props.get("formatted", "Unknown Location")
                    result["district"] = props.get("district", props.get("city", "Karachi"))
                    logger.info(f"[DETECT] Geocoded: {result['place_name']}")
            else:
                result["geo_error"] = str(geo_resp.status_code)
                logger.warning(f"[DETECT] Geoapify returned {geo_resp.status_code}")
        else:
            logger.warning("[DETECT] GEOAPIFY_API_KEY not set, skipping geocoding")
    except Exception as e:
         result["geo_error"] = str(e)
         logger.error(f"[DETECT] Geocoding error: {e}")

    # ── Save to detection cache ───────────────────────────────────────────
    try:
        cache_copy = dict(result)
        # Drop large base64 strings so they are NOT written to JSON
        cache_copy.pop("image", None)
        cache_copy.pop("satellite_image", None)
        with open(cache_path, "w") as f:
            json.dump(cache_copy, f)
    except Exception:
        pass  # Non-critical if cache write fails

    return jsonify(result)

@app.route("/api/cache-image/<filename>")
def cache_image(filename):
    """Serve saved physical image files to replace large base64 payloads."""
    return send_from_directory(DETECT_CACHE_DIR, filename)

# ── Climate & LLM Routes ──────────────────────────────────────────────────────

@app.route("/api/climate-stats")
def climate_stats():
    """Serve aggregated climate data for the frontend Recharts dashboard."""
    if not os.path.exists(CSV_PATH):
        return jsonify({"error": "Dataset not found"}), 404
        
    try:
        df = pd.read_csv(CSV_PATH, usecols=[
            'year', 'month', 'chirps_rain_mm', 'temp_max_C', 'temp_min_C',
            'temp_C', 'wind_speed', 'soil_moisture_0_7cm', 'soil_moisture_7_28cm',
            'dewpoint_C', 'surface_pressure', 'evapotranspiration'
        ])
        
        # 1 — Yearly aggregation
        yearly = df.groupby('year').agg(
            total_rain=('chirps_rain_mm', 'sum'),
            max_temp=('temp_max_C', 'max'),
            min_temp=('temp_min_C', 'min'),
            avg_temp=('temp_C', 'mean'),
            avg_wind=('wind_speed', 'mean'),
            avg_soil_moisture=('soil_moisture_0_7cm', 'mean'),
            avg_evapotranspiration=('evapotranspiration', 'mean'),
        ).reset_index().round(2).to_dict(orient='records')
        
        # 2 — Monthly averages (across all years)
        month_names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
        monthly = df.groupby('month').agg(
            avg_rain=('chirps_rain_mm', 'mean'),
            avg_temp=('temp_C', 'mean'),
            avg_wind=('wind_speed', 'mean'),
        ).reset_index().round(2)
        monthly['month_name'] = monthly['month'].map(lambda m: month_names[int(m)-1] if 1 <= m <= 12 else '?')
        monthly = monthly.to_dict(orient='records')
        
        # 3 — Decade comparison
        df['decade'] = (df['year'] // 10) * 10
        decade = df.groupby('decade').agg(
            avg_rain=('chirps_rain_mm', 'mean'),
            avg_temp=('temp_C', 'mean'),
            avg_wind=('wind_speed', 'mean'),
            avg_dewpoint=('dewpoint_C', 'mean'),
        ).reset_index().round(2)
        decade['label'] = decade['decade'].astype(str) + 's'
        decade = decade.to_dict(orient='records')
        
        # 4 — Overall KPIs
        total_rainy_days = int((df['chirps_rain_mm'] > 1).sum())
        kpis = {
            "total_rain_25y": round(df['chirps_rain_mm'].sum(), 2),
            "hottest_day_C": round(df['temp_max_C'].max(), 2),
            "avg_wind_speed": round(df['wind_speed'].mean(), 2),
            "rainiest_year": int(max(yearly, key=lambda x: x['total_rain'])['year']),
            "total_rainy_days": total_rainy_days,
            "avg_temp_25y": round(df['temp_C'].mean(), 2),
        }
        
        return jsonify({"yearly": yearly, "monthly": monthly, "decade": decade, "kpis": kpis})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


DISTRICT_COORDS = {
    "korangi":   {"lat": 24.8069, "lon": 67.1478},
    "south":     {"lat": 24.8607, "lon": 67.0100},
    "gulshan":   {"lat": 24.9262, "lon": 67.0932},
    "nazimabad": {"lat": 24.9180, "lon": 67.0330},
    "orangi":    {"lat": 24.9458, "lon": 66.9782},
    "malir":     {"lat": 24.8930, "lon": 67.1967},
    "keamari":   {"lat": 24.8364, "lon": 66.9475},
}

@app.route("/api/forecast")
def forecast():
    """16-day hourly forecast from Open-Meteo, aggregated into daily summaries."""
    district = request.args.get("district", "korangi").lower()
    coords = DISTRICT_COORDS.get(district, DISTRICT_COORDS["korangi"])
    logger.info(f"[FORECAST] Fetching 16-day forecast for {district} ({coords})")

    try:
        url = "https://api.open-meteo.com/v1/forecast"
        params = {
            "latitude": coords["lat"],
            "longitude": coords["lon"],
            "daily": [
                "temperature_2m_max", "temperature_2m_min",
                "precipitation_sum", "precipitation_probability_max",
                "wind_speed_10m_max", "relative_humidity_2m_mean",
            ],
            "timezone": "Asia/Karachi",
            "forecast_days": 16,
        }
        resp = http_requests.get(url, params=params, timeout=15)
        if resp.status_code != 200:
            logger.error(f"[FORECAST] Open-Meteo returned {resp.status_code}")
            return jsonify({"error": f"Open-Meteo HTTP {resp.status_code}"}), 502

        data = resp.json()
        daily = data.get("daily", {})
        dates = daily.get("time", [])

        forecast_days = []
        for i, date in enumerate(dates):
            forecast_days.append({
                "date": date,
                "temp_max": daily.get("temperature_2m_max", [None])[i],
                "temp_min": daily.get("temperature_2m_min", [None])[i],
                "precip": daily.get("precipitation_sum", [0])[i],
                "precip_prob": daily.get("precipitation_probability_max", [0])[i],
                "wind_max": daily.get("wind_speed_10m_max", [None])[i],
                "humidity": daily.get("relative_humidity_2m_mean", [None])[i],
            })

        logger.info(f"[FORECAST] Returned {len(forecast_days)} days")
        return jsonify({"district": district, "days": forecast_days})
    except Exception as e:
        logger.error(f"[FORECAST] Error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/cached-spots")
def cached_spots():
    """Return a lightweight list of all analyzed spots from detection cache."""
    spots = []
    for f in os.listdir(DETECT_CACHE_DIR):
        if f.endswith(".json"):
            try:
                with open(os.path.join(DETECT_CACHE_DIR, f), "r") as fh:
                    data = json.load(fh)
                    spots.append({
                        "patch": data.get("patch"),
                        "lat": data.get("lat"),
                        "lon": data.get("lon"),
                        "place_name": data.get("place_name"),
                        "district": data.get("district"),
                        "elevation": data.get("elevation"),
                        "soil_class": data.get("soil", {}).get("primary_class") if data.get("soil") else None,
                        "drainage": data.get("soil", {}).get("drainage") if data.get("soil") else None,
                        "infiltration_avg": data.get("soil", {}).get("infiltration_avg") if data.get("soil") else None,
                        "buildings": data.get("buildings"),
                        "building_footprint_pct": data.get("building_stats", {}).get("total_footprint_pct") if data.get("building_stats") else None,
                        "has_recommendation": "green_solution_recommendation" in data,
                    })
            except Exception:
                pass
    spots.sort(key=lambda x: x.get("patch") or 0)
    return jsonify({"spots": spots})


@app.route("/api/clear-recommendation", methods=["POST"])
def clear_recommendation():
    """Secret endpoint: remove green_solution_recommendation from a cache entry."""
    data = request.json
    lat, lon = float(data.get("lat", 0)), float(data.get("lon", 0))
    logger.info(f"[CLEAR-REC] Clearing recommendation near ({lat}, {lon})")

    cleared = False
    for f in os.listdir(DETECT_CACHE_DIR):
        if not f.endswith(".json"):
            continue
        try:
            fpath = os.path.join(DETECT_CACHE_DIR, f)
            with open(fpath, "r") as fh:
                entry = json.load(fh)
            elat, elon = float(entry.get("lat", 0)), float(entry.get("lon", 0))
            if abs(elat - lat) < 0.001 and abs(elon - lon) < 0.001:
                if "green_solution_recommendation" in entry:
                    del entry["green_solution_recommendation"]
                    with open(fpath, "w") as fh:
                        json.dump(entry, fh)
                    cleared = True
                    logger.info(f"[CLEAR-REC] Cleared from {f}")
                break
        except Exception as e:
            logger.warning(f"[CLEAR-REC] Error in {f}: {e}")

    if cleared:
        return jsonify({"status": "cleared"})
    return jsonify({"status": "not_found"}), 404


@app.route("/api/chat", methods=["POST"])
def chat():
    """Handle Chatbot queries using Gemini — lightweight streaming."""
    user_msg = request.json.get("message", "")
    if not user_msg:
        return jsonify({"reply": "Please ask a question."}), 400

    logger.info(f"[CHAT] User query: {user_msg[:80]}...")

    def generate():
        try:
            client = get_genai_client()
            logger.info("[CHAT] Streaming response from Gemini...")
            response_stream = client.models.generate_content_stream(
                model='gemini-2.5-flash',
                contents=user_msg,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_INSTRUCTION,
                    temperature=0.3,
                ),
            )
            for chunk in response_stream:
                if chunk.text:
                    yield f"data: {json.dumps({'text': chunk.text})}\n\n"
            yield "data: [DONE]\n\n"
            logger.info("[CHAT] Stream complete.")
        except Exception as e:
            logger.error(f"[CHAT] Error: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return app.response_class(generate(), mimetype='text/event-stream')


@app.route("/api/smart-insights", methods=["POST"])
def smart_insights():
    data = request.json
    lat = data.get("lat")
    lon = data.get("lon")
    patch_id = data.get("patch")

    if not lat or not lon:
        logger.warning("[INSIGHTS] Missing coordinates in request")
        return jsonify({"error": "Missing coordinates"}), 400

    # Try to find the cache file by scanning for matching lat/lon
    cache_path = None
    for fname in os.listdir(DETECT_CACHE_DIR):
        if fname.endswith(".json"):
            fpath = os.path.join(DETECT_CACHE_DIR, fname)
            try:
                with open(fpath, "r") as fh:
                    d = json.load(fh)
                    if abs(d.get("lat", 0) - lat) < 0.0001 and abs(d.get("lon", 0) - lon) < 0.0001:
                        cache_path = fpath
                        break
            except Exception:
                pass

    if not cache_path:
        logger.error(f"[INSIGHTS] No cache found for lat={lat}, lon={lon}")
        return jsonify({"error": "No cached detection found for this location. Run the Detection Pipeline first."}), 404

    with open(cache_path, "r") as f:
        cached_data = json.load(f)

    logger.info(f"[INSIGHTS] Loaded cache for patch {cached_data.get('patch')} at {cache_path}")

    # 1. Return precomputed result if it exists
    if "green_solution_recommendation" in cached_data:
        logger.info("[INSIGHTS] Returning cached recommendation.")
        def generate_cached():
            yield f"data: {json.dumps({'text': cached_data['green_solution_recommendation']})}\n\n"
            yield "data: [DONE]\n\n"
        return app.response_class(generate_cached(), mimetype='text/event-stream')

    # 2. Read Excel List
    excel_path = os.path.join(SCRIPT_DIR, "data", "Green Solution List.xlsx")
    solutions_str = "Available standard solutions:\n"
    if os.path.exists(excel_path):
        try:
            df_solutions = pd.read_excel(excel_path)
            solutions_str += df_solutions.to_string(index=False)
            logger.info(f"[INSIGHTS] Loaded {len(df_solutions)} solutions from Excel.")
        except Exception as e:
            solutions_str += f"Failed to read excel: {e}"
            logger.error(f"[INSIGHTS] Excel read error: {e}")
    else:
        solutions_str += "- Permeable Pavements\n- Rain Gardens\n- Bioswales\n- Green Roofs\n- Detention Basins\n"
        logger.warning("[INSIGHTS] Green Solution List.xlsx not found, using defaults.")

    def generate_insight():
        prompt = f"""Act as an Urban Flooding Solutions Architect.
Analyze this specific hotspot in Karachi:
- Place: {cached_data.get('place_name', 'Unknown')}
- Elevation: {cached_data.get('elevation', 'Unknown')} meters
- Soil: {cached_data.get('soil', {}).get('primary_class', 'Unknown')} ({cached_data.get('soil', {}).get('drainage', 'Unknown')} drainage, ~{cached_data.get('soil', {}).get('infiltration_avg', 'Unknown')} mm/hr infiltration)
- Built Environment: {cached_data.get('buildings', 0)} buildings ({cached_data.get('building_stats', {}).get('total_footprint_pct', 0)}% coverage)

{solutions_str}

Task:
1. Perform a critical analysis of the location.
2. Select the SINGLE BEST OPTIMAL solution from the Available standard solutions.
3. Explain strictly WHY this solution fits based on water absorption, soil type, and flood mitigation. Include its long-term durability.
Format heavily in markdown. Keep it engaging but professional."""

        full_text = ""
        try:
            client = get_genai_client()
            logger.info("[INSIGHTS] Streaming from Gemini...")
            response_stream = client.models.generate_content_stream(
                model='gemini-2.5-flash',
                contents=prompt,
                config=types.GenerateContentConfig(temperature=0.4),
            )
            for chunk in response_stream:
                if chunk.text:
                    full_text += chunk.text
                    yield f"data: {json.dumps({'text': chunk.text})}\n\n"

            # Update cache file with permanent recommendation
            cached_data["green_solution_recommendation"] = full_text
            with open(cache_path, "w") as f:
                json.dump(cached_data, f)
            logger.info("[INSIGHTS] Recommendation cached permanently.")

            yield "data: [DONE]\n\n"
        except Exception as e:
            logger.error(f"[INSIGHTS] Gemini error: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return app.response_class(generate_insight(), mimetype='text/event-stream')


# ── Main ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("\n" + "=" * 55)
    print("  Sponge City Karachi — Backend API")
    print("=" * 55)
    print(f"  TWI File  : {'OK' if os.path.exists(TWI_PATH) else 'MISSING'}")
    print(f"  YOLO Model: {'OK' if os.path.exists(YOLO_MODEL_PATH) else 'MISSING'}")
    print(f"  Roboflow  : {'OK' if HAS_ROBOFLOW else 'NOT INSTALLED'}")
    print(f"  YOLO      : {'OK' if HAS_YOLO else 'NOT INSTALLED'}")
    print("=" * 55 + "\n")
    app.run(debug=True, port=5000)
