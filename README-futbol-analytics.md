# Futbol Analytics — versión de un solo archivo

Esta es la misma app (jugadores, evaluaciones físicas con baremos por edad, ficha médica,
ficha nutricional, perfil por posición, reportes, configuración y respaldo), pero
empaquetada en un único archivo `index.html` que contiene todo el HTML, el CSS y el
JavaScript. Ya no hay carpetas `css/` ni `js/` por separado.

Ventajas de esta versión:

- **Un solo archivo para subir** — nada de límites de "100 archivos" en GitHub.
- **Funciona incluso con doble clic** desde el explorador de archivos (abre como
  `file:///...`), porque ya no depende de módulos de JavaScript externos que los
  navegadores bloquean bajo ese protocolo.
- Se sube a GitHub Pages exactamente igual: solo necesitas ese `index.html` en la raíz
  del repositorio.

## Cómo subirlo a GitHub (la forma más simple)

Con un solo archivo, ya ni siquiera necesitas GitHub Desktop si no quieres:

1. Entra a tu repositorio en github.com (o crea uno nuevo con el botón verde "New").
2. Clic en **Add file → Upload files**.
3. Arrastra el `index.html` (ese único archivo).
4. Clic en **Commit changes**.
5. Ve a **Settings → Pages**, en "Build and deployment" elige **Deploy from a branch**,
   rama `main`, carpeta `/ (root)`, y guarda.
6. En un par de minutos tu app queda en `https://TU-USUARIO.github.io/TU-REPOSITORIO/`.

## Probarlo en tu computador antes de subirlo

Ahora sí puedes simplemente hacer **doble clic en `index.html`** y se abrirá en tu
navegador funcionando por completo (ya no hace falta servidor local).

## Nota sobre los datos

Sigue guardando todo en el navegador (IndexedDB), no en un servidor. Usa la sección
**Copia de seguridad** dentro de la app para exportar un respaldo `.json` de vez en
cuando, por si necesitas moverlo a otro computador.

## Si prefieres el código separado por archivos

Ya tienes también `futbol-analytics.zip` con la versión organizada en `css/`, `js/` y
`js/views/` (más fácil de editar si en el futuro quieres modificar partes puntuales del
código). Ambas versiones son funcionalmente idénticas.
