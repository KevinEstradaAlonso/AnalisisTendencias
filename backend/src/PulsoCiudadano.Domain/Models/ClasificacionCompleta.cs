namespace PulsoCiudadano.Domain.Models;

/// <summary>
/// Resultado completo de la clasificación de IA
/// </summary>
public record ClasificacionCompleta
{
    public required ClasificacionDetalle Clasificacion { get; init; }
    public required UbicacionDetalle Ubicacion { get; init; }
    public required ContextoDetalle Contexto { get; init; }
    public required string Resumen { get; init; }
}
