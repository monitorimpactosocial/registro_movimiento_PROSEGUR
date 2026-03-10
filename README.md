# Sistema de Registro de Entradas y Eventos - PROSEGUR (PARACEL)

Plataforma progresiva (PWA) de captura operativa para dispositivos móviles, orientada al registro eficiente de flujo de personas y novedades en puestos de control, con total soporte offline e interface ágil.

## Arquitectura

El proyecto sigue una arquitectura "Offline-First" con tecnologías frontend estándar que aseguran un funcionamiento sin dependencia continua de la red:

- **Frontend:** HTML5, CSS3, JavaScript (Vanilla).
- **Almacenamiento Local:** LocalStorage / IndexedDB (cola de registros en dispositivo).
- **Sincronización:** Manual / Automática (cuando haya reanudación de red) hacia el backend.
- **Catálogos:** Manejo estático mediante archivos JSON locales para carga ultrarápida.

## Estructura de Directorios

```
REGISTRO_ENTRADAS_EVENTOS_PROSEGUR/
├── app/
│   ├── index.html        # Hub central y dashboard principal
│   ├── registro.html     # Captura de Entradas y Salidas
│   ├── eventos.html      # Captura de Eventos / Incidentes
│   ├── pendientes.html   # Cola de envío (offline-first sync)
│   ├── css/              # Hojas de estilo y variables base
│   ├── js/               # Lógica de registro, DB local y sincronización
│   ├── assets/           # Imágenes y logos institucionales
│   └── data/             # Directorio de datos locales temporales
├── backend/              # Estructura preparada para API/Google Apps Script
├── docs/                 # Documentación del sistema
├── catalogos/            # Archivos JSON con catálogos estandarizados
├── README.md             # Este documento
├── package.json          # Archivo descriptor inicial del proyecto
└── instrucciones_git.md  # Instrucciones de control de versiones
```

## Flujo Operacional (Offline)
1. **Captura:** El usuario registra datos desde la interfaz de la PWA.
2. **Post-carga:** El sistema encola el registro internamente (LocalStorage).
3. **Distribución:** La página `pendientes` extrae y expone los datos para ser sincronizados masivamente hacia el servidor mediante Push.

## Autores y Mantenimiento
Proyecto desarrollado para **PARACEL S.A.**, Equipo de Monitoreo de Impacto Social.
