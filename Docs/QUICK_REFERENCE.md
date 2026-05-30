# 🚀 Referencia Rápida - Pulso Ciudadano

## Componentes Frontend - Ubicación y Propósito

| Componente | Ubicación | Propósito | Exporta |
|---|---|---|---|
| **Layout** | `components/Layout.tsx` | Sidebar + navegación | Outlet para pages |
| **AlertasPanel** | `components/AlertasPanel.tsx` | Muestra 5 alertas activas | Card clickeable |
| **GraficaTendencia** | `components/GraficaTendencia.tsx` | Distribución sentimientos (%) | AreaChart |
| **MapaCalor** | `components/MapaCalor.tsx` | Intensidad por colonia | Lista con barras |
| **RadarGeneral** | `components/RadarGeneral.tsx` | Donut por tema | Filtrable, clickeable |

## Hooks Custom - Uso

```typescript
// Autenticación
const { user, userData, loading, logout } = useAuth()

// Posts en rango de fechas
const { posts, loading } = usePosts(desde, hasta)

// Alertas activas
const { alertas, loading } = useAlertas()
```

## Rutas Disponibles

| Ruta | Componente | Acceso |
|---|---|---|
| `/login` | Login.tsx | Público |
| `/` | Dashboard.tsx | Privado |
| `/tema/:tema` | Tema.tsx | Privado |
| `/alertas` | Alertas.tsx | Privado |
| `/admin/usuarios` | Usuarios.tsx | Privado (admin) |
| `/admin/configuracion` | Configuracion.tsx | Privado (admin) |

## Enums Backend

```csharp
// Fuentes
TipoFuente: Twitter, Facebook, GoogleMaps, Instagram, TikTok

// Sentimientos
Sentimiento: Positivo, Negativo, Neutral, Mixto

// Urgencias
Urgencia: Baja, Media, Alta, Crítica

// Problemas
TiempoProblema: RecienteHoras, UltimosDias, SemanasPasadas, MesesAtras, Cronico

// Afectación
AfectacionEstimada: IndividuoAislado, FamiliaBarrio, MultiplesBarrios, MunicipiCompleto, InterMunicipal

// Interacción
TipoInteraccion: queja, sugerencia, felicitación, pregunta, crítica, propuesta

// Tono
Tono: neutral, desesperado, enojado, sarcástico, esperanzado, indiferente
```

## Configuración Backend (appsettings.json)

```json
{
  "Firebase": { "ProjectId": "xxx" },
  "AI": { 
    "Provider": "gemini",
    "ApiKey": "${AI_API_KEY}",
    "Model": "gemini-2.0-flash"
  },
  "Scraping": { 
    "IntervalSeconds": 3600,
    "LookbackMinutes": 60
  }
}
```

## Estructura Firestore

```
usuarios/{uid}/
  └─ email, municipioId, rol, activo

municipios/{municipioId}/
  ├─ posts/{postId}/
  │  └─ fuente, texto, fecha, clasificacion, ubicacion, contexto, resumen
  └─ alertas/{alertaId}/
     └─ tema, tipo_alerta, fecha_generacion, leida, resuelta
```

## Proveedores IA

| Proveedor | Config | Rate Limit | Modelo Recomendado |
|---|---|---|---|
| **Gemini** | `Provider: gemini` | 15 req/min | `gemini-2.0-flash` |
| **DeepSeek** | `Provider: deepseek` | 60 req/min | `deepseek-chat` |
| **OpenAI** | `Provider: openai` | 20 req/min (free) | `gpt-3.5-turbo` |

## Flujos Principales

### 1️⃣ Autenticación
```
Login → signInWithEmailAndPassword() → AuthContext → useAuth() ✅
```

### 2️⃣ Dashboard
```
Dashboard → usePosts() → Firestore → RadarGeneral/GraficaTendencia/MapaCalor
              ↓
         Click tema → navigate("/tema/:tema")
```

### 3️⃣ Scraping → Clasificación
```
ScrapingBackgroundService (cada 1h)
  ↓ Scraper() → PostRaw[]
  ↓ Deduplicación (StablePostId)
  ↓ PostChannel (enqueue)
  ↓ PostProcessorService (consume)
  ↓ IA (ClasificarAsync) 
  ↓ Firestore (SavePostAsync)
  ↓ Frontend real-time (onSnapshot)
```

## Colores Tailwind Clave

```css
Primario: indigo (indigo-600, indigo-500, etc.)
Negativo: rose (rose-500, rose-50, etc.)
Positivo: emerald (emerald-500, emerald-50, etc.)
Urgencia: orange/amber
Neutro: gray
```

## Componentes Externos

```typescript
import { Card, AreaChart, DonutChart } from '@tremor/react'
import { HomeIcon, BellAlertIcon, ... } from '@heroicons/react/24/outline'
import { Firebase, Firestore, Auth } from 'firebase/...'
```

## Background Services (.NET)

| Servicio | Responsabilidad | Intervalo |
|---|---|---|
| **ScrapingBackgroundService** | Ejecuta scrapers periódicamente | 1 hora (configurable) |
| **PostProcessorService** | Consume cola y clasifica con IA | Continuo |

## Error Handling

### Frontend
- PrivateRoute → Si no autenticado: redirige a `/login`
- usePosts/useAlertas → Si no municipioId: retorna empty array

### Backend
- Rate limit (429) → Esperar 60s + retry
- Parse error → Log error, continúa siguiente
- Timeout → Retry hasta 3 veces

## Performance Notes

- useMemo extensivo en Dashboard/Tema para evitar re-renders
- PostChannel (System.Threading.Channels) = sin locks
- Playwright pooling = reutilizar browser
- Firestore onSnapshot = real-time, no polling

## Variables de Entorno Requeridas

```bash
# Frontend (.env.local)
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID

# Backend (appsettings.json)
Firebase:ProjectId
AI:Provider
AI:ApiKey
Scraping:IntervalSeconds
```

## Comandos Útiles

```bash
# Frontend
npm install
npm run dev          # Dev server
npm run build        # Build producción

# Backend
dotnet restore
dotnet run
dotnet test
```

---

**Documentación Completa:** Ver `/Docs/INDEX.md`
