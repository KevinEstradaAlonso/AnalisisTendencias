# Documentación de Componentes - Frontend Pulso Ciudadano

## Descripción General
El frontend es una aplicación React/TypeScript construida con Vite que proporciona un dashboard de monitoreo de opinión pública en redes sociales. Utiliza Tailwind CSS para estilos, Tremor para gráficos, Heroicons para iconos y Firebase para autenticación y datos.

---

## ESTRUCTURA DE CARPETAS

```
dashboard/
├── src/
│   ├── components/      # Componentes reutilizables (UI y visualización)
│   ├── contexts/        # Contextos de React (AuthContext)
│   ├── hooks/           # Hooks personalizados (useAuth, useFirestore)
│   ├── lib/             # Utilidades (configuración de Firebase)
│   ├── pages/           # Páginas/vistas principales
│   ├── App.tsx          # Router principal
│   └── main.tsx         # Punto de entrada
└── public/              # Archivos estáticos
```

---

## CONTEXTOS

### AuthContext.tsx
**Ubicación:** `src/contexts/AuthContext.tsx`

**Propósito:** Gestiona el estado de autenticación y datos del usuario en toda la aplicación.

**Características:**
- Mantiene el estado de usuario logueado (Firebase User)
- Carga datos del usuario desde Firestore (municipioId, rol, email, etc.)
- Proporciona función de logout
- Integra con Firebase Auth

**Tipos exportados:**
```typescript
type UserRole = 'super_admin' | 'admin' | 'viewer'

interface UserData {
  uid: string
  email: string
  municipioId: string
  rol: UserRole
  activo: boolean
}
```

**Context Value:**
```typescript
{
  user: User | null          // Usuario de Firebase
  userData: UserData | null  // Datos adicionales del usuario
  loading: boolean           // Estado de carga inicial
  logout: () => Promise<void>
}
```

---

## HOOKS PERSONALIZADOS

### useAuth.ts
**Ubicación:** `src/hooks/useAuth.ts`

**Propósito:** Hook simple para acceder al contexto de autenticación.

**Uso:**
```typescript
const { user, userData, loading, logout } = useAuth()
```

**Retorna:** El contexto de AuthContext


### useFirestore.ts
**Ubicación:** `src/hooks/useFirestore.ts`

**Propósito:** Hook para obtener datos en tiempo real de Firestore.

**Funciones principales:**

#### `usePosts(desde: Date, hasta: Date)`
- Obtiene posts dentro de un rango de fechas
- Filtra automáticamente por municipioId del usuario
- Se suscribe a cambios en tiempo real
- Retorna: `{ posts: Post[], loading: boolean }`

**Interfaz Post:**
```typescript
interface Post {
  id: string
  fuente: string                    // Twitter, Facebook, etc.
  urlOrigen: string
  texto: string
  fecha: Date
  clasificacion: {
    temas: string[]                 // Temas detectados
    temaPrincipal: string           // Tema principal
    sentimiento: 'negativo' | 'positivo' | 'neutral'
    urgencia: 'alta' | 'media' | 'baja'
    tipoInteraccion: 'queja' | 'sugerencia' | 'felicitación'
    tono: 'neutral' | 'desesperado' | 'enojado' | 'sarcástico'
    confianza: number               // 0-1
    keywordsDetectadas: string[]
  }
  ubicacion: {
    colonia: string | null
    calle: string | null
    referencia: string | null
    precision: 'no_detectada' | 'colonia' | 'calle' | 'exacta'
  }
  contexto: {
    tiempoProblema: string          // Cuándo empezó el problema
    afectacionEstimada: string      // Cuántas personas afectadas
    solicitaAccion: boolean
    mencionaAutoridad: string[]
    evidenciaMencionada: boolean
  }
  resumen: string
}
```

#### `useAlertas()`
- Obtiene alertas activas (no resueltas) del municipio
- Se suscribe a cambios en tiempo real
- Retorna: `{ alertas: Alerta[], loading: boolean }`

