Eres mi asistente de desarrollo para un proyecto SaaS llamado "Pulso Ciudadano".

## OBJETIVO DEL PRODUCTO
Sistema SaaS que municipios mexicanos contratan por suscripción. Monitorea redes sociales y fuentes públicas para detectar en tiempo real qué servicios municipales generan inconformidad ciudadana (baches, agua, seguridad, alumbrado, basura, etc.), por zona geográfica y por tendencia temporal. El objetivo es que el municipio se entere de problemas antes de que escalen a medios.

NO es una herramienta de vigilancia de personas. El análisis es sobre TEMAS y ZONAS, nunca sobre perfiles individuales de ciudadanos.

## MODELO DE NEGOCIO
- SaaS con suscripción mensual por municipio
- Cada municipio tiene su propia configuración: fuentes, temas globales y temas personalizados
- Primer cliente objetivo: municipio mediano mexicano (100k-500k habitantes)
- Estrategia: conseguir un piloto gratuito/reducido, luego escalar

## STACK TECNOLÓGICO
- **Backend:** .NET 8 / C#
- **Base de datos:** Firebase Firestore (gratis en MVP, escala automático)
- **IA / NLP:** Capa de abstracción multi-proveedor que soporta Gemini, DeepSeek y OpenAI. El proveedor se configura en appsettings.json. El mismo prompt funciona para los tres.
- **Scraping:** Playwright en .NET para fuentes públicas (Twitter/X, Facebook páginas públicas, Google Maps Reviews)
- **Cola de tareas:** Channel<T> de .NET (cola in-memory, simple y gratuita para MVP)
- **Hosting:** Azure Container Apps (Worker) + Azure Static Web Apps (Dashboard)
- **Dashboard:** React + Vite + Tailwind + Tremor (conecta directo a Firestore con SDK JS)

## ARQUITECTURA GENERAL
[Config por municipio] ──→ [Scraper con Playwright]
                                      ↓
                          [Channel<T> in-memory]
                                      ↓
                   [Procesador .NET + IA dinámica]
                                      ↓
                    [Firebase Firestore] ──→ [Grafo de temas/zonas]
                                      ↓
                      [Dashboard React por municipio]

## ESTRUCTURA DEL PROYECTO
```
PulsoCiudadano/
├── backend/
│   ├── PulsoCiudadano.sln
│   ├── src/
│   │   ├── PulsoCiudadano.Domain/           # Modelos y contratos
│   │   │   ├── Models/
│   │   │   ├── Interfaces/
│   │   │   └── Enums/
│   │   │
│   │   ├── PulsoCiudadano.Infrastructure/   # Implementaciones externas
│   │   │   ├── AI/                          # Gemini, DeepSeek, OpenAI providers
│   │   │   ├── Firebase/                    # Firestore repository
│   │   │   └── Scraping/                    # Twitter, Facebook, Google Maps
│   │   │
│   │   └── PulsoCiudadano.Worker/           # Background service
│   │       ├── Services/                    # Scraping + procesamiento
│   │       └── Queue/                       # Channel<T> wrapper
│   │
│   └── tests/
│       └── PulsoCiudadano.Tests/
│
└── dashboard/                               # React + Vite
    ├── src/
    │   ├── components/
    │   │   ├── RadarGeneral.tsx
    │   │   ├── MapaCalor.tsx
    │   │   ├── GraficaTendencia.tsx
    │   │   └── AlertasPanel.tsx
    │   ├── pages/
    │   │   ├── Login.tsx
    │   │   ├── Dashboard.tsx
    │   │   ├── Tema.tsx
    │   │   ├── Alertas.tsx
    │   │   └── admin/
    │   │       ├── Usuarios.tsx           # Gestión usuarios del municipio
    │   │       ├── Configuracion.tsx      # Config fuentes y temas
    │   │       └── Municipios.tsx         # Solo super_admin
    │   ├── hooks/
    │   │   ├── useFirestore.ts
    │   │   └── useAuth.ts                 # Estado de autenticación
    │   ├── contexts/
    │   │   └── AuthContext.tsx            # Provider de auth + rol + municipio
    │   └── lib/
    │       └── firebase.ts
    ├── package.json
    └── tailwind.config.js
```

## ESTRUCTURA DE DATOS EN FIRESTORE
users/
  {user_id}/
    email
    municipio_id       ← FK al municipio asignado
    rol                ← "super_admin" | "admin" | "viewer"
    activo             ← true/false
    fecha_creacion

municipios/
  {municipio_id}/
    config         ← fuentes, temas globales, temas personalizados, keywords
    posts/         ← cada post scrapeado y clasificado
    tendencias/    ← resumen diario por tema
    alertas/       ← cuando un tema supera umbral configurado

