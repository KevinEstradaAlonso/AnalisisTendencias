namespace PulsoCiudadano.Domain.Models;

/// <summary>
/// Post sin procesar (raw) del scraper
/// </summary>
public class PostRaw
{
    public required string Id { get; set; }
    public required string Fuente { get; set; }
    public required string UrlOrigen { get; set; }
    public required string Texto { get; set; }
    public required DateTime Fecha { get; set; }
    public required string MunicipioId { get; set; }
}
