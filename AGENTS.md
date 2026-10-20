# AGENTS.md — Calculadora de Inversión para Tienda Online

> Instrucciones para el agente de IA que construirá este proyecto. Léelo completo antes de escribir código. Trabaja **por fases**, en orden, y no avances a la siguiente hasta cumplir los criterios de aceptación de la actual.

---

## 1. Qué es este proyecto

Una **Single Page Application 100% frontend** (sin backend, sin base de datos, sin login) que permite a un emprendedor estimar cuánto debe invertir y cuánto ganará al comprar un producto para revenderlo.

El usuario ingresa datos del producto (costo, cantidad, envío, precio de venta) y una lista de **costos adicionales**:

- **Costos constantes predefinidos** (impuestos, aranceles, comisiones): vienen con un porcentaje por defecto, pero el usuario puede **modificarlos o eliminarlos**.
- **Costos personalizados**: el usuario crea costos con título propio (ej. "Envío por volumen", "Embalaje", "Flete interno"), de tipo monto fijo o porcentaje.

Todo se guarda automáticamente en el navegador (`localStorage`). Sin cuentas, sin servidor.

### Fuera de alcance (no hacer)
- Backend, APIs externas, autenticación, analítica o tracking.
- Buscar productos o proveedores (es otro proyecto).
- Conversión de divisas en tiempo real (el usuario trabaja en una moneda por proyecto).

---

## 2. Stack técnico (decisiones cerradas, no cambiar sin avisar)

| Área | Elección |
|---|---|
| Build | **Vite** |
| UI | **React 18 + TypeScript (strict)** |
| Estilos | **Tailwind CSS** |
| Estado | **Zustand** con middleware `persist` |
| Validación | **Zod** (validar datos leídos de localStorage e importados) |
| Tests | **Vitest** + **React Testing Library** |
| Lint/format | ESLint + Prettier |
| Gestor de paquetes | npm |

Reglas:
- `strict: true` en `tsconfig`. Prohibido `any`.
- Sin librerías de UI pesadas. Componentes propios y simples.
- Interfaz y textos **en español**. Formato numérico con `Intl.NumberFormat`.
- Responsive (mobile first) y accesible (labels en inputs, foco visible, contraste suficiente, navegable por teclado).

---

## 3. Arquitectura

Separa estrictamente **lógica de negocio** (pura, testeable) de **UI**.

```
src/
├── main.tsx
├── App.tsx
├── domain/                  # Lógica de negocio PURA (sin React, sin DOM)
│   ├── types.ts             # Tipos e interfaces del dominio
│   ├── calculate.ts         # calculateProject(project) → ProjectResult
│   ├── calculate.test.ts
│   ├── schemas.ts           # Esquemas Zod (espejo de types.ts)
│   └── id.ts                # generador de ids (crypto.randomUUID)
├── config/
│   └── presets.ts           # Costos constantes por defecto (editable por país)
├── store/
│   ├── useProjectsStore.ts  # Zustand + persist
│   ├── migrations.ts        # Migraciones de versión del esquema guardado
│   └── store.test.ts
├── components/
│   ├── layout/              # Header, Sidebar de proyectos, Layout
│   ├── product/             # ProductForm (costo, cantidad, envío, precio venta)
│   ├── costs/               # CostList, CostRow, AddCostForm, PresetPicker
│   ├── results/             # ResultsPanel, ResultCard, BreakdownTable
│   └── common/              # NumberInput, Button, Modal, Toast
├── hooks/
│   └── useProjectResult.ts  # useMemo(calculateProject) para el proyecto activo
├── utils/
│   ├── format.ts            # formatMoney, formatPercent
│   └── exportImport.ts      # exportar/importar JSON
└── styles/
```

Principios:
1. `domain/` **no importa** nada de React ni de `store/`.
2. Los componentes **no calculan**: llaman a `calculateProject` (vía hook) y solo muestran.
3. El store guarda **datos de entrada**, nunca resultados calculados (los resultados se derivan siempre).
4. Cada acción del store es pequeña y tiene test.

---