**Interfaz Alerta:**
```typescript
interface Alerta {
  id: string
  tema: string
  colonia: string | null
  fechaGeneracion: Date
  tipoAlerta: string              // 'riesgo_viral' | 'problema_cronico' | 'umbral_superado'
  descripcion: string
  totalPosts: number
  leida: boolean
  resuelta: boolean
}
```

---

## COMPONENTES UI

### Layout.tsx
**Ubicación:** `src/components/Layout.tsx`

**Propósito:** Componente contenedor principal que proporciona navegación, sidebar y estructura de la aplicación.

**Características:**
- Sidebar responsivo (glass-morphism design)
- Navegación dinámica basada en rol del usuario
- Menú admin visible solo para usuarios con rol admin/super_admin
- Responsive: desktop y mobile
- Cierra sidebar automáticamente en móvil al navegar
- Función de logout

**Navegación:**
- Dashboard (home)
- Alertas
- Admin > Usuarios (solo admin)
- Admin > Configuración (solo admin)

**Props:** Ninguno (usa hooks de contexto)

**Outlet:** Renderiza las páginas anidadas mediante React Router


### AlertasPanel.tsx
**Ubicación:** `src/components/AlertasPanel.tsx`

**Propósito:** Panel que muestra las 5 alertas activas más recientes de forma visual.

**Características:**
- Muestra hasta 5 alertas con iconos diferenciados por tipo
- Códigos de color: rojo (riesgo viral), ámbar (problema crónico), naranja (umbral superado)
- Clickeable: permite ver detalles de cada alerta
- Estado de lectura: muestra visualmente si fue leída
- Mensaje vacío personalizado cuando no hay alertas

**Props:**
```typescript
interface Props {
  alertas: Alerta[]
  onAlertaClick: (alerta: Alerta) => void
}
```

**Diseño:** Card con efecto glass-morphism, íconos de Heroicons


### GraficaTendencia.tsx
**Ubicación:** `src/components/GraficaTendencia.tsx`

**Propósito:** Gráfico de área mostrando distribución de sentimientos (%) en el tiempo.

**Características:**
- Gráfico de área suave (curveType="monotone")
- Muestra **porcentajes** en lugar de números absolutos (0-100%)
- Tres categorías: negativos (rojo), neutrales (gris), positivos (verde)
- La suma de los tres porcentajes = ~100% por día
- Leyenda interactiva
- Animación al cargar
- Se ve bien incluso con pocos posts

**Props:**
```typescript
interface Props {
  tema: string
  data: TendenciaData[]  // Array con porcentajes por día
}
```

**Datos esperados:**
```typescript
interface TendenciaData {
  fecha: string           // Formato: "01 ene", "02 ene", etc.
  pctNegativos: number    // 0-100
  pctNeutrales: number    // 0-100
  pctPositivos: number    // 0-100
}
```


### MapaCalor.tsx
**Ubicación:** `src/components/MapaCalor.tsx`

**Propósito:** Visualización de intensidad de menciones por ubicación geográfica (colonias).

**Características:**
- Muestra top 10 colonias ordenadas por volumen
- Intensidad de color basada en porcentaje del máximo (rojo fuerte = alto)
- Barra de progreso visual con gradiente
- Muestra contador de sentimientos negativos y urgencias altas
- Tooltip al pasar mouse

**Props:**
```typescript
interface Props {
  data: UbicacionData[]  // Array de { colonia, total, negativos, urgenciaAlta }
}
```

**Datos esperados:**
```typescript
interface UbicacionData {
  colonia: string
  total: number
  negativos: number
  urgenciaAlta: number
}
```

**Colores:** 
- Rojo intenso (>70%)
- Ámbar (40-70%)
- Gris claro (<40%)


### RadarGeneral.tsx
**Ubicación:** `src/components/RadarGeneral.tsx`

**Propósito:** Gráfico tipo "radar" (donut) que muestra distribución de menciones por tema.

