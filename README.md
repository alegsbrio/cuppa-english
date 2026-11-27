# Cuppa ☕ — English daily · Aptis B2

Aplicación web para preparar el nivel B2 del examen Aptis con desafíos diarios, vocabulario con repaso espaciado y método británico (todo en inglés, gramática por descubrimiento, voz y ortografía de Reino Unido).

## Cómo usarla

**En el móvil o en cualquier navegador:** <https://alegsbrio.github.io/cuppa-english/>. Desde el menú del navegador se puede añadir a la pantalla de inicio; después funciona también sin conexión.

**En local** requiere [Node.js](https://nodejs.org).

- **Windows:** doble clic en `Iniciar.bat`.
- **Cualquier sistema:** `node server.js` y abre <http://localhost:5173>.

No tiene dependencias ni paso de compilación. El progreso se guarda en el navegador (se puede exportar e importar desde *Progreso → Ajustes*).

## Qué incluye

- 5 desafíos diarios: palabras nuevas, repaso, gramática, una destreza del examen y rincón británico.
- 12 unidades de B1 a B2: 144 palabras, 96 preguntas de gramática, 48 colocaciones y 40 ejercicios de formación de palabras.
- Tareas de Reading, Listening, Writing y Speaking con el formato de las partes de Aptis, y un simulacro del Core.
- Prueba de nivel inicial, racha, niveles, logros y lista de errores para repasar.

## Estructura

- `index.html`, `css/styles.css`, `js/app.js`: la aplicación.
- `js/data/`: el contenido (vocabulario, gramática y destrezas). Se amplía añadiendo entradas a estos archivos.
- `server.js`: servidor estático solo para uso local.

Las puntuaciones de la app son orientativas; no es un producto oficial de Aptis ni del British Council.
