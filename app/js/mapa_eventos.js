/**
 * mapa_eventos.js - Lógica para renderizar visor geográfico offline con parcelas de PARACEL
 */

const MapaApp = {
    map: null,
    geojsonLayers: [],

    init: function () {
        // Inicializar Leaflet map center en Paracel/Concepción aprox
        this.map = L.map('mapa-canvas').setView([-23.15, -57.25], 8);

        // Capa base limpia en blanco o gris (al no tener internet)
        L.tileLayer('', {
            maxZoom: 18,
            attribution: 'PARACEL Offline GIS'
        }).addTo(this.map);

        this.loadGeoJSONs();

        // Timeout para redimensionar correctamente el mapa al aparecer
        setTimeout(() => this.map.invalidateSize(), 500);
    },

    loadGeoJSONs: async function () {
        // Rutas a archivos exportados localmente
        const files = [
            { path: 'app/data/ComponentesPARACEL.geojson', color: '#005A9C' },
            { path: 'app/data/PARACEL_PropiedadesForestales.geojson', color: '#00763C' },
            { path: 'app/data/ComunidadesParacel_Limites.geojson', color: '#E26000' }
        ];

        for (let file of files) {
            try {
                const response = await fetch(file.path);
                const data = await response.json();

                const layer = L.geoJSON(data, {
                    style: {
                        color: file.color,
                        weight: 2,
                        fillOpacity: 0.2
                    },
                    onEachFeature: (feature, layer) => {
                        layer.on('click', (e) => {
                            // Extraer nombres posibles de la metadata del shapefile
                            const props = feature.properties;

                            // Logica heurística para las bases PARACEL
                            let nombreParcela = props.Nomb_Ccial || props.Comunidad || props.Nombre || props.Name || "Parcela Seleccionada";

                            const coordStr = `${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`;

                            // Llenar formulario html automáticamente
                            document.getElementById('lugar_evento').value = `${nombreParcela} [Coordenadas: ${coordStr}]`;

                            alert(`📍 Parcela asignada: ${nombreParcela}`);

                            // Scroll hacia abajo despues del click
                            document.getElementById('lugar_evento').scrollIntoView({ behavior: "smooth", block: "center" });
                        });
                    }
                }).addTo(this.map);

                this.geojsonLayers.push(layer);

                // Autoencuadrar el mapa en la última capa cargada
                if (file.path.includes('PropiedadesForestales')) {
                    this.map.fitBounds(layer.getBounds());
                }

            } catch (e) {
                console.error("Error al cargar " + file.path, e);
            }
        }
    }
};
