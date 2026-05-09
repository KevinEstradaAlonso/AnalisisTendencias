using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using PulsoCiudadano.Domain.Enums;
using PulsoCiudadano.Domain.Interfaces;
using PulsoCiudadano.Domain.Models;
using PulsoCiudadano.Infrastructure.AI;
using PulsoCiudadano.Worker.Queue;

namespace PulsoCiudadano.Worker.Services;

/// <summary>
/// Servicio que procesa posts de la cola con IA
/// </summary>
public class PostProcessorService : BackgroundService
{
    private readonly ILogger<PostProcessorService> _logger;
    private readonly IServiceProvider _serviceProvider;
    private readonly PostChannel _postChannel;
    private readonly AIProviderFactory _aiProviderFactory;

    public PostProcessorService(
        ILogger<PostProcessorService> logger,
        IServiceProvider serviceProvider,
        PostChannel postChannel,
        AIProviderFactory aiProviderFactory)
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
        _postChannel = postChannel;
        _aiProviderFactory = aiProviderFactory;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("PostProcessorService iniciado");

        await foreach (var postRaw in _postChannel.ReadAllAsync(stoppingToken))
        {
            try
            {
                await ProcesarPostAsync(postRaw, stoppingToken);
                
                // Delay para respetar rate limits de APIs de IA (15 req/min)
                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error procesando post {Id}", postRaw.Id);
                
                // Si es rate limit, esperar más
                if (ex.Message.Contains("429"))
                {
                    _logger.LogWarning("Rate limit alcanzado, esperando 60 segundos...");
                    await Task.Delay(TimeSpan.FromSeconds(60), stoppingToken);
                }
            }
        }
    }

    private async Task ProcesarPostAsync(PostRaw postRaw, CancellationToken stoppingToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var firestoreRepo = scope.ServiceProvider.GetRequiredService<IFirestoreRepository>();

        // Obtener configuración del municipio
        var municipio = await firestoreRepo.GetMunicipioAsync(postRaw.MunicipioId);
        if (municipio == null)
        {
            _logger.LogWarning("Municipio no encontrado: {MunicipioId}", postRaw.MunicipioId);
            return;
        }

        // Construir lista de temas
        var temas = municipio.Temas.Globales
            .Concat(municipio.Temas.Personalizados.Where(t => t.Activo).Select(t => t.Nombre))
            .ToList();

        // Clasificar con IA
        var aiProvider = _aiProviderFactory.GetProvider();
        var clasificacion = await aiProvider.ClasificarAsync(postRaw.Texto, temas);

        // Crear post clasificado
        var post = new Post
        {
            Id = postRaw.Id,
            Fuente = ParseFuente(postRaw.Fuente),
            UrlOrigen = postRaw.UrlOrigen,
            Texto = postRaw.Texto,
            Fecha = postRaw.Fecha,
            MunicipioId = postRaw.MunicipioId,
            Clasificacion = clasificacion.Clasificacion,
            Ubicacion = clasificacion.Ubicacion,
            Contexto = clasificacion.Contexto,
            Resumen = clasificacion.Resumen,
            FechaProcesamiento = DateTime.UtcNow,
            ProveedorIA = aiProvider.Nombre
        };

        // Guardar en Firestore
        await firestoreRepo.SavePostAsync(post.MunicipioId, post);

        _logger.LogInformation(
            "Post procesado: {Id} | Tema: {Tema} | Sentimiento: {Sentimiento} | Urgencia: {Urgencia}",
            post.Id,
            post.Clasificacion.TemaPrincipal,
            post.Clasificacion.Sentimiento,
            post.Clasificacion.Urgencia);

        // Verificar si debe generar alerta
        await VerificarAlertaAsync(firestoreRepo, post, municipio);
    }

    private async Task VerificarAlertaAsync(IFirestoreRepository repo, Post post, Municipio municipio)
    {
        // Alerta por riesgo viral: tono desesperado/enojado + urgencia alta
        if ((post.Clasificacion.Tono == Tono.Desesperado || post.Clasificacion.Tono == Tono.Enojado) 
            && post.Clasificacion.Urgencia == Urgencia.Alta)
        {
            var alerta = new Alerta
            {
                Id = Guid.NewGuid().ToString(),
                MunicipioId = post.MunicipioId,
                Tema = post.Clasificacion.TemaPrincipal,
                Colonia = post.Ubicacion.Colonia,
                FechaGeneracion = DateTime.UtcNow,
                TipoAlerta = "riesgo_viral",
                Descripcion = $"Post con alto riesgo de viralización: {post.Resumen}",
                TotalPosts = 1,
                PostsEnojados = post.Clasificacion.Tono == Tono.Enojado ? 1 : 0,
                PostsDesesperados = post.Clasificacion.Tono == Tono.Desesperado ? 1 : 0,
                PostsRelacionados = new List<string> { post.Id }
            };

            await repo.SaveAlertaAsync(post.MunicipioId, alerta);
            _logger.LogWarning("⚠️ Alerta generada: {TipoAlerta} - {Descripcion}", alerta.TipoAlerta, alerta.Descripcion);
        }

        // Alerta por problema crónico
        if (post.Contexto.TiempoProblema == TiempoProblema.Semanas 
            || post.Contexto.TiempoProblema == TiempoProblema.Meses 
            || post.Contexto.TiempoProblema == TiempoProblema.Recurrente)
        {
            var alerta = new Alerta
            {
                Id = Guid.NewGuid().ToString(),
                MunicipioId = post.MunicipioId,
                Tema = post.Clasificacion.TemaPrincipal,
                Colonia = post.Ubicacion.Colonia,
                FechaGeneracion = DateTime.UtcNow,
                TipoAlerta = "problema_cronico",
                Descripcion = $"Problema reportado como crónico ({post.Contexto.TiempoProblema}): {post.Resumen}",
                TotalPosts = 1,
                PostsRelacionados = new List<string> { post.Id }
            };

            await repo.SaveAlertaAsync(post.MunicipioId, alerta);
            _logger.LogWarning("⚠️ Alerta generada: {TipoAlerta} - {Descripcion}", alerta.TipoAlerta, alerta.Descripcion);
        }
    }

    private static TipoFuente ParseFuente(string fuente) => fuente.ToLowerInvariant() switch
    {
        "twitter" => TipoFuente.Twitter,
        "facebook" => TipoFuente.Facebook,
        "google_maps" => TipoFuente.GoogleMaps,
        _ => TipoFuente.Twitter
    };
}