## 4. Modelo de datos (`domain/types.ts`)

```ts
export type CostKind = 'percent' | 'fixed';

/** Sobre qué valor se aplica un costo de tipo 'percent' */
export type CostBase =
  | 'product'      // costo total de los productos (costo unitario × cantidad)
  | 'cif'          // producto + envío (base típica de aranceles/impuestos de importación)
  | 'accumulated'  // cif + suma de los costos ANTERIORES de la lista (cascada, ej. IVA sobre CIF + arancel)
  | 'revenue';     // ingresos por ventas (ej. comisión de la plataforma)

/** Cómo se interpreta un costo de tipo 'fixed' */
export type FixedMode = 'total' | 'perUnit';

export interface CostItem {
  id: string;
  title: string;            // "IVA", "Envío por volumen", etc.
  kind: CostKind;
  value: number;            // porcentaje (19 = 19%) o monto
  base: CostBase;           // solo relevante si kind === 'percent'
  fixedMode: FixedMode;     // solo relevante si kind === 'fixed'
  enabled: boolean;         // permite desactivar sin borrar
  presetId?: string;        // si viene de un preset (permite "restablecer valor por defecto")
  recoverable?: boolean;    // opcional: ej. IVA crédito fiscal (ver sección 8, fase 7)
}

export type ShippingMode = 'total' | 'perUnit';

export interface Project {
  id: string;
  name: string;                 // nombre del producto/escenario
  currency: string;             // código ISO, ej. 'USD', 'CLP', 'ARS'
  quantity: number;             // unidades a comprar (entero ≥ 1)
  unitCost: number;             // costo de compra por unidad
  shippingMode: ShippingMode;   // envío internacional/principal
  shippingValue: number;
  unitSalePrice: number;        // precio de venta final por unidad
  costs: CostItem[];            // lista ORDENADA (el orden importa para 'accumulated')
  createdAt: string;            // ISO
  updatedAt: string;            // ISO
}

export interface CostBreakdownLine {
  costId: string;
  title: string;
  amount: number;
  base: CostBase | null;        // null si es fijo
  isUpfront: boolean;           // true = se paga antes de vender (parte de la inversión)
}

export interface ProjectResult {
  productCostTotal: number;
  shippingTotal: number;
  cif: number;                          // productCostTotal + shippingTotal
  breakdown: CostBreakdownLine[];
  upfrontCostsTotal: number;            // suma de costos NO basados en revenue
  salesCostsTotal: number;              // suma de costos basados en revenue
  totalInvestment: number;              // cif + upfrontCostsTotal  (lo que hay que desembolsar)
  revenue: number;                      // unitSalePrice × quantity
  totalCosts: number;                   // totalInvestment + salesCostsTotal
  netProfit: number;                    // revenue − totalCosts
  marginPct: number | null;             // netProfit / revenue × 100 (null si revenue = 0)
  roiPct: number | null;                // netProfit / totalInvestment × 100 (null si inversión = 0)
  landedUnitCost: number;               // totalInvestment / quantity
  profitPerUnit: number;                // netProfit / quantity
  breakEvenUnitPrice: number | null;    // precio mínimo por unidad para no perder (null si imposible)
}

export interface PersistedState {
  version: number;
  projects: Project[];
  activeProjectId: string | null;
}
```

---

## 5. Lógica de negocio (`domain/calculate.ts`)

Función pura: `calculateProject(project: Project): ProjectResult`. **Nunca** lanza excepciones por datos raros: normaliza (`NaN`/negativos → 0, cantidad mínima 1).

### 5.1 Orden de cálculo

1. `productCostTotal = unitCost × quantity`
2. `shippingTotal = shippingMode === 'total' ? shippingValue : shippingValue × quantity`
3. `cif = productCostTotal + shippingTotal`
4. `revenue = unitSalePrice × quantity`
5. Recorrer `costs` **en orden**, ignorando los `enabled === false`. Para cada costo:
   - Si `kind === 'fixed'`: `amount = fixedMode === 'total' ? value : value × quantity`
   - Si `kind === 'percent'`: `amount = (value / 100) × baseValue`, donde:
     - `product` → `productCostTotal`
     - `cif` → `cif`
     - `revenue` → `revenue`
     - `accumulated` → `cif + suma de amounts de costos anteriores que NO sean base 'revenue'`
   - `isUpfront = !(kind === 'percent' && base === 'revenue')`
