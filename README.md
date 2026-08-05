# Futbol Analytics

Aplicación web para la gestión integral de jugadores de fútbol formativo: fichas de jugador con foto, evaluaciones físicas basadas en baremos por edad, ficha médica, ficha nutricional, perfilamiento automático y clasificación por posición de juego.

Está pensada para clubes y escuelas de formación (como el estudio de referencia de este proyecto, realizado con la categoría 12-13 años del Club Deportivo Cristo Rey) y es válida para cualquier rango de edad, ya que los baremos y las categorías son configurables.

## ¿Qué incluye?

- **Jugadores**: ficha completa (datos básicos, contacto del acudiente, club, posición) con foto.
- **Evaluaciones físicas**: captura de talla, peso (con IMC automático) y la batería completa de pruebas del club (fuerza abdominal, flexo-extensión de codo, salto vertical, salto horizontal, test de Cooper, test de 30 m, agilidad, coordinación y pruebas técnicas con balón). Las pruebas con baremo (abdominales, flexo-extensión, saltos y Cooper) calculan el puntaje 0-10 automáticamente según la edad del jugador; las pruebas técnico-tácticas se califican manualmente por el entrenador.
- **Importación desde Excel**: botón para cargar directamente una matriz como la del club (mismas columnas) y crear jugadores + evaluaciones en bloque.
- **Perfil del jugador**: radar por categoría (fuerza, potencia, velocidad, resistencia, agilidad/coordinación, técnica), progreso en el tiempo, observaciones automáticas (fortalezas, aspectos a mejorar, pruebas prioritarias) y ranking de idoneidad por posición de juego.
- **Ficha médica**: revisiones, lesiones (zona, tiempo de recuperación, estado), aptitud deportiva, alergias y antecedentes.
- **Ficha nutricional**: peso/talla/IMC, % de grasa, plan alimenticio y seguimiento.
- **Reportes**: ranking del equipo por score físico-técnico, promedio por categoría, filtros por edad/posición y exportación a CSV.
- **Configuración**: edita desde la propia app el nombre del club, las categorías de edad, los pesos de cada posición y las tablas de baremos (con opción de restaurar los valores originales del estudio).
- **Copia de seguridad**: exportar/importar toda la base de datos en un archivo `.json`.

## Cómo se guardan los datos

Esta aplicación es 100% estática (HTML + CSS + JavaScript, sin backend) y toda la información —incluidas las fotos— se guarda en **IndexedDB, dentro del navegador de cada usuario**. Esto significa:

- No necesitas servidor, base de datos externa, ni backend: puedes subirla tal cual a GitHub Pages.
- Los datos **no se sincronizan** entre computadores o navegadores distintos.
- Si limpias los datos del navegador (o usas modo incógnito), perderás la información.

**Por eso es muy importante usar la sección "Copia de seguridad" para exportar un respaldo `.json` periódicamente.** Ese archivo se puede volver a importar en cualquier momento, incluso en otro computador.

Si en el futuro quieres que varios entrenadores compartan la misma información desde distintos dispositivos, la app está preparada para migrar el módulo `js/db.js` a un backend en la nube (por ejemplo Firebase o Supabase) sin tener que rehacer el resto de las vistas.

## Estructura del proyecto

```
index.html              Punto de entrada
css/styles.css          Estilos
js/app.js                Router y arranque de la app
js/db.js                 Acceso a datos (IndexedDB)
js/seed.js                Datos por defecto: baremos, posiciones, categorías de edad
js/scoring.js             Motor de cálculo: baremos, categorías, idoneidad por posición, observaciones
js/utils.js                Utilidades generales (fechas, IMC, helpers de UI)
js/views/                  Una vista por módulo (jugadores, evaluaciones, médico, nutrición, reportes, configuración, backup, dashboard, perfil)
```

## Origen de los baremos

Los valores de referencia de fuerza abdominal, flexo-extensión de codo, salto vertical, salto horizontal y test de Cooper (edades 12 a 18) se tomaron del documento **"PROTOCOLOS DE LAS PRUEBAS DE VALORACIÓN"** del club. Algunas celdas venían vacías o con inconsistencias de formato en el documento original (se documentan en los comentarios de `js/seed.js`); esos valores se estimaron razonablemente y quedan marcados como "estimado" — puedes ajustarlos en cualquier momento desde **Configuración → Baremos**, incluyendo un botón para restaurar los valores originales.

Las pruebas técnico-futbolísticas de la matriz del club (coordinación, conducción, potencia de golpeo, carrera con pase, precisión, control de balón) y la prueba de agilidad y los 30 metros no traían tabla de baremos en el documento entregado, por lo que se califican manualmente por el entrenador (0-10), guardando también el valor crudo para el histórico.

## Cómo publicarla en GitHub Pages

1. Crea un repositorio nuevo en GitHub (por ejemplo `futbol-analytics`).
2. Sube el contenido de esta carpeta (todo lo que está junto a este `README.md`) a la rama `main` del repositorio. Puedes hacerlo desde la web de GitHub ("Add file → Upload files") o con git:
   ```bash
   git init
   git add .
   git commit -m "Primera versión de Futbol Analytics"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/futbol-analytics.git
   git push -u origin main
   ```
3. En GitHub, entra a **Settings → Pages**.
4. En "Build and deployment" selecciona **Deploy from a branch**, rama `main` y carpeta `/ (root)`.
5. Guarda. En un par de minutos tu app quedará disponible en `https://TU-USUARIO.github.io/futbol-analytics/`.

No se requiere ningún paso de compilación (build): es HTML/CSS/JS puro, así que GitHub Pages la sirve directamente.

## Uso local (antes de publicar)

Como la app usa módulos de JavaScript (`type="module"`), no puedes simplemente abrir `index.html` con doble clic en algunos navegadores por restricciones de seguridad con `file://`. Lo más simple es levantar un servidor local, por ejemplo:

```bash
# Con Python
python3 -m http.server 8000

# Con Node
npx serve .
```

Y luego abrir `http://localhost:8000` en el navegador.

## Librerías externas usadas (vía CDN, sin instalación)

- [Chart.js](https://www.chartjs.org/) — gráficos de radar, progreso y barras.
- [SheetJS (xlsx)](https://sheetjs.com/) — importación de la matriz de resultados en Excel.
- [jsPDF](https://github.com/parallax/jsPDF) y [html2canvas](https://html2canvas.hertzen.com/) — incluidas para futura exportación de fichas a PDF.

## Próximos pasos sugeridos

- Calibrar con datos reales del club las tablas marcadas como "estimadas" (flexo-extensión de codo) y agregar baremos propios para agilidad, 30 m y las pruebas técnicas si el club decide estandarizarlas.
- Si el equipo crece o se necesita acceso multiusuario/multidispositivo, migrar `js/db.js` a un backend en la nube.
- Agregar autenticación si se va a dar acceso a varios entrenadores con distintos permisos (por ejemplo, que el nutricionista solo vea/edite la ficha nutricional).
