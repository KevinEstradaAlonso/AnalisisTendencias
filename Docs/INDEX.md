# 📚 Guía de Documentación - Pulso Ciudadano

## Descripción General del Proyecto

**Pulso Ciudadano** es una plataforma de monitoreo de opinión pública que:
- Extrae posts de redes sociales (Twitter, Facebook, Google Maps)
- Clasifica automáticamente con IA (Gemini, DeepSeek, OpenAI)
- Genera alertas por temas críticos
- Visualiza tendencias en un dashboard interactivo

---

## 📋 Documentación Disponible

### 1. **Frontend Components** - [Frontend_Components.md](./Frontend_Components.md)
**Para:** Desarrolladores frontend, diseñadores, QA

**Incluye:**
- ✅ Descripción de cada componente React
- ✅ Props e interfaces de datos
- ✅ Flujos de navegación
- ✅ Hooks personalizados (useAuth, useFirestore)
- ✅ Contextos (AuthContext)
- ✅ Estructuras de datos (Post, Alerta, Usuario)
- ✅ Paleta de colores y convenciones de diseño
- ✅ Variables de entorno requeridas

**Componentes documentados:**
- **Contextos:** AuthContext
- **Hooks:** useAuth, useFirestore
- **Componentes:** Layout, AlertasPanel, GraficaTendencia, MapaCalor, RadarGeneral
- **Páginas:** Login, Dashboard, Alertas, Tema, Admin (Usuarios/Configuración)
- **Rutas:** `/login`, `/`, `/tema/:tema`, `/alertas`, `/admin/usuarios`, `/admin/configuracion`

---

### 2. **Backend Architecture** - [Backend_Architecture.md](./Backend_Architecture.md)
**Para:** Desarrolladores backend, DevOps, arquitectos

**Incluye:**
- ✅ Estructura de proyectos .NET
- ✅ Domain Layer (modelos, interfaces, enums)
- ✅ Infrastructure Layer (Firebase, AI, Scraping)
- ✅ Worker Layer (background services)
- ✅ Flujo completo de scraping → clasificación → almacenamiento
- ✅ Configuración de proveedores IA
- ✅ Scrapers para cada red social
- ✅ Estructura de datos en Firestore
- ✅ Rate limits y manejo de errores
- ✅ Performance y monitoreo

**Servicios documentados:**
- **ScrapingBackgroundService** - Extrae posts periódicamente
- **PostProcessorService** - Clasifica posts con IA
- **FirestoreRepository** - CRUD en Firestore
- **AIProviderFactory** - Selecciona proveedor IA
- **Scrapers** - FacebookScraper, TwitterScraper, GoogleMapsScraper

---

### 3. **Contexto Inicial** - [ContextoInicial.md](./ContextoInicial.md)
**Para:** Todos

**Incluye:**
- Descripción del problema a resolver
- Objetivos del proyecto
- Requisitos funcionales
- Stack tecnológico

---

## 🎯 Guía Rápida por Rol

### 👨‍💻 Desarrollador Frontend
1. Lee: [Frontend_Components.md](./Frontend_Components.md)
   - Entiende estructura de componentes
   - Memoriza ubicación de hooks y contextos
   - Aprende paleta de colores y convenciones

2. Trabaja en:
   - `dashboard/src/components/` - Componentes reutilizables
   - `dashboard/src/pages/` - Páginas principales
   - `dashboard/src/hooks/` - Lógica compartida

3. Variables de entorno (.env.local):
   ```env
   VITE_FIREBASE_API_KEY=xxx
   VITE_FIREBASE_PROJECT_ID=xxx
   # ... ver Backend_Architecture.md para lista completa
   ```

### 🔧 Desarrollador Backend
1. Lee: [Backend_Architecture.md](./Backend_Architecture.md)
   - Entiende flujo: Scraping → Clasificación → Almacenamiento
   - Memoriza interfaces de IScraperService, IAIProvider
   - Aprende estructura de datos en Firestore

2. Trabaja en:
   - `backend/src/PulsoCiudadano.Domain/` - Modelos
   - `backend/src/PulsoCiudadano.Infrastructure/` - Firebase, IA, Scraping
   - `backend/src/PulsoCiudadano.Worker/` - Background services

3. Configuración (appsettings.json):
   ```json
   {
     "Firebase": { "ProjectId": "..." },
     "AI": { "Provider": "gemini", "ApiKey": "..." },
     "Scraping": { "IntervalSeconds": 3600 }
   }
   ```

### 🏛️ Arquitecto / Tech Lead
1. Lee: Ambos documentos completos
2. Revisa: Flujo completo de datos en Backend_Architecture.md (sección "FLUJO COMPLETO")
3. Considera: Próximas mejoras en sección de mejoras

### 🧪 QA / Tester
1. Lee: [Frontend_Components.md](./Frontend_Components.md) (sección "FLUJOS PRINCIPALES")
2. Casos de test:
   - Autenticación → Dashboard
   - Click en tema → Página detallada
   - Alertas: marcar leída/resuelta
   - Responsiveness: mobile vs desktop

### 📊 DevOps / SRE
1. Lee: [Backend_Architecture.md](./Backend_Architecture.md)
   - Configuración de Firebase
   - Índices Firestore recomendados
   - Variables de entorno
   - Rate limits de APIs
2. Monitoreo: Metricas clave en sección "PERFORMANCE"

---

## 🔄 Flujos Principales Resumidos