## AUTENTICACIÓN Y ROLES (Multi-Tenant)
La aplicación es multi-tenant: una sola instancia sirve a todos los municipios.
Cada usuario pertenece a un municipio y solo ve datos de ese municipio.

### Roles
| Rol | Permisos |
|-----|----------|
| **super_admin** | Crear municipios, crear admins, ver todo, configuración global |
| **admin** | Configurar su municipio, crear/editar usuarios de su municipio |
| **viewer** | Solo lectura del dashboard de su municipio |

### Flujo de acceso
1. Usuario hace login (Firebase Auth - email/password)
2. Se obtiene su documento en `users/{uid}`
3. Dashboard filtra datos por su `municipio_id`
4. Firestore Security Rules validan acceso

### Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    match /users/{userId} {
      allow read: if request.auth.uid == userId;
      allow write: if isSuperAdmin() || (isAdmin() && sameOrg(userId));
    }
    
    match /municipios/{municipioId}/{document=**} {
      allow read: if getUserMunicipio() == municipioId || isSuperAdmin();
      allow write: if (isAdmin() && getUserMunicipio() == municipioId) || isSuperAdmin();
    }
    
    function getUserMunicipio() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.municipio_id;
    }
    function getUserRol() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.rol;
    }
    function isSuperAdmin() {
      return getUserRol() == 'super_admin';
    }
    function isAdmin() {
      return getUserRol() == 'admin' || isSuperAdmin();
    }
    function sameOrg(userId) {
      return get(/databases/$(database)/documents/users/$(userId)).data.municipio_id == getUserMunicipio();
    }
  }
}
```

## CONFIGURACIÓN POR MUNICIPIO (estructura JSON)
{
  "municipio_id": "san_pedro_001",
  "nombre": "Nombre del municipio",
  "fuentes": [
    { "tipo": "twitter|facebook|google_maps", "url": "...", "activa": true }
  ],
  "temas": {
    "globales": ["agua", "baches", "seguridad", "alumbrado", "basura"],
    "personalizados": [
      {
        "nombre": "Nombre del tema",
        "keywords": ["keyword1", "keyword2"],
        "activo": true,
        "fecha_inicio": "opcional",
        "fecha_fin": "opcional"
      }
    ]
  },
  "alertas": {
    "umbral_porcentaje": 30,
    "ventana_horas": 24
  }
}

## MODELO DE CADA POST EN FIRESTORE
```json
{
  "id": "uuid",
  "fuente": "twitter|facebook|google_maps",
  "url_origen": "url del post original",
  "texto": "contenido del post",
  "fecha": "ISO 8601",
  "municipio_id": "referencia al municipio",
  
  "clasificacion": {
    "temas": ["agua", "baches"],
    "tema_principal": "agua",
    "sentimiento": "positivo|negativo|neutral",
    "urgencia": "alta|media|baja",
    "tipo_interaccion": "queja|sugerencia|denuncia|reconocimiento|pregunta",
    "tono": "neutral|molesto|enojado|sarcastico|desesperado",
    "confianza": 0.92,
    "keywords_detectadas": ["fuga", "llevan semanas", "sin agua"]
  },
  
  "ubicacion": {
    "colonia": "Col. Jardines",
    "calle": "Av. Principal esq. Roble",
    "referencia": "frente a la escuela primaria",
    "precision": "exacta|aproximada|solo_colonia|no_detectada"
  },
  
  "contexto": {
    "tiempo_problema": "reciente|dias|semanas|meses|recurrente",
    "afectacion_estimada": "individual|vecinos|colonia|ciudad",
    "solicita_accion": true,
    "menciona_autoridad": ["@AguasDeMonterrey", "el director"],
    "evidencia_mencionada": true
  },
  
  "resumen": "Fuga de agua lleva 3 semanas en Col. Jardines, afecta a toda la cuadra"
}
```

## PROMPT DE IA (se construye dinámicamente con los temas del municipio)
Los temas se inyectan en tiempo de ejecución según la config del municipio:

```
Analiza este comentario de redes sociales de un ciudadano mexicano.
El municipio monitorea estos temas: {temas_joined}

