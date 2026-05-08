using PulsoCiudadano.Domain.Enums;

namespace PulsoCiudadano.Domain.Models;

/// <summary>
/// Detalle de clasificación del post generado por IA
/// </summary>
public record ClasificacionDetalle
{
    public required List<string> Temas { get; init; }
    public required string TemaPrincipal { get; init; }
    public required Sentimiento Sentimiento { get; init; }
    public required Urgencia Urgencia { get; init; }
    public required TipoInteraccion TipoInteraccion { get; init; }
    public required Tono Tono { get; init; }
    public required double Confianza { get; init; }
    public required List<string> KeywordsDetectadas { get; init; }
}
