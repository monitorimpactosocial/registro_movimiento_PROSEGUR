import os
import geopandas as gpd

# Definir rutas
source_dir = r"C:\Users\DiegoMeza\OneDrive - PARACEL S.A\MONITOREO_IMPACTO_SOCIAL_PARACEL\NAUTA PERCEPCIÓN INFORMES\encuesta_percepcion_2026\mapas_base"
target_dir = r"C:\Users\DiegoMeza\OneDrive - PARACEL S.A\MONITOREO_IMPACTO_SOCIAL_PARACEL\REGISTRO_ENTRADAS_EVENTOS_PROSEGUR\app\data"

# Archivos SHP de interés para vigilancia y operaciones
shapefiles = [
    "PARACEL_PropiedadesForestales.shp",
    "ComponentesPARACEL.shp",
    "ComunidadesParacel_Limites.shp"
]

def convert_to_geojson():
    if not os.path.exists(target_dir):
        os.makedirs(target_dir)

    for shp_file in shapefiles:
        shp_path = os.path.join(source_dir, shp_file)
        
        if not os.path.exists(shp_path):
            print(f"⚠️ Archivo no encontrado: {shp_path}")
            continue

        try:
            print(f"Cargando {shp_file}...")
            # Leer el archivo shapefile
            gdf = gpd.read_file(shp_path)
            
            # Reproyectar a WGS84 (EPSG:4326) que es el estándar para mapas web (Leaflet/Google Maps)
            if gdf.crs != "EPSG:4326":
                print(f"Reproyectando {shp_file} a WGS84 (EPSG:4326)...")
                gdf = gdf.to_crs(epsg=4326)

            # Optimización matemática para reducir vértices de los polígonos y hacerlos más ligeros en celulares
            # (El parámetro de tolerancia depende de los grados en wgs84. 0.0005 es conservador ~50 metros aprox)
            print(f"Simplificando geometrías para carga veloz offline...")
            gdf['geometry'] = gdf['geometry'].simplify(tolerance=0.0005, preserve_topology=True)

            # Exportar archivo a GeoJSON en nuestra carpeta app/data
            out_filename = shp_file.replace(".shp", ".geojson")
            out_path = os.path.join(target_dir, out_filename)
            
            gdf.to_file(out_path, driver="GeoJSON")
            print(f"OK Convertido con exito: {out_filename}\n")

        except Exception as e:
            print(f"Error convirtiendo {shp_file}: {e}")

if __name__ == "__main__":
    import sys
    try:
        import geopandas
    except ImportError:
        print("Instalando dependencias necesarias (geopandas)...")
        os.system(f"{sys.executable} -m pip install geopandas shapely fiona pyproj rtree")
    
    convert_to_geojson()
