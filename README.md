# Calculadora de Inversión para Tienda Online

SPA 100 % frontend para estimar la inversión, la ganancia, el margen y el punto de equilibrio de
un producto comprado para revender. Los datos se guardan solo en el navegador (`localStorage`),
sin cuentas ni servidor.

> Esta calculadora es una **estimación**. No reemplaza asesoría contable ni tributaria. Verifica
> siempre los impuestos y comisiones con la fuente oficial de tu país.

## Características

- Varios proyectos (escenarios) con nombre, moneda, cantidad, costo unitario, envío y precio de venta.
- Costos predefinidos por país (IVA, arancel, comisión de plataforma) editables, desactivables y
  eliminables, con botón para restablecer el valor por defecto.
- Costos personalizados (monto fijo o porcentaje) con orden libre: el orden importa para la base
  «CIF + costos anteriores».
- Resultados en vivo: inversión total, ingresos, ganancia neta, margen, ROI, costo unitario puesto
  en bodega y precio de equilibrio.
- Desglose línea por línea separando lo que se paga antes de vender de lo que se cobra al vender.
- **Costos recuperables**: marca IVA u otros costos recuperables y compara la inversión de caja con
  el costo real.
- **Comparador de cantidades** (50/100/500 o las que elijas), **análisis de sensibilidad** al precio
  y **gráfico SVG** de composición de costos.
- Exportar e importar proyectos en JSON (reemplazar o fusionar) y borrar todos los datos.
- **PWA**: se puede instalar y usar sin conexión después de la primera visita.
- Interfaz en español, responsive, navegable por teclado y con modo oscuro automático según el
  sistema operativo.

## Stack

| Área        | Elección                       |
| ----------- | ------------------------------ |
| Build       | Vite                           |
| UI          | React 18 + TypeScript (strict) |
| Estilos     | Tailwind CSS v4                |
| Estado      | Zustand + `persist`            |
| Validación  | Zod                            |
| Tests       | Vitest + React Testing Library |
| Lint/format | ESLint + Prettier              |
| Auditoría   | axe-core                       |

## Requisitos

- Node.js 20.19+ o 22.12+
- pnpm 11 (el workflow de Pages usa esa versión; los scripts también funcionan con `npm run`)

## Instalación

```bash
pnpm install
pnpm dev
```

La app queda disponible en `http://localhost:5173` (en dev la base es `/`).

## Scripts

| Comando             | Qué hace                                                  |
| ------------------- | --------------------------------------------------------- |
| `pnpm dev`          | Servidor de desarrollo                                    |
| `pnpm build`        | Type-check + build de producción en `dist/`               |
| `pnpm preview`      | Sirve el build en `http://localhost:4173/invest_calc/`    |
| `pnpm test`         | Ejecuta la suite de tests una vez                         |
| `pnpm test:watch`   | Tests en modo watch                                       |
| `pnpm coverage`     | Tests con reporte de cobertura (mínimo 90 % en `domain/`) |
| `pnpm lint`         | ESLint (incluye reglas de accesibilidad)                  |
| `pnpm format`       | Prettier (escribe)                                        |
| `pnpm format:check` | Prettier (solo verifica)                                  |

## Cómo se calcula

1. `productCostTotal = costo unitario × cantidad` (la cantidad se normaliza a entero mínimo 1).
2. `shippingTotal` según el envío sea total o por unidad.
3. `CIF = productos + envío`.
4. Cada costo habilitado, **en orden**:
   - porcentaje sobre `product`, `cif`, `accumulated` (CIF + costos anteriores que no son de
     ventas) o `revenue`;
   - monto fijo total o por unidad.
5. Los costos porcentuales sobre ventas son «al vender»; el resto es inversión inicial.
6. `inversión = CIF + costos upfront`; `ganancia = ingresos − (inversión + comisiones)`.
7. Precio de equilibrio: `(inversión) / (cantidad × (1 − suma de tasas sobre ventas))`; si esa
   suma es ≥ 100 %, no existe.

