using PulsoCiudadano.Domain.Enums;

namespace PulsoCiudadano.Domain.Models;

/// <summary>
/// Detalle de ubicación extraído del post
/// </summary>
public record UbicacionDetalle
{
    public string? Colonia { get; init; }
    public string? Calle { get; init; }
    public string? Referencia { get; init; }
    public required PrecisionUbicacion Precision { get; init; }
}
