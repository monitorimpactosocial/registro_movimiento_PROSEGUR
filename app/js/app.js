/**
 * app.js - Lógica de presentación, catálogos y validaciones
 */

const App = {
    // Inicializar estado de red
    initNetworkMonitoring: function () {
        const updateOnlineStatus = () => {
            const indicator = document.getElementById('connection-status');
            if (!indicator) return;

            if (navigator.onLine) {
                indicator.className = 'status-indicator online';
                indicator.innerHTML = '<span class="material-icons icon-sm">wifi</span> <span class="status-text">Conectado</span>';
            } else {
                indicator.className = 'status-indicator offline';
                indicator.innerHTML = '<span class="material-icons icon-sm">signal_wifi_off</span> <span class="status-text">Sin conexión (Offline)</span>';
            }
        };

        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        updateOnlineStatus(); // Set init state
    },

    // Actualiza la burbuja roja de notificaciones en el Dashboard
    updateBadge: function () {
        this.initNetworkMonitoring();
        const pending = DB.getPendingSync();
        const badge = document.getElementById('badge-pendientes');
        if (badge) {
            if (pending.total > 0) {
                badge.style.display = 'block';
                badge.textContent = pending.total;
            } else {
                badge.style.display = 'none';
            }
        }
    },

    // Utilitario para cargar catálogos desde los JSON estáticos a los SELECT html
    loadCatalog: async function (url, selectId) {
        try {
            // Utilizamos url relativas para Github Pages o localhost
            const response = await fetch(`catalogos/${url}`);
            if (!response.ok) throw new Error("HTTP " + response.status);
            const data = await response.json();
            const select = document.getElementById(selectId);
            if (select && data.length > 0) {
                data.forEach(item => {
                    const opt = document.createElement('option');
                    opt.value = item.id;
                    opt.textContent = item.nombre;
                    select.appendChild(opt);
                });
            }
        } catch (e) {
            console.error(`Error loading catalog ${url}:`, e);
        }
    },

    // Flujo inicial de Registro (Entradas y Salidas)
    initRegistroFlow: function () {
        // Parametros de URL
        const urlParams = new URLSearchParams(window.location.search);
        const tipo = urlParams.get('tipo') || 'entrada';

        // UI config
        document.getElementById('tipo_movimiento').value = tipo;
        document.getElementById('page-title').textContent = tipo === 'entrada' ? 'Registro de Entrada' : 'Registro de Salida';
        document.querySelector('.app-header').classList.add(tipo === 'entrada' ? 'bg-primary' : 'bg-secondary');
        document.querySelector('.btn').className = `btn btn-block btn-lg shadow btn-${tipo === 'entrada' ? 'primary' : 'secondary'}`;

        // Cargar Catálogos
        this.loadCatalog('puestos_control.json', 'puesto_control');
        this.loadCatalog('medios_transporte.json', 'medio_transporte');
        this.loadCatalog('comunidades.json', 'origen');
        this.loadCatalog('motivos_ingreso.json', 'motivo');

        // Pre-fill location logic
        if ("geolocation" in navigator) {
            // navigator.geolocation.getCurrentPosition(position => { console.log(position.coords); });
        }
    },

    // Flujo de Eventos
    initEventoFlow: function () {
        this.loadCatalog('puestos_control.json', 'puesto_control');
        this.loadCatalog('tipos_evento.json', 'tipo_evento');
        this.loadCatalog('medios_transporte.json', 'medio_transporte');

        // Default datetime
        const now = new Date();
        document.getElementById('fecha_evento').valueAsDate = now;
        document.getElementById('hora_evento').value = now.toTimeString().substring(0, 5);
    },

    // Maneja la opción "Otro (Especificar)" en Selects
    handleSpecify: function (selectId) {
        const select = document.getElementById(selectId);
        const input = document.getElementById(`${selectId}_otro`);
        if (select && input) {
            if (select.value === 'otro') {
                input.classList.remove('hidden');
                input.required = true;
            } else {
                input.classList.add('hidden');
                input.required = false;
                input.value = '';
            }
        }
    },

    // Guardar Entradas y Salidas
    saveRegistro: function () {
        const form = document.getElementById('registro-form');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        if (data.medio_transporte === 'otro') data.medio_transporte = data.medio_transporte_otro;
        if (data.origen === 'otro') data.origen = data.origen_otro;
        if (data.motivo === 'otro') data.motivo = data.motivo_otro;

        DB.saveRegistroMovimiento(data);

        // Feedback
        alert(`¡✅ Registro de ${data.tipo_movimiento.toUpperCase()} guardado en el dispositivo!`);
        window.location.href = 'index.html';
    },

    // Guardar Eventos
    saveEvento: function () {
        const form = document.getElementById('evento-form');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        if (data.tipo_evento === 'otro') data.tipo_evento = data.tipo_evento_otro;
        if (data.medio_transporte === 'otro') data.medio_transporte = data.medio_transporte_otro;

        DB.saveEvento(data);

        // Feedback
        alert(`¡🚨 Evento/Incidente guardado correctamente!`);
        window.location.href = 'index.html';
    },

    // Funciones vista PENDIENTES
    loadPendientes: function () {
        const pending = DB.getPendingSync();
        document.getElementById('count-entradas-salidas').textContent = pending.movimientos.length;
        document.getElementById('count-eventos').textContent = pending.eventos.length;

        const list = document.getElementById('lista-pendientes');
        const emptyMsg = document.getElementById('empty-msg');
        const syncBtn = document.getElementById('btn-sync-all');

        if (pending.total === 0) {
            emptyMsg.style.display = 'block';
            syncBtn.disabled = true;
            syncBtn.classList.add('btn-secondary');
            return;
        }

        emptyMsg.style.display = 'none';

        // Renderizar todos los ítems
        let htmlSnippet = '';

        pending.movimientos.forEach(item => {
            const dateStr = new Date(item.timestamp).toLocaleString('es-ES');
            htmlSnippet += `
                <div class="record-card">
                    <div class="info">
                        <div class="title">${item.payload.tipo_movimiento.toUpperCase()} - ${item.payload.transeunte_nombre}</div>
                        <div class="details">🕒 ${dateStr} • 📍 Puesto: ${item.payload.puesto_control}</div>
                    </div>
                    <div class="status">
                        <span class="material-icons">cloud_off</span>
                        <span>Offline</span>
                    </div>
                </div>
            `;
        });

        pending.eventos.forEach(item => {
            const dateStr = new Date(item.timestamp).toLocaleString('es-ES');
            htmlSnippet += `
                <div class="record-card evento">
                    <div class="info">
                        <div class="title">EVENTO - Gravedad ${item.payload.nivel_gravedad.toUpperCase()}</div>
                        <div class="details">🕒 ${dateStr} • 📍 ${item.payload.lugar_evento}</div>
                    </div>
                    <div class="status">
                        <span class="material-icons">report_problem</span>
                        <span>Offline</span>
                    </div>
                </div>
            `;
        });

        list.innerHTML = htmlSnippet;
    },

    // Simulador de Sincronización
    syncAll: function () {
        if (!navigator.onLine) {
            alert("No hay conexión a internet. Conéctese a una red Wi-Fi o móvil para sincronizar.");
            return;
        }

        const btn = document.getElementById('btn-sync-all');
        btn.innerHTML = '<span class="material-icons prompt-spin">sync</span> Sincronizando datos...';
        btn.disabled = true;

        // Simulate network delay (En el futuro, aquí va el FETCH al Backend / Apps Script)
        setTimeout(() => {
            DB.markAsSynced();
            DB.cleanupSynced();
            alert("✅ Todos los registros fueron subidos con éxito al servidor.");
            location.reload();
        }, 1500);
    }
};
