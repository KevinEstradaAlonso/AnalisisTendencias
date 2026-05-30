# Documentación de Arquitectura - Backend Pulso Ciudadano

## Descripción General

Backend worker .NET que implementa:
1. **Web Scraping** - Extrae posts de redes sociales (Twitter, Facebook, Google Maps)
2. **Clasificación con IA** - Analiza posts con Gemini, DeepSeek u OpenAI
3. **Almacenamiento** - Persiste datos clasificados en Firebase Firestore
4. **Alertas** - Genera alertas automáticas según umbrales

---

## ESTRUCTURA DE PROYECTOS

```
backend/
├── src/
│   ├── PulsoCiudadano.Domain/          # Modelos, interfaces y enums
│   ├── PulsoCiudadano.Infrastructure/  # Implementaciones (Firebase, IA, Scraping)
│   └── PulsoCiudadano.Worker/          # Worker console app con background services
└── tests/
    └── PulsoCiudadano.Tests/           # Pruebas unitarias
```

---

## LAYER 1: DOMAIN (Modelos e Interfaces)

### Enums

#### TipoFuente.cs
```csharp
public enum TipoFuente
{
    Twitter,
    Facebook,
    GoogleMaps,
    Instagram,
    TikTok
}
```

#### Sentimiento.cs
```csharp
public enum Sentimiento
{
    Positivo,
    Negativo,
    Neutral,
    Mixto
}
```

#### Urgencia.cs
```csharp
public enum Urgencia
{
    Baja,
    Media,
    Alta,
    Crítica
}
```

#### TiempoProblema.cs
```csharp
public enum TiempoProblema
{
    RecienteHoras,
    UltimosDias,
    SemanasPasadas,
    MesesAtras,
    Cronico
}
```

#### AfectacionEstimada.cs
```csharp
public enum AfectacionEstimada
{
    IndividuoAislado,
    FamiliaBarrio,
    MultiplesBarrios,
    MunicipiCompleto,
    InterMunicipal
}
```

#### Otros Enums
- **Tono**: neutral, desesperado, enojado, sarcástico, esperanzado, indiferente
- **TipoInteraccion**: queja, sugerencia, felicitación, pregunta, crítica, propuesta
- **PrecisionUbicacion**: no_detectada, colonia, calle, exacta
- **RolUsuario**: super_admin, admin, viewer

### Modelos

#### Post.cs
```csharp
public class Post
{
    public required string Id { get; set; }
    public required TipoFuente Fuente { get; set; }
    public required string UrlOrigen { get; set; }
    public required string Texto { get; set; }
    public required DateTime Fecha { get; set; }
    public required string MunicipioId { get; set; }
    
    // Clasificación de IA
    public required ClasificacionDetalle Clasificacion { get; set; }
    public required UbicacionDetalle Ubicacion { get; set; }
    public required ContextoDetalle Contexto { get; set; }
    public required string Resumen { get; set; }
    
    // Metadata
    public DateTime FechaProcesamiento { get; set; }
    public string? ProveedorIA { get; set; }
}
```

**PostRaw.cs** - Post sin clasificar (recién scrapeado)
```csharp
public class PostRaw
{
    public required string Id { get; set; }
    public required TipoFuente Fuente { get; set; }
    public required string UrlOrigen { get; set; }
    public required string Texto { get; set; }
    public required string MunicipioId { get; set; }
    public DateTime FechaObtenccion { get; set; }
}
```

#### ClasificacionDetalle.cs
```csharp
public class ClasificacionDetalle
{
    public required List<string> Temas { get; set; }          // ['inseguridad', 'vialidad', ...]
    public required string TemaPrincipal { get; set; }        // 'inseguridad'
    public required Sentimiento Sentimiento { get; set; }
    public required Urgencia Urgencia { get; set; }
    public required TipoInteraccion TipoInteraccion { get; set; }
    public required Tono Tono { get; set; }
    public required double Confianza { get; set; }            // 0.0 - 1.0
    public required List<string> KeywordsDetectadas { get; set; }
}
```

#### UbicacionDetalle.cs
```csharp
public class UbicacionDetalle
{
    public string? Colonia { get; set; }
    public string? Calle { get; set; }
    public string? Referencia { get; set; }
    public required PrecisionUbicacion Precision { get; set; }
}
```

