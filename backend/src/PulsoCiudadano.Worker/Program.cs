using Google.Cloud.Firestore;
using PulsoCiudadano.Domain.Interfaces;
using PulsoCiudadano.Infrastructure.AI;
using PulsoCiudadano.Infrastructure.Firebase;
using PulsoCiudadano.Infrastructure.Scraping;
using PulsoCiudadano.Worker.Queue;
using PulsoCiudadano.Worker.Services;

var builder = Host.CreateApplicationBuilder(args);

// Configuración
builder.Services.Configure<AISettings>(builder.Configuration.GetSection("AI"));
builder.Services.Configure<ScrapingSettings>(builder.Configuration.GetSection("Scraping"));

// Firebase
var projectId = builder.Configuration["Firebase:ProjectId"] 
    ?? throw new InvalidOperationException("Firebase:ProjectId no configurado");
builder.Services.AddSingleton(FirestoreDb.Create(projectId));
builder.Services.AddScoped<IFirestoreRepository, FirestoreRepository>();

// Cola de posts (Singleton - compartido entre servicios)
builder.Services.AddSingleton<PostChannel>();
builder.Services.AddSingleton<IPostQueue>(sp => sp.GetRequiredService<PostChannel>());

// AI Providers
builder.Services.AddHttpClient<GeminiProvider>();
builder.Services.AddSingleton<DeepSeekProvider>();
builder.Services.AddSingleton<OpenAIProvider>();
builder.Services.AddSingleton<AIProviderFactory>();

// Scrapers
builder.Services.AddSingleton<TwitterScraper>();
builder.Services.AddSingleton<FacebookScraper>();
builder.Services.AddSingleton<GoogleMapsScraper>();

// Background Services
builder.Services.AddHostedService<ScrapingBackgroundService>();
builder.Services.AddHostedService<PostProcessorService>();

var host = builder.Build();

// Instalar Playwright browsers al iniciar (solo primera vez)
var logger = host.Services.GetRequiredService<ILogger<Program>>();
logger.LogInformation("Verificando instalación de Playwright...");

try
{
    var exitCode = Microsoft.Playwright.Program.Main(new[] { "install", "chromium" });
    if (exitCode != 0)
    {
        logger.LogWarning("Playwright install devolvió código: {ExitCode}", exitCode);
    }
}
catch (Exception ex)
{
    logger.LogWarning(ex, "Error instalando Playwright browsers");
}

host.Run();
