import rasterio
import numpy as np
import folium
import math

# ── User inputs ──
num_patches = int(input("Enter the number of patches: "))
min_radius_km = float(input("Enter minimum distance between points (in KM): "))

# Work out a grid that gives exactly num_patches cells
# Find the (rows x cols) grid closest to a square
best_r, best_c = 1, num_patches
for r in range(1, num_patches + 1):
    if num_patches % r == 0:
        c = num_patches // r
        if abs(r - c) < abs(best_r - best_c):
            best_r, best_c = r, c
grid_rows, grid_cols = best_r, best_c
print(f"Grid layout: {grid_rows} rows x {grid_cols} cols = {grid_rows * grid_cols} patches")

# ── Haversine distance (km) between two lat/lon points ──
def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    return 2 * R * math.asin(math.sqrt(a))

# ── Open the TWI raster ──
import os
_DIR = os.path.dirname(os.path.abspath(__file__))
_TWI = os.path.join(_DIR, "data", "Korangi_TWI.tif")

with rasterio.open(_TWI) as src:
    twi_data = src.read(1)
    nodata = src.nodata
    transform = src.transform
    height, width = twi_data.shape

    # Mask nodata
    if nodata is not None:
        twi_masked = np.where(twi_data == nodata, np.nan, twi_data)
    else:
        twi_masked = twi_data.astype(float)

    # ── Compute equal patch sizes ──
    patch_h = height // grid_rows
    patch_w = width  // grid_cols

    # Trim raster so patches divide evenly
    used_h = patch_h * grid_rows
    used_w = patch_w * grid_cols
    twi_trimmed = twi_masked[:used_h, :used_w]

    print(f"Raster size : {height} x {width}")
    print(f"Patch size  : {patch_h} x {patch_w}")
    print(f"Used area   : {used_h} x {used_w}\n")

    # Helper: pixel (row, col) → (lat, lon) using the original transform
    def pixel_to_latlon(r, c):
        x, y = rasterio.transform.xy(transform, r, c)
        return y, x  # lat, lon

    # Helper: get the 4 corner coords of a patch rectangle
    def patch_corners(r_start, r_end, c_start, c_end):
        # corners in (lat, lon) order for folium
        tl = pixel_to_latlon(r_start, c_start)
        tr = pixel_to_latlon(r_start, c_end)
        br = pixel_to_latlon(r_end, c_end)
        bl = pixel_to_latlon(r_end, c_start)
        return [tl, tr, br, bl, tl]  # closed polygon

    # ── Process each patch: collect sorted pixel candidates ──
    patch_candidates = []  # list of (patch_id, sorted_pixels, r_start, r_end, c_start, c_end)
    patch_polygons = []

    for pr in range(grid_rows):
        for pc in range(grid_cols):
            r_start = pr * patch_h
            r_end   = r_start + patch_h
            c_start = pc * patch_w
            c_end   = c_start + patch_w

            patch = twi_trimmed[r_start:r_end, c_start:c_end]

            # Skip if entire patch is NaN
            if np.all(np.isnan(patch)):
                continue

            # Get all valid pixel indices sorted by TWI descending
            valid_mask = ~np.isnan(patch)
            valid_vals = patch[valid_mask]
            valid_rows, valid_cols = np.where(valid_mask)
            sort_order = np.argsort(valid_vals)[::-1]  # descending

            sorted_pixels = list(zip(
                valid_vals[sort_order],
                valid_rows[sort_order] + r_start,
                valid_cols[sort_order] + c_start,
            ))

            patch_id = pr * grid_cols + pc + 1
            patch_candidates.append((patch_id, sorted_pixels))

            # Patch boundary
            corners = patch_corners(r_start, r_end - 1, c_start, c_end - 1)
            patch_polygons.append((patch_id, corners))

    # ── For each patch, pick the highest-TWI pixel that satisfies distance ──
    # Process patches by their top TWI value descending (greedy)
    patch_candidates.sort(key=lambda x: x[1][0][0], reverse=True)

    kept = []

    def is_far_enough(lat, lon):
        for k in kept:
            if haversine_km(lat, lon, k["lat"], k["lon"]) < min_radius_km:
                return False
        return True

    for patch_id, sorted_pixels in patch_candidates:
        found = False
        for twi_val, abs_row, abs_col in sorted_pixels:
            lat, lon = pixel_to_latlon(abs_row, abs_col)
            if is_far_enough(lat, lon):
                kept.append({
                    "patch": patch_id,
                    "max_twi": float(twi_val),
                    "lat": lat,
                    "lon": lon,
                    "row": int(abs_row),
                    "col": int(abs_col),
                })
                found = True
                break
        if not found:
            print(f"  Patch {patch_id}: no pixel satisfies the {min_radius_km} km constraint")

    # ── Print results ──
    print(f"\nPoints KEPT ({len(kept)})  [min radius = {min_radius_km} km]")
    print(f"{'Patch':>5}  {'Max TWI':>9}  {'Latitude':>12}  {'Longitude':>12}")
    print("-" * 46)
    for r in kept:
        print(f"{r['patch']:>5}  {r['max_twi']:>9.4f}  {r['lat']:>12.6f}  {r['lon']:>12.6f}")

    # ── Build the map ──
    all_lats = [r["lat"] for r in kept]
    all_lons = [r["lon"] for r in kept]
    center_lat = np.mean(all_lats)
    center_lon = np.mean(all_lons)

    m = folium.Map(location=[center_lat, center_lon], zoom_start=14)

    # Draw patch outlines
    for pid, corners in patch_polygons:
        folium.Polygon(
            locations=corners,
            color="blue",
            weight=2,
            fill=False,
            tooltip=f"Patch {pid}",
        ).add_to(m)

    # Place markers for kept points
    for r in kept:
        folium.Marker(
            location=[r["lat"], r["lon"]],
            popup=(
                f"<b>Patch {r['patch']}</b><br>"
                f"Max TWI: {r['max_twi']:.4f}<br>"
                f"Lat: {r['lat']:.6f}<br>"
                f"Lon: {r['lon']:.6f}"
            ),
            tooltip=f"Patch {r['patch']} — TWI {r['max_twi']:.2f}",
            icon=folium.Icon(color="red", icon="tint", prefix="fa"),
        ).add_to(m)

    output_path = "max_twi_location.html"
    m.save(output_path)
    print(f"\nMap saved to: {output_path}")
