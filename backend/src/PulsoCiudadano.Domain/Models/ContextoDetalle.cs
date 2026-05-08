using PulsoCiudadano.Domain.Enums;

namespace PulsoCiudadano.Domain.Models;

/// <summary>
/// Contexto adicional extraído del post
/// </summary>
public record ContextoDetalle
{
    public required TiempoProblema TiempoProblema { get; init; }
    public required AfectacionEstimada AfectacionEstimada { get; init; }
    public required bool SolicitaAccion { get; init; }
    public required List<string> MencionaAutoridad { get; init; }
    public required bool EvidenciaMencionada { get; init; }
}
