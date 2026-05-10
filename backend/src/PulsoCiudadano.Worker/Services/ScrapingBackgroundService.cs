using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using PulsoCiudadano.Domain.Interfaces;
using PulsoCiudadano.Domain.Models;
using PulsoCiudadano.Infrastructure.Scraping;

namespace PulsoCiudadano.Worker.Services;

/// <summary>
/// Servicio de background que ejecuta scraping periódicamente
/// </summary>
public class ScrapingBackgroundService : BackgroundService
{
    private readonly ILogger<ScrapingBackgroundService> _logger;
    private readonly IServiceProvider _serviceProvider;
    private readonly IPostQueue _postQueue;
    private readonly TimeSpan _intervalo;
    private readonly TimeSpan _lookback;
    private readonly TimeSpan _buffer;
    private DateTime? _lastRunUtc;

    public ScrapingBackgroundService(
        ILogger<ScrapingBackgroundService> logger,
        IServiceProvider serviceProvider,
        IPostQueue postQueue,
        IOptions<ScrapingSettings> settings)
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
        _postQueue = postQueue;

        var s = settings.Value ?? new ScrapingSettings();
        var intervalSeconds = Math.Max(30, s.IntervalSeconds);
        _intervalo = TimeSpan.FromSeconds(intervalSeconds);

        var lookbackMinutes = Math.Max(1, s.LookbackMinutes);
        _lookback = TimeSpan.FromMinutes(lookbackMinutes);

        var bufferSeconds = Math.Max(0, s.BufferSeconds);
        _buffer = TimeSpan.FromSeconds(bufferSeconds);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation(
            "ScrapingBackgroundService iniciado | Intervalo: {Intervalo} | Lookback: {Lookback} | Buffer: {Buffer}",
            _intervalo,
            _lookback,
            _buffer);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var runStartedUtc = DateTime.UtcNow;
                var desde = _lastRunUtc.HasValue
                    ? _lastRunUtc.Value.Subtract(_buffer)
                    : runStartedUtc.Subtract(_lookback);

                await EjecutarScrapingAsync(desde, stoppingToken);
                _lastRunUtc = runStartedUtc;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error en ciclo de scraping");
            }

            await Task.Delay(_intervalo, stoppingToken);
        }
    }

    private async Task EjecutarScrapingAsync(DateTime desde, CancellationToken stoppingToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var firestoreRepo = scope.ServiceProvider.GetRequiredService<IFirestoreRepository>();
        
        // Obtener municipios activos
        var municipios = await firestoreRepo.GetMunicipiosActivosAsync();
        
        _logger.LogInformation("Iniciando scraping para {Count} municipios | Desde: {Desde}", municipios.Count, desde);

        foreach (var municipio in municipios)
        {
            if (stoppingToken.IsCancellationRequested)
                break;

            await ScrapearMunicipioAsync(scope.ServiceProvider, municipio, desde, stoppingToken);
        }
    }

    private async Task ScrapearMunicipioAsync(
        IServiceProvider services, 
        Municipio municipio, 
        DateTime desde,
        CancellationToken stoppingToken)
    {
        _logger.LogInformation("Scrapeando municipio: {Nombre}", municipio.Nombre);
        _logger.LogInformation("  Fuentes configuradas: {Count}", municipio.Fuentes.Count);

        foreach (var fuente in municipio.Fuentes.Where(f => f.Activa))
        {
            if (stoppingToken.IsCancellationRequested)
                break;

            _logger.LogInformation("  Procesando fuente: {Tipo} - {Url}", fuente.Tipo, fuente.Url);

            try
            {
                IScraperService? scraper = fuente.Tipo.ToLowerInvariant() switch
                {
                    "twitter" => services.GetService<TwitterScraper>(),
                    "facebook" => services.GetService<FacebookScraper>(),
                    "google_maps" => services.GetService<GoogleMapsScraper>(),
                    _ => null
                };

                if (scraper == null)
                {
                    _logger.LogWarning("Scraper no encontrado para tipo: {Tipo}", fuente.Tipo);
                    continue;
                }

                var posts = await scraper.ScrapearAsync(fuente.Url, municipio.Id, desde);

                foreach (var post in posts)
                {
                    await _postQueue.EnqueueAsync(post, stoppingToken);
                }

                _logger.LogInformation(
                    "Encolados {Count} posts de {Fuente} para {Municipio}", 
                    posts.Count, fuente.Tipo, municipio.Nombre);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error scrapeando {Fuente} de {Municipio}", fuente.Tipo, municipio.Nombre);
            }
        }
    }
}
