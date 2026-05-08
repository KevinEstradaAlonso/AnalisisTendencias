using PulsoCiudadano.Domain.Enums;

namespace PulsoCiudadano.Domain.Models;

/// <summary>
/// Post de redes sociales clasificado y almacenado
/// </summary>
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
    public DateTime FechaProcesamiento { get; set; } = DateTime.UtcNow;
    public string? ProveedorIA { get; set; }
}
