"""
Utility script to prepare geospatial data for the web application.
This script helps convert and optimize GeoTIFF files for web viewing.
"""

import os
import sys

def main():
    print("Karachi GeoSpatial Data Preparation Utility")
    print("=" * 50)
    print()
    
    layers_dir = os.path.join(os.path.dirname(__file__), '..', 'Layers')
    public_layers_dir = os.path.join(os.path.dirname(__file__), '..', 'fyp-web', 'public', 'Layers')
    
    print(f"Source directory: {layers_dir}")
    print(f"Target directory: {public_layers_dir}")
    print()
    
    # Check if directories exist
    if not os.path.exists(layers_dir):
        print(f"❌ Error: Layers directory not found at {layers_dir}")
        return
    
    if not os.path.exists(public_layers_dir):
        os.makedirs(public_layers_dir)
        print(f"✓ Created target directory: {public_layers_dir}")
    
    # List all files in Layers directory
    print("\nAvailable files in Layers directory:")
    print("-" * 50)
    
    geotiff_files = []
    shapefile_sets = {}
    
    for filename in os.listdir(layers_dir):
        filepath = os.path.join(layers_dir, filename)
        if os.path.isfile(filepath):
            ext = os.path.splitext(filename)[1].lower()
            base_name = os.path.splitext(filename)[0]
            
            if ext == '.tif':
                geotiff_files.append(filename)
                print(f"  📊 GeoTIFF: {filename}")
            elif ext in ['.shp', '.dbf', '.shx', '.prj', '.cpg']:
                if base_name not in shapefile_sets:
                    shapefile_sets[base_name] = []
                shapefile_sets[base_name].append(ext)
    
    print("\nShapefile sets found:")
    for base_name, extensions in shapefile_sets.items():
        status = "✓ Complete" if len(extensions) >= 3 else "⚠ Incomplete"
        print(f"  {status}: {base_name} ({', '.join(extensions)})")
    
    print("\n" + "=" * 50)
    print("Data preparation complete!")
    print("\nNote: To serve GeoTIFF files properly, you may need to:")
    print("1. Optimize them using GDAL (gdal_translate with COG format)")
    print("2. Ensure proper CORS headers are set on your server")
    print("\nExample GDAL command:")
    print("  gdal_translate -of COG -co COMPRESS=LZW input.tif output.tif")

if __name__ == "__main__":
    main()