6. `upfrontCostsTotal` = suma de amounts con `isUpfront`; `salesCostsTotal` = el resto.
7. `totalInvestment = cif + upfrontCostsTotal`
8. `totalCosts = totalInvestment + salesCostsTotal`
9. `netProfit = revenue − totalCosts`
10. `marginPct = revenue > 0 ? netProfit / revenue × 100 : null`
11. `roiPct = totalInvestment > 0 ? netProfit / totalInvestment × 100 : null`
12. `landedUnitCost = totalInvestment / quantity`; `profitPerUnit = netProfit / quantity`

### 5.2 Punto de equilibrio (`breakEvenUnitPrice`)

Sea:
- `N` = `totalInvestment`
- `r` = suma de `value/100` de costos `percent` con base `revenue` (habilitados)
- `F` = suma de costos `fixed` en base de ventas, si existieran (en esta versión es 0, mantener el término por extensibilidad)

Beneficio = `P × q × (1 − r) − F − N` → equilibrio en `P = (N + F) / (q × (1 − r))`.
Si `r >= 1` → devolver `null`.

### 5.3 Reglas de redondeo
- **No redondear** en pasos intermedios. Redondear solo al mostrar (`utils/format.ts`).
- Los tests numéricos usan `toBeCloseTo(valor, 2)`.

### 5.4 Ejemplo de referencia (debe ser un test)

Datos: `quantity=100`, `unitCost=5`, envío `total=80`, `unitSalePrice=15`, costos:
1. "Arancel" percent 6% base `cif`
2. "IVA" percent 19% base `accumulated`
3. "Comisión plataforma" percent 12% base `revenue`
4. "Envío por volumen" fixed 50 `total`

Resultado esperado:
- `productCostTotal=500`, `shippingTotal=80`, `cif=580`
- Arancel = 34.8 → IVA = 19% × (580 + 34.8) = 116.812
- Envío por volumen = 50
- `upfrontCostsTotal = 34.8 + 116.812 + 50 = 201.612`
- `totalInvestment = 781.612`
- `revenue = 1500`, comisión = 180 → `salesCostsTotal = 180`
- `totalCosts = 961.612` → `netProfit = 538.388`
- `marginPct ≈ 35.89`, `roiPct ≈ 68.88`

---

## 6. Costos constantes por defecto (`config/presets.ts`)

Los impuestos y comisiones **dependen del país y cambian con el tiempo**. Por eso viven en un archivo de configuración separado, no dentro de la lógica.

```ts
export interface CostPreset {
  presetId: string;
  title: string;
  kind: CostKind;
  defaultValue: number;
  base: CostBase;
  fixedMode: FixedMode;
  description?: string;     // texto de ayuda mostrado en la UI
  sourceNote?: string;      // dónde verificar el valor oficial
}

export interface CountryProfile {
  code: string;             // 'CL', 'AR', 'MX', ...
  name: string;
  currency: string;
  presets: CostPreset[];
  lastVerified: string;     // fecha 'YYYY-MM-DD' en que se verificaron los valores
}
```

**Reglas para el agente:**
- ⚠️ **No inventes porcentajes.** Antes de llenar `presets.ts`, **pregunta al usuario su país**, busca los valores vigentes en la fuente oficial (administración tributaria / aduana) y registra la fuente en `sourceNote` y la fecha en `lastVerified`. Si no puedes verificar un valor, déjalo en `0` con un `// TODO: verificar` y avísalo.
- Perfil inicial a implementar según el país del usuario, con presets típicos: impuesto al valor agregado, arancel/derecho de importación, y comisión de plataforma (editable, ej. Mercado Libre/Amazon). El usuario debe poder modificar cualquiera.
- Incluir un perfil `GENERIC` con todos los valores en `0` como plantilla.
- La UI muestra "Valores verificados el {lastVerified}. Confírmalos con la fuente oficial".

