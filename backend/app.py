"""
Sponge City Karachi — Flask API Backend
Serves TWI analysis and LULC / building detection endpoints.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import rasterio
import numpy as np
import math
import os
import io
import base64
from PIL import Image, ImageDraw
from collections import defaultdict
import requests as http_requests

app = Flask(__name__)
CORS(app)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TWI_PATH = os.path.join(SCRIPT_DIR, "data", "Korangi_TWI.tif")
YOLO_MODEL_PATH = os.path.join(SCRIPT_DIR, "models", "best.pt")
CACHE_DIR = os.path.join(SCRIPT_DIR, "sat_cache")
os.makedirs(CACHE_DIR, exist_ok=True)

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

    result = {"patch": patch_id, "lat": lat, "lon": lon,
              "lulc": {}, "buildings": 0, "building_stats": None,
              "lulc_error": None, "building_error": None,
              "image": None, "satellite_image": None}

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
                api_key="bOsI0YAMQAReoiyOEOSK",
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
            yolo_res = yolo.predict(source=img_path, conf=0.05, iou=0.30,
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

    buf2 = io.BytesIO()
    sat_img.save(buf2, format="JPEG", quality=85)
    result["satellite_image"] = base64.b64encode(buf2.getvalue()).decode()

    return jsonify(result)


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
