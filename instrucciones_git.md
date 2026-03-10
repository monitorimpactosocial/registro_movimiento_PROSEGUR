# Instrucciones Claves de Control de Versiones con Git y GitHub

Este documento asegura que el equipo del proyecto mantenga los estándares de gestión de código al sincronizar el trabajo local con el repositorio remoto de GitHub.

## 1. Comandos Iniciales de Configuración

Abre la terminal de Powershell o Git Bash y navega a la carpeta de tu proyecto. Asegúrate de ejecutar este bloque para iniciar la configuración:

```bash
cd "C:\Users\DiegoMeza\OneDrive - PARACEL S.A\MONITOREO_IMPACTO_SOCIAL_PARACEL\REGISTRO_ENTRADAS_EVENTOS_PROSEGUR"
```

Si es la **primera vez** que configuras el proyecto localmente (el comando `git status` arroja un error):

```bash
git init
git remote add origin https://github.com/monitorimpactosocial/registro_movimiento_PROSEGUR.git
git add .
git commit -m "Estructura inicial del sistema de registro de entradas, salidas y eventos PROSEGUR"
git branch -M main
git push -u origin main
```

*(Es posible que te solicite iniciar sesión con tus credenciales de GitHub al realizar el `push`)*

## 2. Flujo de Trabajo Rutinario para el Equipo Local

A medida que sigas integrando mejoras al proyecto, al finalizar una jornada operativa realizarás lo siguiente:

```bash
# Verificar los archivos modificados
git status

# Agregar todos los cambios realizados
git add .

# Generar un "commit" o paquete de actualización con un mensaje claro
git commit -m "Actualización del sistema de registro PROSEGUR: Formularios y Catálogos"

# Subir los cambios a GitHub
git push origin main
```

## 3. Recuperar Novedades desde GitHub

Si algún otro compañero del equipo subió cambios al repositorio remoto y requieres actualizar tu carpeta local, ejecuta:

```bash
git pull origin main
```