#### ContextoDetalle.cs
```csharp
public class ContextoDetalle
{
    public required TiempoProblema TiempoProblema { get; set; }
    public required AfectacionEstimada AfectacionEstimada { get; set; }
    public required bool SolicitaAccion { get; set; }
    public required List<string> MencionaAutoridad { get; set; }  // ['policía', 'alcaldía', ...]
    public required bool EvidenciaMencionada { get; set; }        // fotos, videos, etc.
}
```

#### Alerta.cs
```csharp
public class Alerta
{
    public required string Id { get; set; }
    public required string Tema { get; set; }
    public string? Colonia { get; set; }
    public required DateTime FechaGeneracion { get; set; }
    public required string TipoAlerta { get; set; }
    public required string Descripcion { get; set; }
    public required int TotalPosts { get; set; }
    public required bool Leida { get; set; }
    public required bool Resuelta { get; set; }
}
```

#### Municipio.cs
```csharp
public class Municipio
{
    public required string Id { get; set; }
    public required string Nombre { get; set; }
    public required List<string> Temas { get; set; }        // Temas a monitorear
    public required bool Activo { get; set; }
    public required ScrapingConfig Config { get; set; }
}
```

#### Usuario.cs
```csharp
public class Usuario
{
    public required string Uid { get; set; }
    public required string Email { get; set; }
    public required string MunicipioId { get; set; }
    public required RolUsuario Rol { get; set; }
    public required bool Activo { get; set; }
}
```

### Interfaces

#### IFirestoreRepository.cs
```csharp
public interface IFirestoreRepository
{
    // Municipios
    Task<Municipio?> GetMunicipioAsync(string municipioId);
    Task<List<Municipio>> GetMunicipiosActivosAsync();
    Task SaveMunicipioAsync(Municipio municipio);
    
    // Posts
    Task SavePostAsync(string municipioId, Post post);
    Task<List<Post>> GetPostsByTemaAsync(string municipioId, string tema, DateTime desde, DateTime hasta);
    Task<bool> ExistePostAsync(string municipioId, string postId);
    
    // Alertas
    Task SaveAlertaAsync(string municipioId, Alerta alerta);
    Task<List<Alerta>> GetAlertasActivasAsync(string municipioId);
    
    // Usuarios
    Task<Usuario?> GetUsuarioAsync(string uid);
    Task SaveUsuarioAsync(Usuario usuario);
}
```

#### IAIProvider.cs
```csharp
public interface IAIProvider
{
    Task<ClasificacionCompleta> ClasificarAsync(PostRaw post);
    string NombreProveedor { get; }
    bool EstaDisponible { get; }
}
```

#### IScraperService.cs
```csharp
public interface IScraperService
{
    string TipoFuente { get; }
    Task<List<PostRaw>> ScrapearAsync(string url, string municipioId, DateTime? desde = null);
}
```

#### IPostQueue.cs
```csharp
public interface IPostQueue
{
    Task EnqueueAsync(PostRaw post);
    IAsyncEnumerable<PostRaw> DequeueAsync(CancellationToken ct = default);
}
```

---

## LAYER 2: INFRASTRUCTURE

### Firebase - FirestoreRepository.cs

**Responsabilidad:** CRUD de todas las entidades en Firestore

**Estructura de datos:**
```
Firebase Firestore:
├── usuarios/{uid}/
│   ├── email: string
│   ├── municipioId: string
│   ├── rol: string
│   └── activo: boolean
│
├── municipios/{municipioId}/
│   ├── nombre: string
│   ├── temas: array
│   ├── activo: boolean
│   │
│   ├── posts/{postId}/        ← Posts clasificados
│   │   ├── fuente: string
│   │   ├── texto: string
│   │   ├── fecha: timestamp
│   │   ├── clasificacion: {temas, tema_principal, sentimiento, ...}
│   │   ├── ubicacion: {colonia, calle, precision}
│   │   └── contexto: {tiempo_problema, afectacion, ...}
│   │
│   └── alertas/{alertaId}/    ← Alertas generadas
│       ├── tema: string
│       ├── tipo_alerta: string
│       ├── fecha_generacion: timestamp
│       ├── leida: boolean
│       └── resuelta: boolean
```

**Métodos principales:**
- `SavePostAsync()` - Almacena post clasificado
- `GetPostsByTemaAsync()` - Consulta posts por tema y rango de fechas
- `ExistePostAsync()` - Valida duplicados
- `SaveAlertaAsync()` - Crea alerta
- `GetMunicipiosActivosAsync()` - Obtiene municipios para procesar

