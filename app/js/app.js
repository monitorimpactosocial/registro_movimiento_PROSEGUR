/**
 * app.js - Lógica de presentación, catálogos y validaciones
 */

const App = {
    // Auth Logic
    checkAuth: function () {
        if (!localStorage.getItem('prosegur_auth_token')) {
            window.location.href = 'index.html';
        }
    },

    login: function (e) {
        e.preventDefault();
        const user = document.getElementById('username').value;
        const pass = document.getElementById('password').value;

        // Rol: GUARDIA
        if (user === 'prosegur' && pass === 'pr0segur2026') {
            localStorage.setItem('prosegur_auth_token', 'guardia');
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('dashboard-screen').style.display = 'block';
            document.getElementById('logout-btn').style.display = 'block';
            document.getElementById('puesto-label').textContent = 'PROSEGUR (Guardia)';
        }
        // Rol: ADMIN
        else if (user === 'paracel' && pass === 'parac3l2026') {
            localStorage.setItem('prosegur_auth_token', 'admin');
            window.location.href = 'dashboard.html';
        }
        else {
            alert('Credenciales incorrectas');
        }
    },

    logout: function () {
        localStorage.removeItem('prosegur_auth_token');
        window.location.href = 'index.html';
    },

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

        // Listener para convertir Foto a Base64 localmente
        const fileInput = document.getElementById('evidencia_file');
        if (fileInput) {
            fileInput.addEventListener('change', function (e) {
                const file = e.target.files[0];
                if (!file) return;

                // Si es mas grande de 5MB advertimos
                if (file.size > 5 * 1024 * 1024) {
                    alert("La imagen es muy pesada. Trate de no exceder los 5MB para una sincronización rápida.");
                }

                const reader = new FileReader();
                reader.onloadend = function () {
                    const base64String = reader.result;
                    document.getElementById('evidencia_base64').value = base64String;

                    // Mostrar preview si es imagen
                    if (file.type.startsWith('image/')) {
                        const preview = document.getElementById('evidencia-preview');
                        const img = document.getElementById('evidencia-img');
                        img.src = base64String;
                        preview.style.display = 'block';
                    }
                };
                reader.readAsDataURL(file);
            });
        }
    },

    // Maneja la opción "Otro (Especificar)" en Selects
    handleSpecify: function (selectId) {
        // ... (existing code, untouched)
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

    // Maneja la creación dinámica de inputs para los Acompañantes
    handleAcompanantes: function () {
        const count = parseInt(document.getElementById('acompanantes').value) || 0;
        const container = document.getElementById('acompanantes_container');
        if (!container) return;

        container.innerHTML = '';

        if (count > 0 && count < 30) {
            let html = '<div style="margin-top:1rem; padding-top:1rem; border-top: 1px dashed #ccc;"><h4>Datos de Acompañantes</h4>';
            for (let i = 1; i <= count; i++) {
                html += `
                    <div style="background:#f4f6f8; padding: 10px; margin-bottom: 8px; border-radius: 4px;">
                        <label style="font-size: 0.8rem; color: #005A9C;">Acompañante ${i}</label>
                        <input type="text" name="acomp_nombre_${i}" placeholder="Nombre y Apellido" required style="margin-bottom: 5px;">
                        <input type="text" name="acomp_doc_${i}" placeholder="Nro Documento (Opcional)">
                    </div>
                `;
            }
            html += '</div>';
            container.innerHTML = html;
        } else if (count >= 30) {
            alert("El número de acompañantes excede el límite para carga individual. Ingrese el número total y detalle el contingente en Observaciones.");
            document.getElementById('acompanantes').value = 0;
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

        // Empaquetar acompañantes en un solo string para el Excel
        const count = parseInt(data.acompanantes) || 0;
        const acomp_list = [];
        for (let i = 1; i <= count; i++) {
            if (data[`acomp_nombre_${i}`]) {
                const docStr = data[`acomp_doc_${i}`] ? `(Doc: ${data[`acomp_doc_${i}`]})` : '(Sin Doc)';
                acomp_list.push(`${data[`acomp_nombre_${i}`]} ${docStr}`);
                delete data[`acomp_nombre_${i}`];
                delete data[`acomp_doc_${i}`];
            }
        }
        data.detalle_acompanantes = acomp_list.length > 0 ? acomp_list.join(" | ") : "Ninguno";

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

    // Sincronización Real con Backend via Fetch
    syncAll: async function () {
        if (!navigator.onLine) {
            alert("No hay conexión a internet. Conéctese a una red Wi-Fi o móvil para sincronizar.");
            return;
        }

        const pending = DB.getPendingSync();
        if (pending.total === 0) return;

        // URL generada por Google Apps Script
        const BACKEND_URL = "https://script.google.com/macros/s/AKfycbw46JtjM7ZhPwSLyTLpyoTk4QcGpaWtzseElflNy105Ubl7ZKlFmbyrUZxP5natbdjP/exec";

        const btn = document.getElementById('btn-sync-all');
        btn.innerHTML = '<span class="material-icons prompt-spin">cloud_upload</span> Sincronizando datos...';
        btn.disabled = true;

        try {
            const response = await fetch(BACKEND_URL, {
                method: 'POST',
                body: JSON.stringify(pending)
            });

            const result = await response.json();

            if (result.status === 'success') {
                DB.markAsSynced();
                DB.cleanupSynced();
                alert("✅ Registros subidos exitosamente a la Google Sheet de PARACEL.");
                location.reload();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error("Error Sync:", error);
            alert("❌ Ocurrió un error al sincronizar. Por favor, intente más tarde.\n" + error.message);
            btn.innerHTML = '<span class="material-icons">sync</span> Reintentar';
            btn.disabled = false;
        }
    }
};