No se redondea en pasos intermedios: solo al mostrar, con `Intl.NumberFormat`. Los datos inválidos
(`NaN`, infinitos, negativos) se normalizan y la función de cálculo nunca lanza.

## Presets de impuestos (Chile)

Los valores viven en `src/config/presets.ts`, cada uno con `sourceNote` y una fecha
`lastVerified`. Valores actuales (verificados el **2026-10-20**):

| Costo               | Valor | Base          | Fuente                                                    |
| ------------------- | ----- | ------------- | --------------------------------------------------------- |
| Arancel aduanero    | 6 %   | CIF           | Aduanas de Chile (arancel general ad valorem)             |
| IVA importación     | 19 %  | CIF + arancel | SII, art. 14 LIVS                                         |
| Comisión plataforma | 0 %\* | Ventas        | Mercado Libre Chile (varía por categoría, 8 %–21 % + IVA) |

\* La comisión de Mercado Libre **no tiene una tasa única**: depende de la categoría y del tipo de
publicación, y se le suma 19 % de IVA. Se deja en 0 con un `TODO: verificar` para no inventar un
porcentaje; escribe tu tasa efectiva (comisión × 1,19) en el proyecto.

El IVA viene marcado como **recuperable** (crédito fiscal) porque es lo habitual para un vendedor
contribuyente; desmarca la casilla si no lo eres. El arancel no es recuperable.

El perfil `GENERIC` (USD) trae los mismos tres costos en 0 como plantilla para otros países.

### Cómo actualizar un preset

1. Edita `src/config/presets.ts`: cambia `defaultValue`, `description` y `sourceNote`.
2. Actualiza `lastVerified` con la fecha de verificación (`YYYY-MM-DD`).
3. Ejecuta `pnpm test && pnpm build`. Los tests verifican la estructura y el orden de los presets
   (el arancel debe ir antes del IVA para la base `accumulated`).

Al cambiar un preset, los proyectos ya creados conservan su valor guardado; el botón
**Restablecer valor por defecto** aplica el nuevo valor a cada costo con `presetId`.

## Extras

### Costos recuperables

Cada costo tiene una casilla **Recuperable** (el IVA de Chile viene marcada por defecto). Cuando hay
costos recuperables, el panel muestra dos métricas adicionales:

- **Inversión de caja**: el desembolso real antes de vender.
- **Costo real de inversión**: la inversión menos lo que se recupera (por ejemplo, el IVA como
  crédito fiscal).

El precio de equilibrio se calcula sobre la inversión de caja, porque es el dinero que hay que poner.

### Comparador de cantidades

Compara la misma ficha con distintas cantidades (por defecto 50, 100 y 500). Sirve para ver cómo el
envío y los costos fijos por unidad cambian el margen. La cantidad actual siempre está incluida.

### Sensibilidad al precio

Tabla de ganancia y margen al mover el precio de venta ±10 % y ±20 %. Las pérdidas se marcan con
color, icono (▼) y texto para lectores de pantalla.

### Composición de costos

Gráfico SVG propio (sin librerías) con el peso de productos, envío, otros costos iniciales y
comisiones de venta sobre el costo total. Incluye leyenda con montos y porcentajes y una descripción
accesible.

### PWA y uso offline

`vite-plugin-pwa` genera el manifest (`dist/manifest.webmanifest`), el service worker (`dist/sw.js`)
y el precache de los assets en cada build. Después de la primera visita la app funciona offline y se
puede instalar desde el navegador. Los datos siguen viviendo en `localStorage`, así que no se pierden
al quedar sin conexión.

Para probarlo:

```bash
pnpm build
pnpm preview --port 4173
```

Abre `http://localhost:4173/invest_calc/`, espera a que se registre el service worker, activa el modo
offline en DevTools y recarga.

## Despliegue en GitHub Pages

El sitio se publica en **https://callampin.github.io/invest_calc/** mediante
`.github/workflows/deploy.yml`: en cada push a `main` instala dependencias, ejecuta `pnpm build` y
sube `dist/` como artefacto de Pages.