**Características:**
- Gráfico tipo donut usando Tremor
- Filtrable: permite ocultar/mostrar temas
- Selector de rango de fechas (Hoy/Ayer/Antier)
- Excluye automáticamente tema "Otros" por defecto
- Limita visualización a 12 temas
- Panel expandible con todos los temas (>12)
- Click en tema para ir a página detallada

**Props:**
```typescript
interface Props {
  data: RadarData[]                           // Array de temas con métricas
  onTemaClick: (tema: string) => void
  selectedDay: 0 | 1 | 2                      // 0=Hoy, 1=Ayer, 2=Antier
  onSelectedDayChange: (day: 0 | 1 | 2) => void
  selectedDayLabel: string                    // Texto para mostrar
  loading?: boolean
}
```

**Datos esperados:**
```typescript
interface RadarData {
  tema: string
  total: number
  negativos: number
  positivos: number
  neutrales: number
}
```

**Colores:** 8 colores predefinidos rotados por tema (azul, teal, púrpura, etc.)

---

## PÁGINAS

### App.tsx
**Ubicación:** `src/App.tsx`

**Propósito:** Componente raíz que configura el router de la aplicación.

**Estructura de rutas:**
```
/login                      → Login (público)
/                           → Dashboard (privado)
  /tema/:tema              → Detalle de tema
  /alertas                 → Listado de alertas
  /admin/usuarios          → Gestión de usuarios
  /admin/configuracion     → Configuración
```

**Componente PrivateRoute:** HOC que verifica autenticación antes de renderizar contenido.


### Login.tsx
**Ubicación:** `src/pages/Login.tsx`

**Propósito:** Página de autenticación.

**Características:**
- Formulario de email/contraseña
- Integración con Firebase Auth
- Validación de credenciales
- Mensaje de error personalizado
- Loading spinner durante autenticación
- Redirecciona a / después de login exitoso
- Diseño glass-morphism con gradientes

**Campos:** email, contraseña


### Dashboard.tsx
**Ubicación:** `src/pages/Dashboard.tsx`

**Propósito:** Página principal del dashboard con métricas y visualizaciones.

**Características:**
- Métricas del día (total posts, negativos, urgentes, riesgo viral)
- Gráfico de tendencia de sentimiento (7 o 30 días)
- Radar de temas (hoy/ayer/antier)
- Panel de alertas activas
- Mapa de calor de ubicaciones
- Todo actualiza en tiempo real vía Firestore

**Estados:**
- Selector de rango de días (7/30)
- Selector de día para radar (0/1/2)

**Flujos:**
- Click en tema en Radar → Navega a /tema/:tema
- Click en alerta → Muestra detalles/abre modal


### Alertas.tsx
**Ubicación:** `src/pages/Alertas.tsx`

**Propósito:** Página con listado completo de todas las alertas.

**Características:**
- Tabla con todas las alertas activas
- Columnas: Tipo, Fecha, Tema, Ubicación, Descripción, Estado, Acciones
- Botones para marcar como leída/resuelta
- Expandible para ver detalles completos
- Badges de color por tipo de alerta

**Acciones:**
- Marcar como leída
- Resolver alerta (la oculta)
- Ver detalles


### Tema.tsx
**Ubicación:** `src/pages/Tema.tsx`

**Propósito:** Página de detalle de un tema específico.

**Características:**
- Recibe tema como parámetro URL (/tema/:tema)
- Muestra gráfico de tendencia para ese tema (últimos 7 días)
- Muestra mapa de calor de ubicaciones para ese tema
- Lista todos los posts relacionados con ese tema
- Cada post expandible para ver detalles completos
- Filtros por sentimiento, urgencia, fuente

**Datos mostrados por post:**
- Fuente (Twitter, Facebook, etc.)
- Texto
- Sentimiento, urgencia, tono
- Ubicación
- Contexto
- Keywords detectadas

**Botón:** Atrás para volver al dashboard


### Admin Pages
**Ubicación:** `src/pages/admin/`