### AI Providers

#### AIProviderFactory.cs
```csharp
public class AIProviderFactory
{
    public IAIProvider GetProvider()  // Retorna según config (Gemini, DeepSeek, OpenAI)
}
```

**Configuración (appsettings.json):**
```json
{
  "AI": {
    "Provider": "gemini",  // o "deepseek", "openai"
    "ApiKey": "xxx",
    "Model": "gemini-2.0-flash",
    "MaxRetries": 3,
    "TimeoutSeconds": 30
  }
}
```

#### GeminiProvider.cs, DeepSeekProvider.cs, OpenAIProvider.cs

Cada proveedor implementa `IAIProvider`:

```csharp
public class GeminiProvider : IAIProvider
{
    public async Task<ClasificacionCompleta> ClasificarAsync(PostRaw post)
    {
        // 1. Construir prompt con PromptBuilder
        // 2. Enviar a API
        // 3. Parsear respuesta con AIResponseParser
        // 4. Retornar ClasificacionDetalle
    }
}
```

#### PromptBuilder.cs
```csharp
public class PromptBuilder
{
    public static string BuildPrompt(PostRaw post, List<string> temasEsperados)
    {
        return $"""
        Analiza este post de redes sociales...
        
        POST: {post.Texto}
        TEMAS A MONITOREAR: {string.Join(", ", temasEsperados)}
        
        Retorna JSON con:
        - temas: array de temas detectados
        - tema_principal: tema más relevante
        - sentimiento: 'positivo', 'negativo', 'neutral'
        - urgencia: 'alta', 'media', 'baja'
        - tipo_interaccion: 'queja', 'sugerencia', ...
        - tono: 'neutral', 'enojado', ...
        - confianza: 0.0 a 1.0
        - ubicacion: {colonia?, calle?, precision}
        - contexto: {tiempo_problema, afectacion, solicita_accion, autoridades_mencionadas, evidencia}
        - resumen: 1-2 líneas
        - keywords: array de palabras clave
        """;
    }
}
```

#### AIResponseParser.cs
```csharp
public class AIResponseParser
{
    public static ClasificacionCompleta ParseResponse(string jsonResponse)
    {
        // Parsea JSON de IA y mapea a ClasificacionCompleta
        // Valida que todos los campos requeridos estén presentes
        // Retorna excepción si JSON inválido
    }
}
```

### Scraping

#### ScraperBase.cs
```csharp
public abstract class ScraperBase : IScraperService
{
    protected async Task<IPage> GetPageAsync()
    {
        // Crea browser Playwright con Chrome/Chromium
        // Retorna página lista para navegar
    }
    
    public abstract Task<List<PostRaw>> ScrapearAsync(string url, string municipioId, DateTime? desde = null);
}
```

#### TwitterScraper.cs, FacebookScraper.cs, GoogleMapsScraper.cs

Cada scraper extrae posts específicos de su plataforma:

```csharp
public class FacebookScraper : ScraperBase
{
    public override async Task<List<PostRaw>> ScrapearAsync(string url, string municipioId, DateTime? desde = null)
    {
        var page = await GetPageAsync();
        
        // 1. Navegar a URL
        // 2. Scroll para cargar posts
        // 3. Expandir "Ver más" para textos completos
        // 4. Extraer texto con selectores CSS
        // 5. Evitar duplicados
        // 6. Retornar lista de PostRaw
    }
}
```

**Selectores clave (Facebook):**
- Posts: `div[data-ad-preview='message']`, `[data-testid='post_message']`
- Permalinks: `a[href*='/reel/']`, `a[href*='/posts/']`
- "Ver más": `text=Ver más`

#### StablePostId.cs
```csharp
public static string Generate(PostRaw post)
{
    // Genera ID determinístico basado en:
    // SHA256(fuente + url_origen + texto_primeras_palabras)
    // Permite detectar duplicados entre ejecuciones
}
```

---

## LAYER 3: WORKER (Servicios y Coordinación)

### Program.cs
**Punto de entrada del worker**

**Configuración DI:**
1. Firebase Firestore (Singleton)
2. PostChannel (Singleton - cola en memoria)
3. AI Providers (Singleton por tipo)
4. Scrapers (Singleton por tipo)
5. Background Services (HostedService)

