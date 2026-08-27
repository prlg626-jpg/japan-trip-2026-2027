# Japan Trip 2026-2027

PWA de viaje migrada desde `JP_Itinerario_Hoteles_Rutas_v6.html` sin sobrescribir el HTML original. La app usa React, TypeScript, Vite, Leaflet/OpenStreetMap, Firebase Auth y Cloud Firestore.

## Estado de la migración

- Fuente original: `C:\Users\USUARIO\Downloads\JP_Itinerario_Hoteles_Rutas_v6.html`
- JSON migrado: `src/data/initialTrip.json`
- Script repetible: `scripts/extractTripData.mjs`
- Validación: `scripts/validateTripData.mjs`

El extractor evalúa las capas reales del HTML:

- `BASE` del itinerario inicial.
- Patch v5 de vuelos Bogotá-México-Vancouver-Narita y regreso.
- Patch v6 de hoteles, rutas reales e iglesia del domingo 3.

## Ejecutar localmente

En esta máquina, si `node` del PATH aparece bloqueado, usa el Node empaquetado por Codex:

```powershell
$env:PATH='C:\Users\USUARIO\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;'+$env:PATH
```

Instalar:

```powershell
node C:\Users\USUARIO\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\pnpm\bin\pnpm.cjs install --dangerously-allow-all-builds
```

Desarrollo:

```powershell
pnpm dev
```

Validar datos:

```powershell
pnpm test:data
```

Build:

```powershell
pnpm build
```

## Firebase

1. Crea un proyecto Firebase.
2. Activa Authentication con Google.
3. Activa Cloud Firestore.
4. En Authentication > Settings > Authorized domains, agrega:
   - `localhost`
   - tu dominio de GitHub Pages, por ejemplo `usuario.github.io`
5. Copia `.env.example` a `.env` y llena las variables `VITE_FIREBASE_*`.
6. Publica reglas:

```powershell
firebase deploy --only firestore:rules
```

Las reglas están en `firestore.rules`.

Modelo usado:

- `trips/{tripId}`
- `trips/{tripId}/members/{uid}`
- `trips/{tripId}/days/{dayId}`
- `trips/{tripId}/activities/{activityId}`
- `trips/{tripId}/hotels/{hotelId}`
- `trips/{tripId}/purchases/{purchaseId}`
- `trips/{tripId}/reservations/{reservationId}`
- `trips/{tripId}/sources/{sourceId}`
- `trips/{tripId}/library/{libraryItemId}`
- `trips/{tripId}/settings/main`
- `trips/{tripId}/settings/budget`

El primer usuario que inicia sesión crea el viaje y queda como `owner`. Para autorizar a otra persona, agrega un documento:

`trips/japan-trip-2026-2027/members/{uid}`

con:

```json
{
  "uid": "UID_DEL_USUARIO",
  "email": "correo@example.com",
  "role": "editor"
}
```

## GitHub Pages

El workflow `.github/workflows/deploy-github-pages.yml` construye y publica `dist`.

También dejé un script guiado:

```powershell
.\scripts\deploy-github-pages.ps1
```

Ese script requiere GitHub CLI. Si no lo tienes:

```powershell
winget install --id GitHub.cli -e
gh auth login
```

Por defecto crea un repo privado llamado `japan-trip-2026-2027`. Si decides hacerlo público:

```powershell
.\scripts\deploy-github-pages.ps1 -Public
```

Pasos:

1. Sube el repo a GitHub.
2. En Settings > Pages, elige GitHub Actions.
3. En Settings > Secrets and variables > Actions, agrega:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_FIREBASE_MEASUREMENT_ID`
4. Haz push a `main` o `master`.

Para GitHub Pages, Vite usa `VITE_BASE_PATH=/${repo}/` dentro del workflow.

Nota de privacidad: GitHub Pages sirve archivos estáticos. La app muestra pantalla de login cuando Firebase está configurado, y Firestore protege escritura/lectura de datos sincronizados por usuario autorizado. Aun así, si te preocupa que el JSON inicial quede visible en el bundle, mantén el repositorio privado o mueve el seed inicial a una importación manual de Firestore después de crear el viaje.

## PWA y offline

- `public/manifest.webmanifest` define instalación móvil.
- `public/sw.js` cachea shell y assets locales.
- Firestore usa persistencia IndexedDB multi-tab cuando Firebase está configurado.
- La app siempre guarda una copia local en `localStorage`.
- Indicador visual: `Local`, `Online`, `Sin conexión`, `Sincronizando` o `Revisar sync`.

## Funciones principales

- Pantallas móviles: Hoy, Viaje, Mapa, Dinero, Más.
- Añadir, editar, mover, activar/desactivar, eliminar y completar actividades.
- Drag & drop con `dnd-kit` y activación con distancia/delay para evitar arrastres accidentales al hacer scroll.
- Menú alternativo para mover actividades entre días.
- Estados: idea, pendiente, reservada, pagada, completada.
- Edición de precios estimados y pago real.
- Google Maps, link de reserva y fuente TikTok/Reel.
- Biblioteca/Shoe Lab con añadir al itinerario y descartar.
- Hoteles editables.
- Compras/reservas con comprobantes por URL, Drive, nombre de archivo y estructura futura para Storage.
- Presupuesto con COP/USD/JPY y tasas editables.
- Exportar/importar respaldo JSON completo.
- Restaurar el JSON base migrado desde la interfaz.

## Datos críticos validados

- 19 días presentes: `2026-12-23` a `2027-01-10`.
- 102 actividades migradas.
- Vuelos BOG-MEX, MEX-YVR, YVR-NRT, NRT-YVR, YVR-YUL, YUL-BOG presentes.
- Imperial Hotel Osaka, Hotel Gran Ms Kyoto y Tokyu Stay Shimbashi presentes.
- Hakone permanece como `Ryokan por escoger`.
- Iglesia del domingo `2027-01-03` a las `11:00` presente y fija.
- Única compra inicial: vuelos internacionales por `COP 9.711.421`.
- Hoteles no están marcados como pagados.
- 22 elementos de biblioteca.
- 9 fuentes TikTok/Instagram normalizadas.

## Observaciones conservadas

- El HTML original tiene una arquitectura por parches runtime; se conserva el resultado final y se documenta en `migrationReport`.
- Algunas cadenas internas del HTML usan `Ensenanza` sin ñ; el dato fuente se conserva.
- No se migran binarios de comprobantes porque la versión inicial usa URL/nombre/Drive y deja `storagePath` preparado para Firebase Storage.