Configuración inicial (una sola vez):

1. GitHub → **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Push a `main` o ejecuta el workflow a mano desde la pestaña **Actions**.

Como el sitio vive en un subdirectorio, `vite.config.ts` define
`REPO_BASE = '/invest_calc/'` y Vite lo aplica a los assets, al manifest y al service worker. Si
cambias el nombre del repositorio o usas un dominio propio, actualiza `REPO_BASE` (`'/'` para un
dominio propio). En desarrollo la base sigue siendo `/`.

Para reproducir el entorno de Pages en local:

```bash
pnpm build
pnpm preview   # http://localhost:4173/invest_calc/
```

Verificación rápida tras el deploy:

```bash
curl -s https://callampin.github.io/invest_calc/ | grep -o 'src="[^"]*"'
curl -sI https://callampin.github.io/invest_calc/manifest.webmanifest
```

Deben aparecer rutas `/invest_calc/assets/...` y el manifest debe responder con
`application/manifest+json`.

## Persistencia y respaldo

- Clave de `localStorage`: `invest-calc:v1`, con versión de esquema y migraciones en
  `src/store/migrations.ts`.
- Al cargar se valida con Zod. Si el dato está corrupto o no cumple el esquema, se guarda una copia
  en `invest-calc:backup` y la app arranca vacía sin romperse.
- Si `localStorage` no está disponible (modo privado, cuota llena), se avisa con un toast y se usa
  un respaldo en memoria durante la sesión.
- **Exportar JSON** descarga todos los proyectos; **Importar JSON** valida el archivo y permite
  reemplazar o fusionar. **Borrar todos los datos** pide confirmación.

## Estructura

```
src/
├── domain/      Lógica de negocio pura (sin React ni DOM)
├── config/      Presets de costos por país
├── store/       Zustand + persist, migraciones, almacenamiento seguro
├── components/  UI (layout, product, costs, results, common)
├── hooks/       Derivación de resultados
└── utils/       Formato, export/import y clases
```

La UI no calcula: `useProjectResult` deriva `calculateProject` con `useMemo` y el store solo guarda
datos de entrada.

## Calidad y accesibilidad

```bash
pnpm lint
pnpm test
pnpm coverage
pnpm build
```

- El ejemplo de referencia (100 unidades, costo 5, envío 80, venta 15, arancel 6 %, IVA 19 %,
  comisión 12 %, envío fijo 50) está cubierto por tests con los totales exactos.
- `src/a11y.test.tsx` ejecuta axe-core sobre la app vacía y con un proyecto cargado.
- Para auditar con Lighthouse (requiere Chrome/Chromium):

```bash
pnpm build
pnpm preview --port 4173
npx lighthouse http://localhost:4173/invest_calc/ --only-categories=accessibility --chrome-flags="--headless=new"
```

## Limitaciones

- Solo estima: no reemplaza asesoría contable ni tributaria.
- No convierte divisas en tiempo real: cada proyecto usa una moneda.
- No hay backend, login ni sincronización entre dispositivos.
- Los impuestos y comisiones cambian; revisa la fecha de verificación y la fuente oficial.

## Estado del proyecto

Fases 0–7 completas según `AGENTS.md`:

- 0 — Andamiaje (Vite, TS strict, Tailwind v4, Vitest, ESLint, Prettier).
- 1 — Dominio puro y tests (ejemplo de referencia, casos límite, cobertura ≥ 90 %).
- 2 — Presets de Chile y store con persistencia, migraciones y validación Zod.
- 3 — Layout, lista de proyectos y formulario de producto con `NumberInput` robusto.
- 4 — Costos editables, ordenables, presets y ayuda de bases de cálculo.
- 5 — Panel de resultados sticky, barra móvil y desglose.
- 6 — Export/import, borrado, toasts, accesibilidad (axe + Lighthouse 100), modo oscuro y README.
- 7 — Costos recuperables, comparador, sensibilidad, gráfico SVG y PWA.