### Flujo de Autenticación
```
Usuario → Login → Firebase Auth → Cargar datos usuario → Dashboard
```

### Flujo de Scraping y Clasificación
```
ScrapingBackgroundService (cada 1h)
  ↓ ScrapearAsync()
  ↓ [Posts extraídos]
  ↓ Deduplicación
  ↓ PostChannel (cola)
  ↓ PostProcessorService (consume)
  ↓ IA Clasificación
  ↓ Firestore storage
  ↓ Frontend subscrito a cambios
```

### Flujo de Visualización
```
Dashboard → RadarGeneral (por tema)
         → GraficaTendencia (histórico)
         → MapaCalor (por ubicación)
         → AlertasPanel (alertas activas)
         → Click tema → Tema.tsx (detalle)
```

---

## 🗂️ Estructura de Archivos Principales

```
AnalisisTendencias/
├── Docs/                          ← DOCUMENTACIÓN
│   ├── Frontend_Components.md      ← Este archivo
│   ├── Backend_Architecture.md     ← Arquitectura backend
│   ├── ContextoInicial.md         ← Requisitos
│   └── INDEX.md                   ← Este archivo
│
├── dashboard/                      ← FRONTEND (React)
│   ├── src/
│   │   ├── components/            ← Componentes reutilizables
│   │   ├── pages/                 ← Páginas principales
│   │   ├── hooks/                 ← useAuth, useFirestore
│   │   ├── contexts/              ← AuthContext
│   │   ├── lib/                   ← Configuración Firebase
│   │   └── App.tsx                ← Router principal
│   ├── package.json
│   ├── .env.local                 ← Variables de entorno
│   └── vite.config.ts
│
└── backend/                        ← BACKEND (.NET)
    ├── src/
    │   ├── PulsoCiudadano.Domain/
    │   │   ├── Models/            ← Post, Alerta, Usuario, etc.
    │   │   ├── Interfaces/        ← IFirestoreRepository, IAIProvider
    │   │   └── Enums/             ← Sentimiento, Urgencia, etc.
    │   ├── PulsoCiudadano.Infrastructure/
    │   │   ├── Firebase/          ← FirestoreRepository
    │   │   ├── AI/                ← Providers, PromptBuilder, Parser
    │   │   └── Scraping/          ← Scrapers, StablePostId
    │   └── PulsoCiudadano.Worker/
    │       ├── Program.cs         ← Configuración DI
    │       ├── Services/          ← Background services
    │       ├── Queue/             ← PostChannel
    │       └── appsettings.json
    │
    └── tests/
        └── PulsoCiudadano.Tests/
```

---

## 🔑 Conceptos Clave

### **Post** (Dato Base)
Representa un comentario/publicación de redes sociales
```
fuente: Twitter | Facebook | GoogleMaps
texto: "La calle principal está en malas condiciones"
fecha: 2025-05-29
municipioId: "alcaldia-ciudad"
clasificacion: {temas, sentimiento, urgencia, ...}
ubicacion: {colonia, calle, precision}
contexto: {tiempo_problema, afectacion, autoridades, ...}
```

### **Alerta** (Generada Automáticamente)
Se crea cuando posts de un tema superan umbrales
```
tipo_alerta: "riesgo_viral" | "problema_cronico" | "umbral_superado"
tema: "inseguridad"
colonia: "Centro"
descripcion: "20 posts negativos en última hora sobre inseguridad en Centro"
leida: false
resuelta: false
```

### **Clasificación de IA**
Analiza post y extrae:
```
temas: ["inseguridad", "vialidad"]
tema_principal: "inseguridad"
sentimiento: "negativo"
urgencia: "alta"
tono: "enojado"
confianza: 0.95
temas_mencionados: "policía"
```

---

## 🚀 Primeros Pasos

### Setup Frontend
```bash
cd dashboard
npm install
cp .env.example .env.local
# Editar .env.local con credenciales Firebase
npm run dev
```

### Setup Backend
```bash
cd backend
# Restaurar NuGet packages
dotnet restore
# Configurar appsettings.json con credenciales Firebase e IA
dotnet run
```

---

## ❓ FAQ

**P: ¿Dónde están las credenciales de Firebase?**
R: Cada proyecto mantiene su `.env.local` y `appsettings.json` locales (no versionados en git).

**P: ¿Cómo se genera el ID de un Post?**
R: `StablePostId.Generate()` usa SHA256 de (fuente + url + primeras palabras) → determinístico.

**P: ¿A qué velocidad se procesan posts?**
R: 1 post cada 5 segundos (con delays de rate limit) = ~720 posts/hora.

**P: ¿Cómo se evitan duplicados?**
R: 1) StablePostId determinístico, 2) ExistePostAsync() antes de guardar.

**P: ¿Qué sucede si la IA no responde?**
R: Retry hasta 3 veces con exponential backoff; si falla: log error, continúa siguiente post.

**P: ¿Cómo se estructura Firestore?**
R: Ver Backend_Architecture.md sección "ESTRUCTURA DE DATOS EN FIRESTORE".

---

## 📞 Contacto / Preguntas

Consulta la documentación específica:
- **Frontend:** [Frontend_Components.md](./Frontend_Components.md)
- **Backend:** [Backend_Architecture.md](./Backend_Architecture.md)
- **Contexto:** [ContextoInicial.md](./ContextoInicial.md)

---

**Última actualización:** Mayo 2025
**Versión:** 1.0
