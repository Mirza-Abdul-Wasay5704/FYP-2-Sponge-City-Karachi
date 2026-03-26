import rasterio
import numpy as np
import os

_DIR = os.path.dirname(os.path.abspath(__file__))
_TWI = os.path.join(_DIR, "data", "Korangi_TWI.tif")

# Open the TWI raster file
with rasterio.open(_TWI) as src:
    twi_data = src.read(1)  # Read the first band
    
    # Handle nodata values
    nodata = src.nodata
    if nodata is not None:
        twi_valid = twi_data[twi_data != nodata]
    else:
        twi_valid = twi_data[~np.isnan(twi_data)]
    
    print("=" * 50)
    print("Topographic Wetness Index (TWI) Analysis")
    print("=" * 50)
    print(f"\nFile: Korangi_TWI.tif")
    print(f"Shape: {twi_data.shape}")
    print(f"CRS: {src.crs}")
    print(f"NoData Value: {nodata}")
    
    print("\n--- TWI Value Statistics ---")
    print(f"Minimum TWI: {np.min(twi_valid):.4f}")
    print(f"Maximum TWI: {np.max(twi_valid):.4f}")
    print(f"Mean TWI: {np.mean(twi_valid):.4f}")
    print(f"Median TWI: {np.median(twi_valid):.4f}")
    print(f"Std Dev: {np.std(twi_valid):.4f}")
    
    # Percentiles
    print("\n--- Percentiles ---")
    percentiles = [5, 10, 25, 50, 75, 90, 95]
    for p in percentiles:
        val = np.percentile(twi_valid, p)
        print(f"  {p}th percentile: {val:.4f}")
    
    print("\n" + "=" * 50)
    print("Interpretation of TWI Values:")
    print("=" * 50)
    print("""
LOW TWI Values (typically < 6-8):
  - Higher, drier areas (ridges, hilltops)
  - Better drainage conditions
  - Less prone to waterlogging
  - Lower groundwater potential
  - Lower flood risk

HIGH TWI Values (typically > 10-12):
  - Low-lying areas, valleys, depressions
  - Water accumulation zones
  - Higher soil moisture content
  - Higher groundwater potential
  - Higher flood susceptibility
  - Better for wetland/water retention features

MODERATE TWI Values (typically 6-10):
  - Transitional zones between ridges and valleys
  - Moderate drainage conditions
""")