#### Usuarios.tsx
- Gestión de usuarios del municipio
- Crear, editar, eliminar usuarios
- Asignar roles (admin, viewer)

#### Configuracion.tsx
- Configuración de alertas
- Umbrales de activación
- Preferencias de notificaciones

---

## LIBRERÍAS Y UTILIDADES

### firebase.ts
**Ubicación:** `src/lib/firebase.ts`

**Propósito:** Configuración e inicialización de Firebase.

**Exporta:**
- `db`: Instancia de Firestore
- `auth`: Instancia de Firebase Auth

**Configuración:** Lee variables de entorno desde `.env.local`

---

## FLUJOS PRINCIPALES

### 1. Autenticación
```
Login.tsx
  ↓ (signInWithEmailAndPassword)
Firebase Auth
  ↓ (authStateChanged)
AuthContext
  ↓ (carga datos desde Firestore)
useAuth() disponible en toda la app
  ↓ (PrivateRoute valida)
Dashboard.tsx (protegido)
```

### 2. Obtención de Datos
```
Dashboard.tsx / Tema.tsx
  ↓ (usa usePosts / useAlertas)
Hook personalizado
  ↓ (query a Firestore)
onSnapshot (listener real-time)
  ↓ (actualiza estado)
Componente se re-renderiza
```

### 3. Navegación de Temas
```
Dashboard.tsx (RadarGeneral)
  ↓ (click en tema)
onTemaClick
  ↓ (navigate('/tema/:tema'))
Tema.tsx
  ↓ (usePosts filtra por tema)
Muestra gráficos y posts del tema
```

---

## CONVENCIONES DE DISEÑO

### Paleta de Colores
- **Primario:** Índigo/Púrpura (gradientes)
- **Sentimiento Negativo:** Rojo/Rosa
- **Sentimiento Positivo:** Verde/Esmeralda
- **Neutro/Normal:** Gris
- **Urgencia:** Naranja/Ámbar
- **Info:** Azul

### Tipografía
- **Headings:** Font-light (thin)
- **Body:** Font-light/normal
- **Small text:** Font-light

### Efectos
- **Glass-morphism:** Backdrop blur con bordes suaves
- **Smooth transitions:** 200-300ms
- **Animaciones:** Fade-in al cargar

### Responsiveness
- **Desktop:** Sidebar fijo, navegación horizontal
- **Mobile:** Sidebar colapsable, navegación en hamburguesa
- **Breakpoint:** 1024px (lg)

---

## VARIABLES DE ENTORNO REQUERIDAS

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

---

## DEPENDENCIAS PRINCIPALES

- **React 18** - Framework
- **React Router v6** - Routing
- **Firebase 9+** - Auth & Firestore
- **Tremor** - Gráficos (AreaChart, DonutChart)
- **Heroicons** - Iconos
- **Tailwind CSS** - Estilos
- **Vite** - Build tool

---

## NOTAS DE DESARROLLO

1. **Real-time Updates:** Todos los hooks (usePosts, useAlertas) usan `onSnapshot` para actualizaciones en tiempo real.

2. **Memoria:** Se usa `useMemo` extensivamente para evitar re-renders innecesarios y cálculos repetidos.

3. **Filtrado:** El filtrado por municipioId ocurre en el hook, no en el componente.

4. **Timestamps:** Las fechas se convierten automáticamente de Timestamp de Firestore a Date de JavaScript.

5. **Roles:** El acceso a admin se valida en Layout.tsx comparando el rol del usuario.

---

## ESTRUCTURA DE DATOS EN FIRESTORE

```
usuarios/
  {uid}/
    email: string
    municipioId: string
    rol: 'super_admin' | 'admin' | 'viewer'
    activo: boolean

municipios/
  {municipioId}/
    posts/
      {postId}/
        - fuente, texto, fecha, clasificacion, ubicacion, contexto, resumen, etc.
    
    alertas/
      {alertaId}/
        - tema, colonia, fechaGeneracion, tipoAlerta, descripcion, leida, resuelta
```
