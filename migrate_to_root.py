import os
import glob
import re

base_dir = r"C:\Users\DiegoMeza\OneDrive - PARACEL S.A\MONITOREO_IMPACTO_SOCIAL_PARACEL\REGISTRO_ENTRADAS_EVENTOS_PROSEGUR"
app_dir = os.path.join(base_dir, "app")

# 1. Move HTML files and rewrite paths
html_files = glob.glob(os.path.join(app_dir, "*.html"))
index_content = ""

for file_path in html_files:
    filename = os.path.basename(file_path)
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Update paths
    content = content.replace('href="css/', 'href="app/css/')
    content = content.replace('src="js/', 'src="app/js/')
    
    if filename != "index.html":
        # Add checkAuth call
        content = content.replace("App.initRegistroFlow();", "App.checkAuth();\n            App.initRegistroFlow();")
        content = content.replace("App.initEventoFlow();", "App.checkAuth();\n            App.initEventoFlow();")
        content = content.replace("App.loadPendientes();", "App.checkAuth();\n            App.loadPendientes();")
    else:
        # Save index content to manipulate later
        index_content = content
        continue

    # write to root
    new_path = os.path.join(base_dir, filename)
    with open(new_path, "w", encoding="utf-8") as f:
        f.write(content)
        
    os.remove(file_path)

# 2. Re-write index.html with Login Screen
new_index_html = """<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PROSEGUR - Control de Accesos</title>
    <link rel="stylesheet" href="app/css/style.css">
    <!-- Iconos de Material Design -->
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        .login-container { max-width: 400px; margin: 4rem auto; padding: 2rem; background: #fff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center; }
        .login-container h2 { color: #00763C; margin-bottom: 1.5rem; }
    </style>
</head>
<body>
    <header class="app-header">
        <div class="logo">
            <h1>PARACEL</h1>
            <span class="subtitle">Monitoreo de Impacto Social</span>
        </div>
        <div class="user-info">
            <span class="material-icons">account_circle</span>
            <span id="puesto-label">PROSEGUR</span>
            <a href="#" onclick="App.logout()" id="logout-btn" style="display:none; color:white; font-size: 0.75rem; text-decoration: underline;">Cerrar Sesión</a>
        </div>
    </header>

    <div id="login-screen" class="login-container">
        <h2>Acceso Restringido</h2>
        <form id="login-form" onsubmit="App.login(event)">
            <div class="form-group">
                <input type="text" id="username" placeholder="Usuario" required autocomplete="off">
            </div>
            <div class="form-group">
                <input type="password" id="password" placeholder="Contraseña" required>
            </div>
            <button type="submit" class="btn btn-primary btn-block">Ingresar</button>
        </form>
    </div>

    <main class="dashboard" id="dashboard-screen" style="display:none;">
        <div class="welcome-box">
            <h2>Registro de Accesos y Novedades</h2>
            <p>Seleccione el tipo de registro a ingresar:</p>
        </div>

        <div class="action-grid">
            <a href="registro.html?tipo=entrada" class="action-card bg-primary animate-hover">
                <span class="material-icons">login</span>
                <h3>Registrar Entrada</h3>
                <p>Personal, vehículos y visitas ingresando.</p>
            </a>
            
            <a href="registro.html?tipo=salida" class="action-card bg-secondary animate-hover">
                <span class="material-icons">logout</span>
                <h3>Registrar Salida</h3>
                <p>Personal, vehículos y visitas saliendo.</p>
            </a>

            <a href="eventos.html" class="action-card bg-warning animate-hover">
                <span class="material-icons">report_problem</span>
                <h3>Registrar Evento</h3>
                <p>Novedades, incidentes o anomalías en el puesto.</p>
            </a>

            <a href="pendientes.html" class="action-card bg-dark animate-hover">
                <div class="notification-badge" id="badge-pendientes" style="display:none;">0</div>
                <span class="material-icons">cloud_sync</span>
                <h3>Sincronización</h3>
                <p>Registros guardados en el dispositivo (Offline).</p>
            </a>
        </div>
    </main>

    <footer class="app-footer">
        <p>Sistema Offline-First. PARACEL S.A.</p>
        <div id="connection-status" class="status-indicator online">
            <span class="material-icons icon-sm">wifi</span> <span class="status-text">Conectado</span>
        </div>
    </footer>

    <script src="app/js/db.js"></script>
    <script src="app/js/app.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            if (localStorage.getItem('prosegur_auth_token')) {
                document.getElementById('login-screen').style.display = 'none';
                document.getElementById('dashboard-screen').style.display = 'block';
                document.getElementById('logout-btn').style.display = 'block';
            }
            App.updateBadge();
        });
    </script>
</body>
</html>"""

if index_content:
    with open(os.path.join(base_dir, "index.html"), "w", encoding="utf-8") as f:
        f.write(new_index_html)
    os.remove(os.path.join(app_dir, "index.html"))

# 3. Update app.js logic
app_js_path = os.path.join(app_dir, "js", "app.js")
with open(app_js_path, "r", encoding="utf-8") as f:
    app_js = f.read()

app_js = app_js.replace('../catalogos/', 'catalogos/')

auth_logic = """
    // Auth Logic
    checkAuth: function() {
        if (!localStorage.getItem('prosegur_auth_token')) {
            window.location.href = 'index.html';
        }
    },
    
    login: function(e) {
        e.preventDefault();
        const user = document.getElementById('username').value;
        const pass = document.getElementById('password').value;
        
        if (user === 'prosegur' && pass === 'pr0segur2026') {
            localStorage.setItem('prosegur_auth_token', 'true');
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('dashboard-screen').style.display = 'block';
            document.getElementById('logout-btn').style.display = 'block';
        } else {
            alert('Credenciales incorrectas');
        }
    },
    
    logout: function() {
        localStorage.removeItem('prosegur_auth_token');
        window.location.href = 'index.html';
    },

    """
app_js = app_js.replace("initNetworkMonitoring: function() {", auth_logic + "initNetworkMonitoring: function() {")

with open(app_js_path, "w", encoding="utf-8") as f:
    f.write(app_js)

print("Migration and auth setup complete.")