**Instalación de Playwright:**
```csharp
Microsoft.Playwright.Program.Main(new[] { "install", "chromium" })
```

### Queue - PostChannel.cs

```csharp
public class PostChannel : IPostQueue
{
    private readonly Channel<PostRaw> _channel = Channel.CreateUnbounded<PostRaw>();
    
    public async Task EnqueueAsync(PostRaw post)
    {
        await _channel.Writer.WriteAsync(post);
    }
    
    public async IAsyncEnumerable<PostRaw> DequeueAsync(CancellationToken ct)
    {
        await foreach (var post in _channel.Reader.ReadAllAsync(ct))
        {
            yield return post;
        }
    }
}
```

**Flujo:**
1. ScrapingBackgroundService → Enqueue(PostRaw)
2. PostProcessorService → DequeueAsync()

### Services

#### ScrapingBackgroundService.cs

**Responsabilidad:** Ejecuta scraping periódicamente de URLs configuradas

**Configuración:**
```json
{
  "Scraping": {
    "IntervalSeconds": 3600,      // Cada hora
    "LookbackMinutes": 60,         // Buscar posts de última hora
    "BufferSeconds": 300           // Buffer de 5 min (evita duplicados entre ejecuciones)
  }
}
```

**Flujo:**
1. Loop cada IntervalSeconds
2. Obtener municipios activos desde Firestore
3. Para cada municipio:
   - Para cada URL configurada:
     - Ejecutar scraper apropiado
     - Generar StablePostId
     - Validar duplicado con `ExistePostAsync()`
     - Si es nuevo: Enqueue a PostChannel
4. Log de posts encontrados/descartados
5. Manejo de excepciones (continúa próximo ciclo)

#### PostProcessorService.cs

**Responsabilidad:** Procesa posts de la cola con IA

**Flujo:**
1. Escucha PostChannel indefinidamente
2. Para cada PostRaw:
   - Obtener proveedor de IA vía Factory
   - Invocar `ClasificarAsync()`
   - Parsear respuesta
   - Crear Post clasificado
   - Guardar en Firestore
   - Generar alertas si necesario
   - Delay 5 seg (rate limit)
3. Si error:
   - Log del error
   - Implementar retry
   - Si rate limit: esperar más

**Rate Limits:**
- Gemini: 15 req/min
- DeepSeek: 60 req/min
- OpenAI: 20 req/min (plan free)

---

## FLUJO COMPLETO DE DATOS

```
1. SCRAPING
   ┌─────────────────────────┐
   │ ScrapingBackgroundService
   │ (cada hora)
   └────────┬────────────────┘
            │
            ├─ GetMunicipiosActivosAsync()
            │
            └─ Para cada municipio → Para cada scraper:
               ├─ FacebookScraper.ScrapearAsync(url)
               │   ├─ Playwright → navega a URL
               │   ├─ Scroll + expand "Ver más"
               │   └─ Extrae PostRaw []
               │
               ├─ TwitterScraper.ScrapearAsync(url)
               └─ GoogleMapsScraper.ScrapearAsync(url)

2. DEDUPLICACIÓN
   Para cada PostRaw:
   ├─ Generar StablePostId
   └─ ¿Existe en Firestore? (ExistePostAsync)
      ├─ Sí → Descartar
      └─ No → Enqueue(PostRaw) a PostChannel

3. CLASIFICACIÓN
   ┌─────────────────────────┐
   │ PostProcessorService    │
   │ (consume PostChannel)   │
   └────────┬────────────────┘
            │
            ├─ DequeueAsync() → PostRaw
            │
            ├─ AIProviderFactory.GetProvider()
            │  └─ Retorna GeminiProvider (o DeepSeek, OpenAI)
            │
            ├─ PromptBuilder.BuildPrompt(PostRaw)
            │  └─ "Analiza este post..."
            │
            ├─ IAIProvider.ClasificarAsync(PostRaw)
            │  ├─ POST a API de IA
            │  ├─ Espera respuesta JSON
            │  └─ Retorna ClasificacionCompleta
            │
            ├─ AIResponseParser.ParseResponse(json)
            │  └─ Valida y mapea
            │
            ├─ SavePostAsync(municipioId, Post)
            │  └─ Persiste en Firestore.municipios/{id}/posts/
            │
            └─ GenerarAlertasAsync(Post)
               └─ Si tema en temas críticos → SaveAlertaAsync()

4. ALERTAS GENERADAS
   Firestore.municipios/{id}/alertas/
   └─ tipo_alerta: "riesgo_viral" | "problema_cronico" | "umbral_superado"

5. FRONTEND (subscrito a cambios)
   Dashboard.tsx (usePosts, useAlertas)
   └─ onSnapshot() → actualiza UI en tiempo real
```