### Comportamiento en la UI
- Al crear un proyecto, se precargan los presets del país seleccionado como `CostItem` con `presetId`.
- Cada costo con `presetId`: editable (valor, base), **eliminable**, desactivable, y con botón **"Restablecer valor por defecto"** (visible solo si difiere del preset).
- Un `PresetPicker` permite **volver a agregar** presets que se eliminaron.
- Cada costo sin `presetId` es "personalizado": título libre, tipo (fijo/porcentaje), base o modo fijo, editable y eliminable.
- El orden de los costos se puede cambiar (botones subir/bajar; drag & drop opcional) porque afecta la base `accumulated`.

---

## 7. Persistencia local

- Clave de `localStorage`: `invest-calc:v1`.
- Usar `zustand/middleware` `persist` con `version` numérico y `migrate` (en `store/migrations.ts`).
- Al hidratar, **validar con Zod**. Si falla: no romper la app; mostrar aviso, guardar copia del dato corrupto en `invest-calc:backup` y arrancar con estado vacío.
- Guardado automático en cada cambio (con debounce de ~300 ms si afecta al rendimiento).
- **Exportar** proyectos a un archivo `.json` e **importar** (validando con Zod, preguntando si reemplazar o fusionar).
- Botón "Borrar todos los datos" con confirmación.
- Envolver acceso a `localStorage` en `try/catch` (modo privado o cuota llena) y mostrar un aviso si no se puede guardar.

---

## 8. Plan de trabajo por fases

Para cada fase: implementa, escribe tests, ejecuta `npm run lint && npm run test && npm run build`, y solo entonces continúa. Haz un commit por fase con mensaje claro.

### Fase 0 — Andamiaje
- Crear proyecto con Vite (React + TS), instalar Tailwind, Zustand, Zod, Vitest, RTL, ESLint, Prettier.
- Scripts: `dev`, `build`, `test`, `lint`, `format`.
- **Aceptación:** `npm run dev` abre una página en blanco con título; `npm run test` corre un test de ejemplo.

### Fase 1 — Dominio puro
- Implementar `types.ts`, `schemas.ts` y `calculate.ts` según las secciones 4 y 5.
- Tests: el ejemplo de referencia (5.4), cantidad 0/negativa, `NaN`, costos deshabilitados, orden de `accumulated`, `revenue = 0`, `r >= 1` en equilibrio, envío `perUnit` vs `total`, costo fijo `perUnit`.
- **Aceptación:** cobertura de `domain/` ≥ 90 % y todos los tests en verde.

### Fase 2 — Presets y store
- Implementar `config/presets.ts` (preguntar país, ver sección 6) y `useProjectsStore` con acciones:
  `createProject`, `duplicateProject`, `deleteProject`, `renameProject`, `setActiveProject`, `updateProduct`, `addCost`, `updateCost`, `removeCost`, `toggleCost`, `moveCost`, `resetCostToPreset`, `addPresetCost`.
- Persistencia + migraciones + validación Zod.
- **Aceptación:** tests del store en verde; recargar la página (test con `localStorage` simulado) conserva los datos.

### Fase 3 — UI de entrada
- `Layout` con lista de proyectos (crear, duplicar, eliminar, renombrar).
- `ProductForm`: nombre, moneda, cantidad, costo unitario, envío (selector total/por unidad), precio de venta.
- `NumberInput` robusto: acepta coma o punto decimal, no permite negativos, no pierde el foco al escribir, muestra vacío en vez de `0` forzado.
- **Aceptación:** se puede crear un proyecto y editar sus datos; persiste al recargar.

### Fase 4 — UI de costos
- `CostList`, `CostRow` (editar título, valor, tipo, base/modo, activar/desactivar, eliminar, subir/bajar, restablecer).
- `AddCostForm` para costos personalizados y `PresetPicker` para reagregar presets.
- Textos de ayuda breves explicando cada "base" (ej. "CIF = producto + envío").
- **Aceptación:** se pueden modificar y eliminar los costos por defecto, y crear costos con título propio. El orden se puede cambiar.