Responde SOLO en JSON válido sin markdown ni backticks:
{
  "clasificacion": {
    "temas": ["tema1", "tema2"],
    "tema_principal": "el tema más relevante",
    "sentimiento": "positivo|negativo|neutral",
    "urgencia": "alta|media|baja",
    "tipo_interaccion": "queja|sugerencia|denuncia|reconocimiento|pregunta",
    "tono": "neutral|molesto|enojado|sarcastico|desesperado",
    "confianza": 0.0-1.0,
    "keywords_detectadas": ["palabras clave encontradas"]
  },
  "ubicacion": {
    "colonia": "nombre o null",
    "calle": "nombre o null",
    "referencia": "punto de referencia o null",
    "precision": "exacta|aproximada|solo_colonia|no_detectada"
  },
  "contexto": {
    "tiempo_problema": "reciente|dias|semanas|meses|recurrente|no_aplica",
    "afectacion_estimada": "individual|vecinos|colonia|ciudad|no_especificada",
    "solicita_accion": true|false,
    "menciona_autoridad": ["autoridades mencionadas"] o [],
    "evidencia_mencionada": true|false
  },
  "resumen": "resumen de máximo 100 caracteres"
}

Reglas:
- temas: puede tener múltiples si el post menciona varios problemas
- urgencia alta: peligro, emergencia, muchos afectados, problema grave
- tono desesperado: indica riesgo de viralización
- confianza: qué tan seguro estás de la clasificación (0.0 a 1.0)
- Si no hay información suficiente para un campo, usa null o el valor por defecto

Comentario: "{texto}"
```

## CAPA DE ABSTRACCIÓN DE IA
Interfaz IAIProvider con método:
```csharp
Task<ClasificacionCompleta> ClasificarAsync(string texto, List<string> temas);
```

Modelo de respuesta:
```csharp
public record ClasificacionCompleta(
    ClasificacionDetalle Clasificacion,
    UbicacionDetalle Ubicacion,
    ContextoDetalle Contexto,
    string Resumen
);
```

Implementaciones: GeminiProvider, DeepSeekProvider, OpenAIProvider.
Se selecciona el proveedor desde appsettings.json con la clave "AIProvider": "gemini|deepseek|openai".
DeepSeek es compatible con el SDK de OpenAI apuntando a su endpoint.

## GRAFO DE TEMAS Y ZONAS (mejorado)
No se rastrean personas ni perfiles individuales.
El grafo conecta: TEMA ──→ ZONA (colonia/calle) ──→ TENDENCIA TEMPORAL ──→ SEVERIDAD

Ejemplo mejorado:
```
[Agua] → [Col. Jardines / Av. Principal] → [+40% esta semana] → [CRÍTICO]
         ├── 12 quejas
         ├── 3 con tono "desesperado"
         ├── 5 mencionan "semanas sin resolver"
         └── 2 con evidencia (fotos/video)
```

Sirve para:
- Dashboard de mapa de calor con precisión a nivel calle
- Alertas inteligentes basadas en riesgo de viralización
- Detección de problemas crónicos por zona
- Priorización automática para el municipio

## DASHBOARD (4 vistas principales)
1. **Radar general:** todos los temas activos hoy con volumen, sentimiento y tono predominante
2. **Vista por tema:** drill down con mapa de calor por colonia/calle y gráfica de tendencia
3. **Alertas:** temas que superaron umbral + posts con tono "desesperado" o "enojado" (riesgo viral)
4. **Problemas crónicos:** posts donde tiempo_problema = "semanas|meses|recurrente"

### Indicadores clave del modelo enriquecido
- **Riesgo de viralización:** tono desesperado/enojado + evidencia_mencionada + menciona_autoridad
- **Priorización:** afectacion_estimada × urgencia × confianza
- **Problemas recurrentes:** agrupar por ubicación + tiempo_problema
- **Mapa de calor mejorado:** precisión hasta calle, no solo colonia

## CONTEXTO DE NEGOCIO
- Vendido a directores de Comunicación Social y Obras Públicas municipales
- El argumento de venta es: "se enteran de los problemas antes de que salgan en medios"
- Primer municipio objetivo es local (municipio mediano en México)
- El desarrollador tiene experiencia previa en Flexi, Metalsa, Fundary
- Ya tiene tokens de Gemini y DeepSeek disponibles para usar

## PRIORIDADES DE DESARROLLO (MVP en 2-4 semanas)
Semana 1: Setup Firebase + estructura del proyecto .NET + scraper básico (1 fuente)
Semana 2: Integración IA con capa de abstracción + clasificación de posts
Semana 3: Dashboard básico con radar y mapa de calor
Semana 4: Datos reales del municipio objetivo + pulir UI para pitch

## LO QUE NECESITO DE TI
Ayúdame a construir este proyecto paso a paso. Empieza siempre por la estructura antes de escribir código. Cuando escribas código hazlo completo y funcional, no pongas comentarios tipo "// resto del código aquí". Si algo tiene implicaciones de seguridad, privacidad o escalabilidad, avísame antes de proceder.