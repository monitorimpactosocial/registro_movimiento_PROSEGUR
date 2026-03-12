/**
 * app.js - Lógica Principal Integrada PWA (V2)
 */

const BACKEND_URL = "https://script.google.com/macros/s/AKfycbz8GF-eh-Ubmta5FR7bwM2cay3axJEfH9AJf-kJpm3ef8aJmiY755wn0fbQ3pUuT6SJAg/exec";

const App = {
    // ------------------------------------------------------------------------
    // API SECURE AUTHENTICATION
    // ------------------------------------------------------------------------
    checkAuth: function () {
        if (!localStorage.getItem('prosegur_auth_token')) {
            window.location.href = 'index.html';
        }
    },

    login: async function (e) {
        e.preventDefault();
        const user = document.getElementById('username').value;
        const pass = document.getElementById('password').value;
        const btn = document.getElementById('btn-login-submit');
        const errBox = document.getElementById('login-error');

        btn.innerHTML = '<span class="material-icons prompt-spin">cached</span> Conectando...';
        btn.disabled = true;
        errBox.classList.add('hidden');

        try {
            const resp = await fetch(BACKEND_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accion: 'verificarLogin', user: user, pass: pass })
            });

            const data = await resp.json();

            if (data.success) {
                // Guardar Token y Perfil Seguros
                localStorage.setItem('prosegur_auth_token', data.token);
                localStorage.setItem('prosegur_user_data', JSON.stringify(data.user));

                // Redirigir según el rol
                if (data.user.rol === 'admin') {
                    window.location.href = 'dashboard.html';
                } else {
                    document.getElementById('puesto-label').textContent = data.user.nombre;
                    document.getElementById('login-screen').classList.add('hidden');
                    document.getElementById('dashboard-screen').classList.remove('hidden');
                    document.getElementById('logout-btn').classList.remove('hidden');
                }
            } else {
                document.getElementById('login-error-text').textContent = data.message;
                errBox.classList.remove('hidden');
            }
        } catch (error) {
            document.getElementById('login-error-text').textContent = "Error de red. Activa tus datos o WiFi.";
            errBox.classList.remove('hidden');
        } finally {
            btn.innerHTML = '<span class="material-icons">login</span> Ingresar';
            btn.disabled = false;
        }
    },

    logout: function () {
        localStorage.removeItem('prosegur_auth_token');
        localStorage.removeItem('prosegur_user_data');
        window.location.href = 'index.html';
    },

    // ------------------------------------------------------------------------
    // OFFLINE MONITORING UI
    // ------------------------------------------------------------------------
    initNetworkMonitoring: function () {
        const updateOnlineStatus = () => {
            const indicator = document.getElementById('connection-status');
            if (!indicator) return;

            if (navigator.onLine) {
                indicator.className = 'status-pill online';
                indicator.innerHTML = '<span class="material-icons" style="font-size:16px;">wifi</span> <span>Conectado</span>';
            } else {
                indicator.className = 'status-pill offline';
                indicator.innerHTML = '<span class="material-icons" style="font-size:16px;">signal_wifi_off</span> <span>Offline</span>';
            }
        };

        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        updateOnlineStatus();
    },

    updateBadge: function () {
        this.initNetworkMonitoring();
        const pending = DB.getPendingSync();
        const badge = document.getElementById('badge-pendientes');
        if (badge) {
            if (pending.total > 0) {
                badge.classList.remove('hidden');
                badge.textContent = pending.total;
            } else {
                badge.classList.add('hidden');
            }
        }
    },

    // ------------------------------------------------------------------------
    // DATA BINDING AUTOMATION
    // ------------------------------------------------------------------------
    loadCatalog: async function (url, selectId) {
        try {
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

            // Memoria: Seleccionar automáticamente el último "Puesto de Control" si existe.
            if (selectId === 'puesto_control') {
                const memPuesto = localStorage.getItem('prosegur_memory_puesto');
                if (memPuesto) select.value = memPuesto;
            }

        } catch (e) {
            console.error(`Error loading catalog ${url}:`, e);
        }
    },

    handleSpecify: function (selectId) {
        const select = document.getElementById(selectId);
        const input = document.getElementById(`${selectId}_otro`);
        if (select && input) {
            if (select.value === 'otro' || select.value === 'NSNC') {
                input.classList.remove('hidden');
                input.required = true;
            } else {
                input.classList.add('hidden');
                input.required = false;
                input.value = '';
            }
        }
    },

    handleAcompanantes: function () {
        const count = parseInt(document.getElementById('acompanantes').value) || 0;
        const container = document.getElementById('acompanantes_container');
        if (!container) return;

        container.innerHTML = '';

        if (count > 0 && count < 30) {
            let html = '<div style="margin-top:14px; padding-top:14px; border-top: 1px dashed var(--border);"><h4>Detalle de Acompañantes</h4>';
            for (let i = 1; i <= count; i++) {
                html += `
                    <div style="background:var(--surface-soft); padding: 14px; margin-bottom: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border);">
                        <label style="font-size: 0.8rem; color: var(--secondary);">Acompañante ${i}</label>
                        <input type="text" name="acomp_nombre_${i}" placeholder="Nombre y Apellido" required style="margin-bottom: 8px;">
                        <input type="text" name="acomp_doc_${i}" placeholder="Nro Documento (Opcional)">
                    </div>
                `;
            }
            html += '</div>';
            container.innerHTML = html;
        } else if (count >= 30) {
            alert("El contingente es demasiado grande para detallar individualmente. Se ha guardado el número, utilice las Observaciones para referenciar (Ej. Bus Escolar, Plantel Empresa XYZ).");
        }
    },

    // ------------------------------------------------------------------------
    // MÓDULO RONDAS Y CONTROL (MOVIMIENTOS)
    // ------------------------------------------------------------------------
    initRegistroFlow: function () {
        const urlParams = new URLSearchParams(window.location.search);
        const tipo = urlParams.get('tipo') || 'entrada';

        document.getElementById('tipo_movimiento').value = tipo;
        document.getElementById('page-title').textContent = tipo === 'entrada' ? 'Registro de Entrada' : 'Registro de Salida';

        // Autocompletar el nombre del guardia
        const ud = JSON.parse(localStorage.getItem('prosegur_user_data') || '{}');
        if (ud.nombre) document.getElementById('registrante').value = ud.nombre;

        this.loadCatalog('puestos_control.json', 'puesto_control');
        this.loadCatalog('medios_transporte.json', 'medio_transporte');
        this.loadCatalog('comunidades.json', 'origen');
        this.loadCatalog('motivos_ingreso.json', 'motivo');
    },

    saveRegistro: function () {
        const form = document.getElementById('registro-form');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // Memoria Puesto
        if (data.puesto_control) localStorage.setItem('prosegur_memory_puesto', data.puesto_control);

        if (data.medio_transporte === 'otro') data.medio_transporte = data.medio_transporte_otro;
        if (data.origen === 'otro') data.origen = data.origen_otro;
        if (data.motivo === 'otro') data.motivo = data.motivo_otro;

        const count = parseInt(data.acompanantes) || 0;
        const acomp_list = [];
        for (let i = 1; i <= count; i++) {
            if (data[`acomp_nombre_${i}`]) {
                const docStr = data[`acomp_doc_${i}`] ? `(Doc: ${data[`acomp_doc_${i}`]})` : '';
                acomp_list.push(`${data[`acomp_nombre_${i}`]} ${docStr}`);
                delete data[`acomp_nombre_${i}`];
                delete data[`acomp_doc_${i}`];
            }
        }
        data.detalle_acompanantes = acomp_list.length > 0 ? acomp_list.join(" | ") : "Ninguno";

        DB.saveRegistroMovimiento(data);

        // Feedback
        alert(`Guardado en el equipo local.`);
        window.location.href = 'index.html';
    },

    // ------------------------------------------------------------------------
    // MÓDULO EVENTOS (ALTA CRITICIDAD)
    // ------------------------------------------------------------------------
    initEventoFlow: function () {
        const ud = JSON.parse(localStorage.getItem('prosegur_user_data') || '{}');
        if (ud.nombre) document.getElementById('registrante').value = ud.nombre;

        this.loadCatalog('puestos_control.json', 'puesto_control');
        this.loadCatalog('tipos_evento.json', 'tipo_evento');
        this.loadCatalog('medios_transporte.json', 'medio_transporte');

        const now = new Date();
        document.getElementById('fecha_evento').valueAsDate = now;
        document.getElementById('hora_evento').value = now.toTimeString().substring(0, 5);

        const fileInput = document.getElementById('evidencia_file');
        if (fileInput) {
            fileInput.addEventListener('change', function (e) {
                const file = e.target.files[0];
                if (!file) return;

                if (file.size > 8 * 1024 * 1024) {
                    alert("⚠️ Advertencia: El archivo supera los 8MB. La sincronización offline podría demorar en entornos de la planta sin 4G.");
                }

                const reader = new FileReader();
                reader.onloadend = function () {
                    const base64String = reader.result;
                    document.getElementById('evidencia_base64').value = base64String;

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

    saveEvento: function () {
        const form = document.getElementById('evento-form');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        if (data.puesto_control) localStorage.setItem('prosegur_memory_puesto', data.puesto_control);

        if (data.tipo_evento === 'otro') data.tipo_evento = data.tipo_evento_otro;
        if (data.medio_transporte === 'otro' || data.medio_transporte === 'NSNC') data.medio_transporte = data.medio_transporte_otro;

        DB.saveEvento(data);
        alert(`Evento/Novedad archivada localmente.`);
        window.location.href = 'index.html';
    },

    // ------------------------------------------------------------------------
    // SINCRONIZACIÓN API
    // ------------------------------------------------------------------------
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
            syncBtn.className = 'btn btn-ghost disabled';
            list.querySelectorAll('.record-card').forEach(e => e.remove());
            return;
        }

        emptyMsg.style.display = 'none';

        let htmlSnippet = '';

        pending.movimientos.forEach(item => {
            const dateStr = new Date(item.timestamp).toLocaleString('es-ES');
            htmlSnippet += `
                <div class="record-card">
                    <div class="info">
                        <div class="title">${item.payload.tipo_movimiento.toUpperCase()} - ${item.payload.transeunte_nombre}</div>
                        <div class="details">🕒 ${dateStr} • 📍 Puesto: ${item.payload.puesto_control}</div>
                    </div>
                </div>
            `;
        });

        pending.eventos.forEach(item => {
            const dateStr = new Date(item.timestamp).toLocaleString('es-ES');
            htmlSnippet += `
                <div class="record-card evento">
                    <div class="info">
                        <div class="title">ALERTA: Gravedad ${item.payload.nivel_gravedad.toUpperCase()}</div>
                        <div class="details">🕒 ${dateStr} • 📍 ${item.payload.lugar_evento}</div>
                    </div>
                </div>
            `;
        });

        list.innerHTML = htmlSnippet + list.innerHTML; // Append leaving the empty msg hidden
    },

    syncAll: async function () {
        if (!navigator.onLine) {
            alert("No hay conexión DEDICADA de red. Conéctese a Wi-Fi o red Satelital para vaciar la Pila Offline.");
            return;
        }

        const pending = DB.getPendingSync();
        if (pending.total === 0) return;

        const token = localStorage.getItem('prosegur_auth_token');

        const btn = document.getElementById('btn-sync-all');
        btn.innerHTML = '<span class="material-icons prompt-spin">cached</span> Transmitiendo Encriptado...';
        btn.disabled = true;

        try {
            const response = await fetch(BACKEND_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    accion: 'sincronizarRegistros',
                    token: token,
                    movimientos: pending.movimientos,
                    eventos: pending.eventos
                })
            });

            const result = await response.json();

            if (result.success) {
                DB.markAsSynced();
                DB.cleanupSynced();
                alert(`✅ Comando Central notificado con éxito. (${result.detalles.movimientos} Mov. | ${result.detalles.eventos} Evt)`);
                location.reload();
            } else if (result.authError) {
                alert("Su sesión venció durante la guardia. Vuelva a Iniciar Sesión para empujar la carga offline.");
                this.logout();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error("Error Sync:", error);
            alert("❌ Falla en la transmisión segura. \nDetalle técnico: " + error.message);
            btn.innerHTML = '<span class="material-icons">cloud_upload</span> Conectar y Empujar Pila';
            btn.disabled = false;
        }
    }
};