### Fase 5 — Resultados
- `ResultsPanel` sticky (en móvil, barra inferior colapsable) con: **Inversión total**, **Ingresos**, **Ganancia neta**, **Margen %**, **ROI %**, **Costo unitario puesto en bodega**, **Precio de equilibrio**.
- `BreakdownTable`: desglose línea por línea, separando "Antes de vender (inversión)" y "Al vender (comisiones)".
- Ganancia/margen negativos en rojo con icono (no depender solo del color).
- **Aceptación:** los resultados coinciden con el ejemplo 5.4 y se actualizan al instante al cambiar cualquier dato.

### Fase 6 — Datos y pulido
- Exportar/importar JSON, borrar todo, manejo de errores de almacenamiento.
- Estados vacíos amigables (sin proyectos, sin costos).
- Accesibilidad: revisar labels, foco, `aria-live` en resultados, navegación por teclado.
- Modo oscuro opcional vía `prefers-color-scheme`.
- **Aceptación:** pasar auditoría Lighthouse de Accesibilidad ≥ 90.

### Fase 7 — Extras (solo si el usuario los pide)
- **Costos recuperables:** marcar IVA como `recoverable` y mostrar "inversión de caja" vs "costo real".
- **Comparador de escenarios:** misma ficha con distintas cantidades (ej. 50/100/500 unidades) para ver cómo cambian envío y margen.
- **Análisis de sensibilidad:** tabla de ganancia según precio de venta.
- **Gráficos** simples de composición de costos (SVG propio, sin librerías pesadas).
- **PWA / uso offline.**

---

## 9. Convenciones de código

- Componentes funcionales con hooks; un componente por archivo; nombres en `PascalCase`.
- Tipos del dominio en inglés (código), textos de UI en español.
- Sin lógica de negocio dentro de componentes ni de `useEffect`.
- Funciones puras con nombres descriptivos; archivos < 250 líneas (dividir si crecen).
- Sin estilos en línea; usar clases de Tailwind.
- Commits en formato convencional: `feat:`, `fix:`, `test:`, `refactor:`, `docs:`.

## 10. Casos límite que SIEMPRE deben manejarse

- Cantidad vacía, 0 o decimal → tratar como entero mínimo 1 en el cálculo.
- Campos numéricos vacíos o con texto → 0, sin romper la UI.
- Porcentajes > 100 (permitidos pero con aviso), o negativos (bloquear).
- Lista de costos vacía.
- Todos los costos desactivados.
- `localStorage` no disponible, corrupto o de una versión anterior.
- Números muy grandes (formatear sin notación científica).
- Dos costos con el mismo título (permitido; el `id` los distingue).

## 11. Definición de "terminado"

- [ ] Todas las fases 0–6 completas y con sus criterios de aceptación cumplidos.
- [ ] `npm run lint`, `npm run test` y `npm run build` pasan sin errores ni warnings.
- [ ] El ejemplo de referencia (5.4) está cubierto por un test.
- [ ] Los datos sobreviven a recargar la página y a una actualización de versión del esquema.
- [ ] `presets.ts` tiene valores verificados con fuente y fecha, o marcados con `TODO` y reportados al usuario.
- [ ] `README.md` con instrucciones de instalación, uso, y cómo actualizar los presets.

## 12. Cómo debe comportarse el agente

- Trabaja **una fase a la vez** y resume al final de cada una qué hizo y qué sigue.
- Si algo es ambiguo (en especial países, impuestos o fórmulas), **pregunta antes de asumir**.
- No agregues dependencias ni funcionalidades fuera de este documento sin consultar.
- Si encuentras un error en las fórmulas de este documento, repórtalo y propón la corrección en lugar de ignorarlo.
- Nunca presentes impuestos como definitivos: la app es una **estimación**, y la UI debe incluir un aviso de que no reemplaza asesoría contable ni tributaria.