---

## CONFIGURACIÓN (appsettings.json)

```json
{
  "Firebase": {
    "ProjectId": "mi-proyecto-firebase"
  },
  
  "AI": {
    "Provider": "gemini",           // gemini, deepseek, openai
    "ApiKey": "${AI_API_KEY}",      // De variable de entorno
    "Model": "gemini-2.0-flash",
    "MaxRetries": 3,
    "TimeoutSeconds": 30
  },
  
  "Scraping": {
    "IntervalSeconds": 3600,        // Ejecutar cada hora
    "LookbackMinutes": 60,          // Buscar posts del último 1 hora
    "BufferSeconds": 300            // 5 min de buffer
  },
  
  "Logging": {
    "LogLevel": {
      "Default": "Information"
    }
  }
}
```

---

## CONFIGURACIÓN FIREBASE

### Credenciales
- Archivo: `firebase-credentials.json`
- Location: `PulsoCiudadano.Worker/firebase-credentials.json`
- Obtener de: Firebase Console > Project Settings > Service Accounts
- Variable ENV: `GOOGLE_APPLICATION_CREDENTIALS` (opcional, automático)

### Índices Recomendados

En Firestore Console, crear:
1. **municipios > posts**
   - Index: fecha (DESC) + municipioId
   - Para filtros por rango de fechas

2. **municipios > alertas**
   - Index: resuelta (ASC) + fechaGeneracion (DESC)
   - Para alertas activas ordenadas

---

## MANEJO DE ERRORES

### Scraping
- **Timeout Playwright:** Log warning, continúa siguiente URL
- **Selector no encontrado:** Log info, asume 0 posts
- **Conexión rechazada:** Retry hasta 3 veces con exponential backoff

### IA
- **Rate limit (429):** Esperar 60 seg + delay 10 seg
- **Timeout:** Retry hasta maxRetries
- **JSON inválido:** Log error, continúa próximo post

### Firestore
- **Autenticación:** Error fatal, detiene servicio
- **Cuota excedida:** Log error, retry después

---

## PERFORMANCE

### Optimizaciones
1. **PostChannel (System.Threading.Channels)** - Cola sin lock-free
2. **Firestore batch reads** - Obtener múltiples municipios de una vez
3. **Playwright pooling** - Reutilizar browser instance
4. **Caché de API keys** - No re-leer cada minuto

### Monitoreo
- Log cada N posts: "Procesados 100 posts en 45 seg"
- Log de tasa de error: "10% rate limit errors, 0% parsing errors"
- Log de latencia de IA: "Gemini: 5.2 seg promedio"

---

## TESTING

### PulsoCiudadano.Tests/
- UnitTest1.cs (placeholder)
- Agregar tests para:
  - AIResponseParser.ParseResponse (JSON válido/inválido)
  - StablePostId.Generate (determinístico)
  - ClasificacionDetalle validaciones
  - Mock de Firestore

---

## DEPENDENCIAS PRINCIPALES

```xml
<PackageReference Include="Google.Cloud.Firestore" Version="3.+" />
<PackageReference Include="Google.Cloud.Firestore.Admin" Version="3.+" />
<PackageReference Include="Microsoft.Playwright" Version="1.+" />
<PackageReference Include="Google.Apis.Customsearch.v1" Version="1.+" /> 
<PackageReference Include="System.Threading.Channels" Version="8.+" />
```

---

## PRÓXIMOS PASOS / MEJORAS

1. **API REST** - Endpoint para getPostsByTemaAsync, saveAlerta manualmente
2. **Webhooks** - Notificar a frontend directamente (en lugar de polling)
3. **Base de datos local** - SQLite para caché local + resiliencia
4. **Métricas** - OpenTelemetry + Application Insights
5. **Validación de URLs** - Whitelist de dominios permitidos
6. **Cierre de alertas automático** - Por edad o por resolución manual
